import type { APIRoute } from 'astro';

import { fetchPublicRagJson, getRagProxyMeta } from '../../../utils/ragServer';

export const prerender = false;

type RuntimeControlDefinition = {
  key: string;
  label: string;
  description: string;
  type: 'toggle' | 'select' | 'number';
  options?: Array<{ value: string; label: string; description?: string }>;
  min?: number;
  max?: number;
  step?: number;
};

async function fetchOptionalPublicRagJson(path: string): Promise<unknown | null> {
  try {
    return await fetchPublicRagJson(path);
  } catch {
    return null;
  }
}

function buildFallbackRuntimePolicyStatus() {
  return {
    enabled_by_default: true,
    implementation: 'blog_proxy_fallback_v1',
    fallback: 'frontend_manual_and_backend_profile_fallback',
    public_query_modes: ['auto', 'fast', 'safe', 'deep_eval', 'creative', 'agentic'],
    policy_control_fields: [
      'query_mode',
      'use_workflow',
      'use_tool_routing',
      'use_retry_loop',
      'retrieval_mode',
      'use_parent_expansion',
      'use_context_compression',
      'use_long_context_reorder',
      'min_score',
      'max_retries',
    ],
    backendSupportsRuntimePolicyEndpoint: false,
    principles: [
      'Auto mode should remain visible even before the dedicated runtime-policy endpoint is deployed.',
      'High-level strategy defaults still come from query_mode profiles.',
      'Manual overrides are always available for advanced debugging and demos.',
    ],
    control_explanations: {},
  };
}

function buildManualControls(): RuntimeControlDefinition[] {
  return [
    {
      key: 'use_workflow',
      label: 'Workflow',
      description: 'Send this request through the inspectable workflow rail instead of the direct engine path.',
      type: 'toggle',
    },
    {
      key: 'use_tool_routing',
      label: 'Tool routing',
      description: 'Allow the runtime to route toward tools or alternate execution paths before answering.',
      type: 'toggle',
    },
    {
      key: 'use_retry_loop',
      label: 'Retry loop',
      description: 'Permit reflect-and-retry when the first answer looks weak or mismatched.',
      type: 'toggle',
    },
    {
      key: 'retrieval_mode',
      label: 'Retrieval mode',
      description: 'Choose whether retrieval uses hybrid search or dense-only search.',
      type: 'select',
      options: [
        { value: 'hybrid', label: 'Hybrid', description: 'Combines vector and keyword signals.' },
        { value: 'dense', label: 'Dense', description: 'Embedding-first retrieval only.' },
      ],
    },
    {
      key: 'use_parent_expansion',
      label: 'Parent expansion',
      description: 'Expand matched child chunks into richer parent context before synthesis.',
      type: 'toggle',
    },
    {
      key: 'use_context_compression',
      label: 'Context compression',
      description: 'Compress long retrieved context before answer synthesis.',
      type: 'toggle',
    },
    {
      key: 'use_long_context_reorder',
      label: 'Long-context reorder',
      description: 'Reorder long retrieved context to surface the most relevant evidence earlier.',
      type: 'toggle',
    },
    {
      key: 'min_score',
      label: 'Minimum score',
      description: 'Lowest retrieval score that should still be trusted as evidence.',
      type: 'number',
      min: 0,
      max: 1,
      step: 0.01,
    },
    {
      key: 'max_retries',
      label: 'Max retries',
      description: 'Cap how many retry attempts the runtime may spend on this question.',
      type: 'number',
      min: 0,
      max: 5,
      step: 1,
    },
  ];
}

export const GET: APIRoute = async () => {
  try {
    const [health, queryProfiles, runtimeBudgets, runtimePolicyStatus, workflowStatus] = await Promise.all([
      fetchPublicRagJson('/health'),
      fetchPublicRagJson('/query-profiles'),
      fetchPublicRagJson('/runtime-budgets'),
      fetchOptionalPublicRagJson('/runtime-policy/status'),
      fetchOptionalPublicRagJson('/workflow/status'),
    ]);

    const defaults = {
      query_mode: 'auto',
      use_runtime_policy_router: true,
      use_workflow: false,
      use_tool_routing: false,
      use_retry_loop: true,
      retrieval_mode: 'hybrid',
      use_parent_expansion: true,
      use_context_compression: false,
      use_long_context_reorder: false,
      deterministic_first_override: false,
      min_score: 0.55,
      max_retries: null,
    };

    return new Response(
      JSON.stringify({
        ok: true,
        proxy: getRagProxyMeta(),
        health,
        queryProfiles,
        runtimeBudgets,
        runtimePolicyStatus: runtimePolicyStatus ?? buildFallbackRuntimePolicyStatus(),
        workflowStatus,
        controls: {
          manual: buildManualControls(),
        },
        defaults,
        capabilities: {
          runtimePolicyEndpoint: Boolean(runtimePolicyStatus),
          workflowAvailable: Boolean(
            (workflowStatus as { available?: boolean; enabled?: boolean } | null)?.available ??
            (workflowStatus as { available?: boolean; enabled?: boolean } | null)?.enabled
          ),
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
