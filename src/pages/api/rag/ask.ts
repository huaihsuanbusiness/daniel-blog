import type { APIRoute } from 'astro';

import { fetchPublicRagJson, postRagAsk } from '../../../utils/ragServer';

export const prerender = false;

let runtimePolicyEndpointAvailable: boolean | null = null;

function asTrimmedString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function asBoundedNumber(value: unknown, min: number, max: number, integer = false): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return null;
  const candidate = integer ? Math.trunc(numeric) : numeric;
  if (candidate < min || candidate > max) return null;
  return candidate;
}

async function hasRuntimePolicyEndpoint(): Promise<boolean> {
  if (runtimePolicyEndpointAvailable !== null) return runtimePolicyEndpointAvailable;
  try {
    await fetchPublicRagJson('/runtime-policy/status');
    runtimePolicyEndpointAvailable = true;
  } catch {
    runtimePolicyEndpointAvailable = false;
  }
  return runtimePolicyEndpointAvailable;
}

function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function applyProxyAutoFallback(question: string, payload: Record<string, unknown>) {
  const text = question.toLowerCase();
  const creativeKeywords = ['rewrite', 'draft', 'brainstorm', '改寫', '草稿', '文案', '潤稿'];
  const evalKeywords = ['evaluate', 'evaluation', 'judge', 'verify', 'fact-check', 'hallucination', 'debug', '評估', '驗證', '檢查', '除錯'];
  const toolKeywords = ['latest', 'current', 'today', 'news', 'weather', 'price', 'schedule', 'sql', 'database', 'calculator', '計算', '最新', '今天', '現在', '資料庫', '上網查', 'mcp'];
  const identityQuestion =
    /(daniel|nattynites|pm|product manager|產品經理|产品经理|創業|创业)/.test(text) &&
    /(是什麼|做什麼|在做什麼|是誰|覺得|認為|认为|看法|怎麼看|怎么看|特質|特质|能力|最重要|what is|what does|who is|traits|quality|qualities|mindset|important)/.test(text);

  let resolvedMode = 'safe';
  let workflow = false;
  let toolRouting = false;
  let retryLoop = true;

  if (/^\s*[\d\s.+\-*/%()]+\s*$/.test(text) && /[+\-*/%]/.test(text)) {
    resolvedMode = 'agentic';
    workflow = true;
    toolRouting = true;
    retryLoop = false;
  } else if (identityQuestion) {
    resolvedMode = 'safe';
  } else if (containsAny(text, evalKeywords)) {
    resolvedMode = 'deep_eval';
  } else if (containsAny(text, creativeKeywords)) {
    resolvedMode = 'creative';
    retryLoop = false;
  } else if (containsAny(text, toolKeywords)) {
    resolvedMode = 'agentic';
    workflow = true;
    toolRouting = true;
  }

  payload.query_mode = resolvedMode;
  payload.use_runtime_policy_router = false;
  if (!('use_workflow' in payload)) payload.use_workflow = workflow;
  if (!('use_tool_routing' in payload)) payload.use_tool_routing = toolRouting;
  if (!('use_retry_loop' in payload)) payload.use_retry_loop = retryLoop;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const question = asTrimmedString(body?.question) || '';

    if (!question) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Question is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const payload: Record<string, unknown> = {
      question,
      query_mode: asTrimmedString(body.query_mode) || 'auto',
      use_runtime_policy_router: body.use_runtime_policy_router !== false,
    };

    for (const key of [
      'use_workflow',
      'use_tool_routing',
      'use_retry_loop',
      'use_parent_expansion',
      'use_context_compression',
      'use_long_context_reorder',
      'use_async_evaluators',
    ]) {
      const value = asBoolean(body[key]);
      if (value !== null) payload[key] = value;
    }

    const synthesisMode = asTrimmedString(body.synthesis_mode);
    if (synthesisMode) payload.synthesis_mode = synthesisMode;

    const retrievalMode = asTrimmedString(body.retrieval_mode);
    if (retrievalMode) payload.retrieval_mode = retrievalMode;

    const minScore = asBoundedNumber(body.min_score, 0, 1, false);
    if (minScore !== null) payload.min_score = minScore;

    const maxRetries = asBoundedNumber(body.max_retries, 0, 5, true);
    if (maxRetries !== null) payload.max_retries = maxRetries;

    if (payload.query_mode === 'auto' && !(await hasRuntimePolicyEndpoint())) {
      applyProxyAutoFallback(question, payload);
    }

    const upstream = await postRagAsk(payload, { signal: request.signal });

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
