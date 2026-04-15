import { nanoid } from 'nanoid';

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

async function getAccessToken(): Promise<string> {
  const raw = import.meta.env.GOOGLE_PRIVATE_KEY as string;
  if (!raw) throw new Error('GOOGLE_PRIVATE_KEY is not set');
  const creds = JSON.parse(raw);
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
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth2:grant-type:jwt-bearer', assertion: jwt }),
  });
  const data = await res.json() as { access_token?: string; error?: string };
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
  private sheetId: string;
  private token: string | null = null;

  constructor() {
    this.sheetId = import.meta.env.GOOGLE_SHEET_ID as string;
  }

  private async token_(): Promise<string> {
    if (!this.token) this.token = await getAccessToken();
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
    const body = await res.json() as T & { error?: { message?: string } };
    if (!res.ok) throw new Error(`Sheets API ${path}: ${body?.error?.message || res.statusText}`);
    return body;
  }

  async appendRow(params: {
    role: 'caregiver' | 'elder';
    familyId?: string;
    answers: Record<string, string | string[]>;
    locale?: string;
  }): Promise<{ success: boolean; familyId: string; inviteLink?: string }> {
    const { role, familyId: fid, answers, locale } = params;
    const site = (import.meta.env.SITE as string) || 'https://danielcanfly.com';
    const headers = await this.getHeaderRow_();

    const ci = (name: string) => headers.indexOf(name);
    const aIdx = ci('family_id');
    const rIdx = ci('role');
    const sIdx = ci('submitted_at');

    if (role === 'caregiver') {
      const newFid = 'fam_' + nanoid(8);
      const lastRow = await this.lastRow_();

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

      const rng = `'Survey_Responses'!A${lastRow + 1}:${colLetter(headers.length - 1)}${lastRow + 1}`;
      await this.api(`/values/${encodeURIComponent(rng)}?valueInputOption=RAW`, {
        method: 'PUT',
        body: JSON.stringify({ values: [row] }),
      });

      return { success: true, familyId: newFid, inviteLink: `${site}/zh/survey/elder?ref=${newFid}` };
    } else {
      if (!fid) throw new Error('elder requires familyId');

      const fidLetter = colLetter(aIdx);
      const res = await this.api<{ values?: string[][] }>(`/values/${encodeURIComponent(`'Survey_Responses'!${fidLetter}:${fidLetter}`)}`);
      const rows = res.values || [];
      let targetRow = -1;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === fid) { targetRow = i + 1; break; }
      }
      if (targetRow === -1) throw new Error(`family_id ${fid} not found`);

      const updates: { range: string; values: string[][] }[] = [];
      updates.push({ range: `'Survey_Responses'!${colLetter(rIdx)}${targetRow}`, values: [['elder']] });
      updates.push({ range: `'Survey_Responses'!${colLetter(sIdx)}${targetRow}`, values: [[new Date().toISOString()]] });
      if (locale) {
        const li = ci('locale');
        if (li !== -1) updates.push({ range: `'Survey_Responses'!${colLetter(li)}${targetRow}`, values: [[locale]] });
      }
      for (const [q, av] of Object.entries(answers)) {
        const i = ci(q);
        if (i !== -1) updates.push({ range: `'Survey_Responses'!${colLetter(i)}${targetRow}`, values: [[fmt(av)]] });
      }

      await this.api('/values:batchUpdate', {
        method: 'POST',
        body: JSON.stringify({ valueInputOption: 'RAW', data: updates }),
      });

      return { success: true, familyId: fid };
    }
  }

  private async getHeaderRow_(): Promise<string[]> {
    const res = await this.api<{ values?: string[][] }>("/values/%27Survey_Responses%27!1:1");
    return res.values?.[0] || [];
  }

  private async lastRow_(): Promise<number> {
    const res = await this.api<{ values?: unknown[][] }>("/values/%27Survey_Responses%27!A:A");
    return res.values?.length ?? 0;
  }
}
