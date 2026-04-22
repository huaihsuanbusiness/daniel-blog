export const prerender = false;
import type { APIRoute } from 'astro';
import { GoogleSheet } from '../../../utils/googleSheet';

type WorkersEnv = {
  GOOGLE_PRIVATE_KEY?: string;
  GOOGLE_SHEET_ID?: string;
  SITE?: string;
};

export const POST: APIRoute = async ({ locals }) => {
  try {
    const env = ((locals as { workersEnv?: WorkersEnv }).workersEnv ?? {}) as WorkersEnv;

    const googleEnv = {
      GOOGLE_PRIVATE_KEY: env.GOOGLE_PRIVATE_KEY ?? '',
      GOOGLE_SHEET_ID: env.GOOGLE_SHEET_ID ?? '',
      SITE: env.SITE ?? 'https://danielcanfly.com',
    };

    const sheet = new GoogleSheet(googleEnv);
    const result = await sheet.setupBothSheets();

    return new Response(JSON.stringify({ success: true, ...result }), {
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
