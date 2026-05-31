import type { APIRoute } from 'astro';

import { postRagAsk } from '../../../utils/ragServer';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const question = typeof body?.question === 'string' ? body.question.trim() : '';

    if (!question) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Question is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const payload = {
      question,
      query_mode: typeof body.query_mode === 'string' ? body.query_mode : 'safe',
      use_workflow: Boolean(body.use_workflow),
      use_tool_routing: Boolean(body.use_tool_routing),
      use_retry_loop: body.use_retry_loop !== false,
      use_async_evaluators: Boolean(body.use_async_evaluators),
    };

    const upstream = await postRagAsk(payload);

    return new Response(JSON.stringify(upstream.payload), {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
