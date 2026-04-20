// Workers runtime env accessor - no caching, always read fresh
export async function getWorkersEnv(): Promise<{ GOOGLE_PRIVATE_KEY?: string; GOOGLE_SHEET_ID?: string; SITE?: string }> {
  const { env } = await import('cloudflare:workers');
  return env as { GOOGLE_PRIVATE_KEY?: string; GOOGLE_SHEET_ID?: string; SITE?: string };
}