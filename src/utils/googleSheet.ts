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

function fmt(v: string | string[]): string {
  return Array.isArray(v) ? v.join(',') : v;
}

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

  async getSpreadsheetMeta(): Promise<{ spreadsheetTitle: string; sheets: string[] }> {
    const meta = await this.api<{ properties?: { title: string }; sheets?: { properties?: { title: string } }[] }>('');
    return {
      spreadsheetTitle: meta.properties?.title ?? '',
      sheets: meta.sheets?.map(s => s.properties?.title ?? '工作表1') ?? ['工作表1'],
    };
  }

  async writeTestValue(): Promise<Record<string, unknown>> {
    const meta = await this.api<{ sheets?: { properties?: { title: string } }[] }>('');
    const sheetName = meta.sheets?.[0]?.properties?.title ?? '工作表1';
    const testValue = 'TEST_' + Date.now();
    await this.api(
      `/values/${encodeURIComponent(`${sheetName}!A1:A1`)}?valueInputOption=RAW`,
      {
        method: 'PUT',
        body: JSON.stringify({ values: [[testValue]] }),
      }
    );
    const res = await this.api<{ values?: string[][] }>(
      `/values/${encodeURIComponent(`${sheetName}!A1:A1`)}`
    );
    return { sheetName, testValue, readBack: res.values?.[0]?.[0] };
  }

  /** Ensure header row exists, creating it if the sheet is blank.
   * Returns both the header array and the sheet tab name. */
  async ensureHeaderRow(): Promise<{ headers: string[]; sheetName: string }> {
    const meta = await this.api<{ sheets?: { properties?: { title: string } }[] }>('');
    const sheetName = meta.sheets?.[0]?.properties?.title ?? '工作表1';
    const headers = await this.getHeaderRow_(sheetName);
    if (headers.length > 0) return { headers, sheetName };
    // Sheet is empty — write header row
    const headerRow = ['family_id', 'role', 'submitted_at', 'locale'];
    await this.api(
      `/values/${encodeURIComponent(`${sheetName}!A1:${colLetter(headerRow.length - 1)}1`)}?valueInputOption=RAW`,
      { method: 'PUT', body: JSON.stringify({ values: [headerRow] }) }
    );
    return { headers: headerRow, sheetName };
  }

  private async getHeaderRow_(sheetName: string): Promise<string[]> {
    // Use A1:ZZ1 as the range — Sheets will return all columns up to ZZ (column 702)
    const res = await this.api<{ values?: string[][] }>(`/values/${encodeURIComponent(`${sheetName}!A1:ZZ1`)}`);
    return res.values?.[0] || [];
  }


  private async lastRow_(sheetName: string): Promise<number> {
    const res = await this.api<{ values?: unknown[][] }>(`/values/${encodeURIComponent(`${sheetName}!A:A`)}`);
    return res.values?.length ?? 0;
  }

  async appendRow(params: {
    role: 'caregiver' | 'elder';
    familyId?: string;
    answers: Record<string, string | string[]>;
    locale?: string;
  }): Promise<{ success: boolean; familyId: string; inviteLink?: string }> {
    const { role, familyId: fid, answers, locale } = params;
    const site = this.env.SITE || 'https://danielcanfly.com';
    const { headers, sheetName } = await this.ensureHeaderRow();
    const ci = (name: string) => headers.indexOf(name);
    const aIdx = ci('family_id');
    const rIdx = ci('role');
    const sIdx = ci('submitted_at');

    if (role === 'caregiver') {
      const newFid = 'fam_' + nanoid(8);
      const lastRow = await this.lastRow_(sheetName);

      const row: string[] = Array(headers.length).fill('');
      row[aIdx] = newFid;
      row[rIdx] = 'caregiver';
      row[sIdx] = new Date().toISOString();
      if (locale) {
        const li = ci('locale');
        if (li !== -1) row[li] = locale;
      }
      for (const [q, av] of Object.entries(answers)) {
        const i = ci(q);
        if (i !== -1) row[i] = fmt(av);
      }

      const rng = `${sheetName}!A${lastRow + 1}:${colLetter(headers.length - 1)}${lastRow + 1}`;
      await this.api(`/values/${encodeURIComponent(rng)}?valueInputOption=RAW`, {
        method: 'PUT',
        body: JSON.stringify({ values: [row] }),
      });

      return { success: true, familyId: newFid, inviteLink: `${site}/zh/survey/elder?ref=${newFid}` };
    }

    if (!fid) throw new Error('elder requires familyId');

    const fidLetter = colLetter(aIdx);
    const res = await this.api<{ values?: string[][] }>(
      `/values/${encodeURIComponent(`${sheetName}!${fidLetter}:${fidLetter}`)}`
    );
    const rows = res.values || [];
    let targetRow = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === fid) {
        targetRow = i + 1;
        break;
      }
    }
    if (targetRow === -1) throw new Error(`family_id ${fid} not found`);

    const updates: { range: string; values: string[][] }[] = [];
    updates.push({ range: `${sheetName}!${colLetter(rIdx)}${targetRow}`, values: [['elder']] });
    updates.push({ range: `${sheetName}!${colLetter(sIdx)}${targetRow}`, values: [[new Date().toISOString()]] });
    if (locale) {
      const li = ci('locale');
      if (li !== -1) updates.push({ range: `${sheetName}!${colLetter(li)}${targetRow}`, values: [[locale]] });
    }
    for (const [q, av] of Object.entries(answers)) {
      const i = ci(q);
      if (i !== -1) updates.push({ range: `${sheetName}!${colLetter(i)}${targetRow}`, values: [[fmt(av)]] });
    }

    await this.api('/values:batchUpdate', {
      method: 'POST',
      body: JSON.stringify({ valueInputOption: 'RAW', data: updates }),
    });

    return { success: true, familyId: fid };
  }
}
