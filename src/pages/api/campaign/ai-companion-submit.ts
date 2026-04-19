export const prerender = false;

import type { APIRoute } from 'astro';
import { GoogleSheet } from '../../../utils/googleSheet';

// Astro v6 + Cloudflare Workers: access env via dynamic import from cloudflare:workers
// This is the ONLY reliable way to access Workers env bindings in API route handlers
async function getWorkersEnv(): Promise<{ GOOGLE_PRIVATE_KEY?: string; GOOGLE_SHEET_ID?: string; SITE?: string }> {
  const { env } = await import('cloudflare:workers');
  return env as { GOOGLE_PRIVATE_KEY?: string; GOOGLE_SHEET_ID?: string; SITE?: string };
}

function googleSheetEnvRuntime(env: { GOOGLE_PRIVATE_KEY?: string; GOOGLE_SHEET_ID?: string; SITE?: string }): { GOOGLE_PRIVATE_KEY?: string; GOOGLE_SHEET_ID?: string; SITE?: string } {
  if (!env.GOOGLE_SHEET_ID) {
    throw new Error('GOOGLE_SHEET_ID is not set in environment');
  }
  return env;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { role, familyId, answers, locale } = body;

    if (!role || !answers) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const env = await getWorkersEnv();
    const envAccessor = () => googleSheetEnvRuntime(env);
    const sheet = new GoogleSheet(envAccessor);
    const result = await sheet.appendRow({ role, familyId, answers, locale });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};