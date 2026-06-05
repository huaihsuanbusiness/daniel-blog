import { env } from 'cloudflare:workers';

type RagEnv = {
  RAG_API_BASE_URL?: string;
  RAG_TENANT_ID?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_TEST_EMAIL?: string;
  SUPABASE_TEST_PASSWORD?: string;
};

type CachedToken = {
  accessToken: string;
  expiresAt: number;
};

let cachedToken: CachedToken | null = null;

function getEnv(): RagEnv {
  return env as RagEnv;
}

function normalizeSupabaseUrl(url: string): string {
  let value = (url || '').trim().replace(/\/+$/, '');
  for (const suffix of ['/rest/v1', '/storage/v1', '/auth/v1']) {
    if (value.endsWith(suffix)) {
      value = value.slice(0, -suffix.length);
    }
  }
  return value.replace(/\/+$/, '');
}

function getRagApiBaseUrl(): string {
  return (getEnv().RAG_API_BASE_URL || 'https://api.danielcanfly.com').replace(/\/+$/, '');
}

function getRagTenantId(): string {
  return (getEnv().RAG_TENANT_ID || 'nattynites').trim();
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function fetchPublicRagJson(path: string): Promise<unknown> {
  const response = await fetch(`${getRagApiBaseUrl()}${path}`, {
    headers: {
      'User-Agent': 'daniel-blog-rag-workbench/1.0',
      Accept: 'application/json',
    },
  });
  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(`RAG public request failed (${response.status}): ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function getSupabaseAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - now > 60_000) {
    return cachedToken.accessToken;
  }

  const runtimeEnv = getEnv();
  const supabaseUrl = normalizeSupabaseUrl(runtimeEnv.SUPABASE_URL || '');
  const anonKey = (runtimeEnv.SUPABASE_ANON_KEY || '').trim();
  const email = (runtimeEnv.SUPABASE_TEST_EMAIL || '').trim();
  const password = (runtimeEnv.SUPABASE_TEST_PASSWORD || '').trim();

  if (!supabaseUrl || !anonKey || !email || !password) {
    throw new Error('Missing Supabase runtime secrets for the RAG proxy.');
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json',
      'User-Agent': 'daniel-blog-rag-workbench/1.0',
    },
    body: JSON.stringify({ email, password }),
  });

  const payload = (await parseJsonSafe(response)) as { access_token?: string; expires_in?: number } | string | null;

  if (!response.ok || !payload || typeof payload === 'string' || !payload.access_token) {
    throw new Error(`Failed to obtain Supabase access token: ${JSON.stringify(payload)}`);
  }

  cachedToken = {
    accessToken: payload.access_token,
    expiresAt: now + ((payload.expires_in || 3600) * 1000),
  };
  return payload.access_token;
}

export async function postRagAsk(
  requestBody: Record<string, unknown>,
  options?: { signal?: AbortSignal }
): Promise<{ status: number; payload: unknown }> {
  const token = await getSupabaseAccessToken();
  const response = await fetch(`${getRagApiBaseUrl()}/ask`, {
    method: 'POST',
    signal: options?.signal,
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Tenant-Id': getRagTenantId(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'daniel-blog-rag-workbench/1.0',
    },
    body: JSON.stringify(requestBody),
  });

  return {
    status: response.status,
    payload: await parseJsonSafe(response),
  };
}

export function getRagProxyMeta() {
  return {
    apiBaseUrl: getRagApiBaseUrl(),
    tenantId: getRagTenantId(),
  };
}
