export const prerender = false;

import type { APIRoute } from 'astro';
import { GoogleSheet } from '../../../utils/googleSheet';

// Cloudflare Workers: import env from cloudflare:workers to access bindings
// This is the Astro v6 + Workers recommended approach
let _env: { GOOGLE_PRIVATE_KEY?: string; GOOGLE_SHEET_ID?: string; SITE?: string } | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { env: workersEnv } = await import('cloudflare:workers');
  // Workers env bindings are exposed via the module
  // We'll try to access them in the function below
} catch {
  // Not in Workers environment
}

function googleSheetEnvRuntime(): { GOOGLE_PRIVATE_KEY?: string; GOOGLE_SHEET_ID?: string; SITE?: string } {
  // Cloudflare Workers env bindings: try cloudflare:workers import
  // This works in Workers runtime at module scope
  if (typeof globalThis !== 'undefined') {
    const t = globalThis as any;
    if (t.GOOGLE_SHEET_ID) {
      return t;
    }
    if (t.env?.GOOGLE_SHEET_ID) {
      return t.env;
    }
  }

  // Node.js / local dev
  if (typeof process !== 'undefined' && process.env?.GOOGLE_SHEET_ID) {
    return {
      GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
      GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID,
      SITE: process.env.SITE,
    };
  }

  throw new Error('GOOGLE_SHEET_ID is not set in environment');
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

    const sheet = new GoogleSheet(googleSheetEnvRuntime);
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