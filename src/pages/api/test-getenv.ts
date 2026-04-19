export const prerender = false;
import type { APIRoute } from 'astro';

async function getWorkersEnv() {
  const { env } = await import('cloudflare:workers');
  return env;
}

export const GET: APIRoute = async () => {
  try {
    const env = await getWorkersEnv();
    return new Response(JSON.stringify({
      GOOGLE_SHEET_ID: env.GOOGLE_SHEET_ID ?? 'undefined',
      GOOGLE_PRIVATE_KEY: env.GOOGLE_PRIVATE_KEY ? '[SET]' : 'undefined',
      isEmpty: env.GOOGLE_SHEET_ID === '',
      isFalsy: !env.GOOGLE_SHEET_ID,
      rawLength: env.GOOGLE_SHEET_ID?.length,
      envKeys: Object.keys(env).filter(k => k.includes('GOOGLE')).join(', ')
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
};