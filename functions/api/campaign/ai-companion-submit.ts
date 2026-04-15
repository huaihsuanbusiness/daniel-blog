import { GoogleSheet } from '../../../src/utils/googleSheet';

type Env = {
  GOOGLE_PRIVATE_KEY?: string;
  GOOGLE_SHEET_ID?: string;
  SITE?: string;
};

export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    const body = (await context.request.json()) as {
      role?: 'caregiver' | 'elder';
      familyId?: string;
      answers?: Record<string, string | string[]>;
      locale?: string;
    };

    const { role, familyId, answers, locale } = body;

    if (!role || !answers) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const sheet = new GoogleSheet(context.env);
    const result = await sheet.appendRow({ role, familyId, answers, locale });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
