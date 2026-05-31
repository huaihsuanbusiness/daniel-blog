import type { APIRoute } from 'astro';

import { fetchPublicRagJson, getRagProxyMeta } from '../../../utils/ragServer';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const [health, queryProfiles, runtimeBudgets, runtimePolicyStatus] = await Promise.all([
      fetchPublicRagJson('/health'),
      fetchPublicRagJson('/query-profiles'),
      fetchPublicRagJson('/runtime-budgets'),
      fetchPublicRagJson('/runtime-policy/status').catch(() => null),
    ]);

    return new Response(
      JSON.stringify({
        ok: true,
        proxy: getRagProxyMeta(),
        health,
        queryProfiles,
        runtimeBudgets,
        runtimePolicyStatus,
        defaults: {
          query_mode: 'auto',
          use_runtime_policy_router: true,
          use_workflow: false,
          use_tool_routing: false,
          use_retry_loop: true,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: String(error),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
