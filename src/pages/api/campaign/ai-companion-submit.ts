export const prerender = false;

import type { APIRoute } from 'astro';
import { GoogleSheet } from '../../../utils/googleSheet';

function googleSheetEnvRuntime(): { GOOGLE_PRIVATE_KEY?: string; GOOGLE_SHEET_ID?: string; SITE?: string } {
  if (typeof process !== 'undefined' && process.env?.GOOGLE_SHEET_ID) {
    return {
      GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
      GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID,
      SITE: process.env.SITE,
    };
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).GOOGLE_SHEET_ID) {
    return globalThis as { GOOGLE_PRIVATE_KEY?: string; GOOGLE_SHEET_ID?: string; SITE?: string };
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
