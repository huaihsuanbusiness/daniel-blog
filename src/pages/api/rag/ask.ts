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

    const payload: Record<string, unknown> = {
      question,
      query_mode: typeof body.query_mode === 'string' ? body.query_mode : 'auto',
      use_runtime_policy_router: body.use_runtime_policy_router !== false,
    };

    for (const field of ['use_workflow', 'use_tool_routing', 'use_retry_loop', 'use_async_evaluators']) {
      if (field in (body || {})) {
        payload[field] = body[field];
      }
    }

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
