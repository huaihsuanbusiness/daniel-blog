export const prerender = false;
import type { APIRoute } from 'astro';
import { GoogleSheet } from '../../../utils/googleSheet';

type WorkersEnv = {
  GOOGLE_PRIVATE_KEY?: string;
  GOOGLE_SHEET_ID?: string;
  SITE?: string;
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const { role, familyId, answers, locale } = body;

    if (!role || !answers) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const env = ((locals as { workersEnv?: WorkersEnv }).workersEnv ?? {}) as WorkersEnv;

    const googleEnv = {
      GOOGLE_PRIVATE_KEY: env.GOOGLE_PRIVATE_KEY ?? '',
      GOOGLE_SHEET_ID: env.GOOGLE_SHEET_ID ?? '',
      SITE: env.SITE ?? 'https://danielcanfly.com',
    };

    const sheet = new GoogleSheet(googleEnv);
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
