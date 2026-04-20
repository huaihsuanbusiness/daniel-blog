import { nanoid } from 'nanoid';

export type GoogleSheetEnv = {
  GOOGLE_PRIVATE_KEY?: string;
  GOOGLE_SHEET_ID?: string;
  SITE?: string;
};

// ── JWT signing using Web Crypto API ──────────────────────────────────────

function base64url(data: string): string {
  return btoa(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function signJwt(payload: Record<string, unknown>, privateKeyPem: string): Promise<string> {
  const pemBody = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const binaryStr = atob(pemBody);
  const bytes = Uint8Array.from(binaryStr, (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    bytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const sigInput = `${header}.${body}`;
  const sigBytes = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(sigInput));
  const sig = base64url(String.fromCharCode(...new Uint8Array(sigBytes)));
  return `${sigInput}.${sig}`;
}

async function getAccessToken(env: GoogleSheetEnv): Promise<string> {
  const raw = env.GOOGLE_PRIVATE_KEY;
  if (!raw) throw new Error('GOOGLE_PRIVATE_KEY is not set');
  const creds = JSON.parse(raw) as { client_email: string; private_key: string };
  const now = Math.floor(Date.now() / 1000);
  const jwt = await signJwt(
    {
      iss: creds.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    },
    creds.private_key
  );
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  const data = (await res.json()) as { access_token?: string; error?: string };
  if (!res.ok || !data.access_token) throw new Error(`OAuth error: ${data.error || res.statusText}`);
  return data.access_token;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function colLetter(idx: number): string {
  let letter = '';
  let i = idx;
  while (i >= 0) {
    letter = String.fromCharCode((i % 26) + 65) + letter;
    i = Math.floor(i / 26) - 1;
  }
  return letter;
}

/** Format answer value for Sheets:
 * - string[] (multi-select / matrix): join with ", "
 *   e.g. ["固定電話問安|有在用","視訊|沒用過"] → "固定電話問安|有在用, 視訊|沒用過"
 * - string: pass through as-is
 */
function fmt(v: string | string[]): string {
  return Array.isArray(v) ? v.join(', ') : v;
}

/**
 * Merge "其他" checkbox selections with their corresponding _other text fields.
 * e.g. answers = { B7: ["長輩太孤單","其他"], B7_other: "LINE洗掉" }
 *   → B7 becomes ["長輩太孤單","其他(LINE洗掉)"]
 */
function mergeOtherOptions(answers: Record<string, string | string[]>): Record<string, string | string[]> {
  const merged: Record<string, string | string[]> = { ...answers };
  for (const key of Object.keys(merged)) {
    if (!key.endsWith('_other')) continue;
    const baseKey = key.slice(0, -6); // e.g. "B7_other" → "B7"
    const otherText = (merged[key] as string)?.trim();
    const baseVal = merged[baseKey];
    if (!otherText) continue;
    if (Array.isArray(baseVal)) {
      // Replace "其他" with "其他({text})" if present, else append
      const idx = baseVal.indexOf('其他');
      if (idx !== -1) {
        baseVal[idx] = `其他(${otherText})`;
      } else {
        baseVal.push(`其他(${otherText})`);
      }
    } else if (baseVal === '其他') {
      merged[baseKey] = `其他(${otherText})`;
    }
    // Remove the _other field so it doesn't get written to its own column
    delete merged[key];
  }
  return merged;
}

// ── Question code constants ──────────────────────────────────────────────

const CAREGIVER_QUESTION_CODES = [
  'B1','B2','B3','B4','B5','B6','B7','B8','B9',
  'B10','B11','B12','B13','B14','B15','B16','B17','B18','B19',
  'B20','B21','B22','B23','B24','B25','B26','B27','B28','B29',
  'B30','B31','B32','B33','B34',
  'contact_willing','contact_email','contact_line',
  'consent_followup','consent_interview',
];

const ELDER_QUESTION_CODES = [
  'A1','A2','A3','A4',
  'A5-1','A5-2','A5-3',
  'A6','A7','A8','A9','A10',
  'A11','A12','A13','A14','A15','A16','A17','A18','A19',
  'A20','A21','A22','A23','A24','A25','A26',
  'contact_willing','contact_email','contact_line',
  'consent_followup','consent_interview',
];

// ── GoogleSheet ───────────────────────────────────────────────────────────

export class GoogleSheet {
  private readonly env: GoogleSheetEnv;
  private readonly sheetId: string;
  private token: string | null = null;

  constructor(env: GoogleSheetEnv) {
    this.env = env;
    this.sheetId = env.GOOGLE_SHEET_ID || '';
    if (!this.sheetId) throw new Error('GOOGLE_SHEET_ID is not set');
  }

  private async token_(): Promise<string> {
    if (!this.token) this.token = await getAccessToken(this.env);
    return this.token;
  }

  private async api<T>(path: string, opts: RequestInit = {}): Promise<T> {
    const tok = await this.token_();
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}${path}`;
    const res = await fetch(url, {
      ...opts,
      headers: {
        Authorization: `Bearer ${tok}`,
        'Content-Type': 'application/json',
        ...(opts.headers as Record<string, string>),
      },
    });
    const body = (await res.json()) as T & { error?: { message?: string } };
    if (!res.ok) throw new Error(`Sheets API ${path}: ${body?.error?.message || res.statusText}`);
    return body;
  }

  private async api_batchUpdate(body: Record<string, unknown>): Promise<unknown> {
    const tok = await this.token_();
    return fetch(`https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => r.json());
  }

  async getSpreadsheetMeta(): Promise<{ spreadsheetTitle: string; sheets: string[] }> {
    const meta = await this.api<{ properties?: { title: string }; sheets?: { properties?: { title: string } }[] }>('');
    return {
      spreadsheetTitle: meta.properties?.title ?? '',
      sheets: meta.sheets?.map(s => s.properties?.title ?? '工作表1') ?? ['工作表1'],
    };
  }

  async setupBothSheets(): Promise<{ caregiverSheetName: string; elderSheetName: string }> {
    const CAREGIVER_NAME = 'Caregiver';
    const ELDER_NAME = 'Elder';
    const meta = await this.api<{ sheets?: { properties?: { title: string; sheetId: number } }[] }>('');
    const existingSheets = meta.sheets ?? [];
    const defaultSheet = existingSheets.find(s => s.properties?.title === '工作表1');
    const defaultSheetId = defaultSheet?.properties?.sheetId;
    const hasCaregiver = existingSheets.some(s => s.properties?.title === CAREGIVER_NAME);
    const hasElder = existingSheets.some(s => s.properties?.title === ELDER_NAME);
    const requests: Record<string, unknown>[] = [];
    if (defaultSheetId !== undefined && !hasCaregiver) {
      requests.push({
        updateSheetProperties: {
          properties: { sheetId: defaultSheetId, title: CAREGIVER_NAME },
          fields: 'title',
        },
      });
    }
    if (!hasElder) {
      requests.push({ addSheet: { properties: { title: ELDER_NAME, index: 1 } } });
    }
    if (requests.length > 0) {
      await this.api_batchUpdate({ requests });
    }
    const caregiverHeaders = [
      'family_id', 'role', 'submitted_at', 'locale',
      ...CAREGIVER_QUESTION_CODES,
      'linked_elder_row',
    ];
    const elderHeaders = [
      'family_id', 'role', 'submitted_at', 'locale',
      ...ELDER_QUESTION_CODES,
      'linked_caregiver_row',
    ];
    await this.api(
      `/values/${encodeURIComponent(CAREGIVER_NAME + '!A1:' + colLetter(caregiverHeaders.length - 1) + '1')}?valueInputOption=RAW`,
      { method: 'PUT', body: JSON.stringify({ values: [caregiverHeaders] }) }
    );
    await this.api(
      `/values/${encodeURIComponent(ELDER_NAME + '!A1:' + colLetter(elderHeaders.length - 1) + '1')}?valueInputOption=RAW`,
      { method: 'PUT', body: JSON.stringify({ values: [elderHeaders] }) }
    );
    return { caregiverSheetName: CAREGIVER_NAME, elderSheetName: ELDER_NAME };
  }

  private async getHeaderRow_(sheetName: string): Promise<string[]> {
    const res = await this.api<{ values?: string[][] }>(
      `/values/${encodeURIComponent(`${sheetName}!A1:ZZ1`)}`
    );
    return res.values?.[0] || [];
  }

  private async lastRow_(sheetName: string): Promise<number> {
    const res = await this.api<{ values?: unknown[][] }>(
      `/values/${encodeURIComponent(`${sheetName}!A:A`)}`
    );
    return res.values?.length ?? 0;
  }

  private async findRowByFamilyId(sheetName: string, familyId: string): Promise<number> {
    const res = await this.api<{ values?: string[][] }>(
      `/values/${encodeURIComponent(`${sheetName}!A:A`)}`
    );
    const rows = res.values ?? [];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === familyId) return i + 1;
    }
    return -1;
  }

  /**
   * Write a plain-text cross-reference into a link column.
   * Shows: "→ {linkSheet} row {row}" e.g. "→ Elder row 5"
   */
  private async writeLinkCell(
    sheetName: string,
    colLetter_: string,
    row: number,
    linkSheet: string,
    linkRow: number
  ): Promise<void> {
    const range = `${sheetName}!${colLetter_}${row}:${colLetter_}${row}`;
    const note = '\u2192 ' + linkSheet + ' row ' + linkRow;
    await this.api(
      `/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
      { method: 'PUT', body: JSON.stringify({ values: [[note]] }) }
    );
  }

  async appendRow(params: {
    role: 'caregiver' | 'elder';
    familyId?: string;
    answers: Record<string, string | string[]>;
    locale?: string;
  }): Promise<{ success: boolean; familyId: string; inviteLink?: string }> {
    const { role, familyId: fid, answers, locale } = params;
    const site = this.env.SITE || 'https://danielcanfly.com';

    // Merge "其他" checkbox + text fields before processing
    const mergedAnswers = mergeOtherOptions(answers);

    await this.setupBothSheets();

    if (role === 'caregiver') {
      const newFid = fid ?? 'fam_' + nanoid(8);
      const sheetName = 'Caregiver';
      const headers = await this.getHeaderRow_(sheetName);
      const ci = (name: string) => headers.indexOf(name);
      const lastRow = await this.lastRow_(sheetName);
      const newCaregiverRow = lastRow + 1;

      const row: string[] = Array(headers.length).fill('');
      row[ci('family_id')] = newFid;
      row[ci('role')] = 'caregiver';
      row[ci('submitted_at')] = new Date().toISOString();
      if (locale) {
        const li = ci('locale');
        if (li !== -1) row[li] = locale;
      }
      for (const [q, av] of Object.entries(mergedAnswers)) {
        const i = ci(q);
        if (i !== -1) row[i] = fmt(av);
      }

      const rng = `${sheetName}!A${newCaregiverRow}:${colLetter(headers.length - 1)}${newCaregiverRow}`;
      await this.api(`/values/${encodeURIComponent(rng)}?valueInputOption=RAW`, {
        method: 'PUT',
        body: JSON.stringify({ values: [row] }),
      });

      // Write cross-link: Caregiver → Elder (placeholder for when Elder row exists)
      const caregiverLinkedColIdx = ci('linked_elder_row');
      if (caregiverLinkedColIdx !== -1) {
        // Find the elder row that has the same family_id (it may already exist from a prior elder submission,
        // or we write a placeholder that gets updated when elder submits)
        const elderRow = await this.findRowByFamilyId('Elder', newFid);
        if (elderRow !== -1) {
          // Elder already submitted — link immediately
          await this.writeLinkCell(sheetName, colLetter(caregiverLinkedColIdx), newCaregiverRow, 'Elder', elderRow);
        }
        // If elder hasn't submitted yet, linked_elder_row stays blank for now;
        // it will be filled in when the elder submits (see elder branch below)
      }

      return {
        success: true,
        familyId: newFid,
        inviteLink: `${site}/zh/survey/elder?ref=${newFid}`,
      };
    }

    if (role === 'elder') {
      if (!fid) throw new Error('elder requires familyId');
      const sheetName = 'Elder';

      // Check if elder already submitted (update mode)
      const existingRow = await this.findRowByFamilyId(sheetName, fid);
      if (existingRow !== -1) {
        const headers = await this.getHeaderRow_(sheetName);
        const ci = (name: string) => headers.indexOf(name);
        const updates: { range: string; values: string[][] }[] = [];
        updates.push({ range: `${sheetName}!${colLetter(ci('role'))}${existingRow}`, values: [['elder']] });
        updates.push({ range: `${sheetName}!${colLetter(ci('submitted_at'))}${existingRow}`, values: [[new Date().toISOString()]] });
        if (locale) {
          const li = ci('locale');
          if (li !== -1) updates.push({ range: `${sheetName}!${colLetter(li)}${existingRow}`, values: [[locale]] });
        }
        for (const [q, av] of Object.entries(mergedAnswers)) {
          const i = ci(q);
          if (i !== -1) updates.push({ range: `${sheetName}!${colLetter(i)}${existingRow}`, values: [[fmt(av)]] });
        }
        await this.api('/values:batchUpdate', {
          method: 'POST',
          body: JSON.stringify({ valueInputOption: 'RAW', data: updates }),
        });

        // Also back-fill the Caregiver row's linked_elder_row (caregiver may have submitted first)
        const caregiverRow = await this.findRowByFamilyId('Caregiver', fid);
        if (caregiverRow !== -1) {
          const cgHeaders = await this.getHeaderRow_('Caregiver');
          const cgCi = (n: string) => cgHeaders.indexOf(n);
          const cgLinkedIdx = cgCi('linked_elder_row');
          if (cgLinkedIdx !== -1) {
            await this.writeLinkCell('Caregiver', colLetter(cgLinkedIdx), caregiverRow, 'Elder', existingRow);
          }
        }

        return { success: true, familyId: fid };
      }

      // New elder row (append)
      const headers = await this.getHeaderRow_(sheetName);
      const ci = (name: string) => headers.indexOf(name);
      const lastRow = await this.lastRow_(sheetName);
      const newElderRow = lastRow + 1;

      const row: string[] = Array(headers.length).fill('');
      row[ci('family_id')] = fid;
      row[ci('role')] = 'elder';
      row[ci('submitted_at')] = new Date().toISOString();
      if (locale) {
        const li = ci('locale');
        if (li !== -1) row[li] = locale;
      }
      for (const [q, av] of Object.entries(mergedAnswers)) {
        const i = ci(q);
        if (i !== -1) row[i] = fmt(av);
      }

      const rng = `${sheetName}!A${newElderRow}:${colLetter(headers.length - 1)}${newElderRow}`;
      await this.api(`/values/${encodeURIComponent(rng)}?valueInputOption=RAW`, {
        method: 'PUT',
        body: JSON.stringify({ values: [row] }),
      });

      // Write Elder → Caregiver link (on the new elder row)
      const elderLinkedColIdx = ci('linked_caregiver_row');
      if (elderLinkedColIdx !== -1) {
        const caregiverRow = await this.findRowByFamilyId('Caregiver', fid);
        if (caregiverRow !== -1) {
          await this.writeLinkCell(sheetName, colLetter(elderLinkedColIdx), newElderRow, 'Caregiver', caregiverRow);
        }
      }

      // Also back-fill Caregiver row's linked_elder_row if caregiver already submitted
      const caregiverRow = await this.findRowByFamilyId('Caregiver', fid);
      if (caregiverRow !== -1) {
        const cgHeaders = await this.getHeaderRow_('Caregiver');
        const cgCi = (n: string) => cgHeaders.indexOf(n);
        const cgLinkedIdx = cgCi('linked_elder_row');
        if (cgLinkedIdx !== -1) {
          await this.writeLinkCell('Caregiver', colLetter(cgLinkedIdx), caregiverRow, 'Elder', newElderRow);
        }
      }

      return { success: true, familyId: fid };
    }

    throw new Error('Unknown role');
  }
}
