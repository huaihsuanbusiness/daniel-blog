import { defineMiddleware } from 'astro:middleware';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

// Legacy slug redirects. The `_redirects` file in public/ only catches requests
// that bypass the Worker (no-trailing-slash variant); Cloudflare does NOT apply
// `_redirects` rules to requests served by Worker code (see Workers Static Assets
// docs). Slug variants with trailing slash go straight to the Worker, so this
// middleware handles them too. Keep entries in sync with public/_redirects.
const LEGACY_REDIRECTS: Record<string, string> = {
  '/blog/agent-design-patterns-atlas-part-1': '/blog/the-atlas-of-agent-design-patterns-part-1',
  '/zh/blog/agent-design-patterns-atlas-part-1': '/zh/blog/the-atlas-of-agent-design-patterns-part-1',
  '/en/blog/agent-design-patterns-atlas-part-1': '/en/blog/the-atlas-of-agent-design-patterns-part-1',
};

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const hostname = url.hostname.toLowerCase();

  if (!LOCAL_HOSTS.has(hostname) && url.protocol === 'http:') {
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 308);
  }

  // Legacy slug redirect. Normalize by stripping a single trailing slash so
  // both `/path` and `/path/` resolve to the same lookup key.
  const normalizedPath = url.pathname.replace(/\/$/, '') || '/';
  const redirectTarget = LEGACY_REDIRECTS[normalizedPath];
  if (redirectTarget) {
    url.pathname = redirectTarget;
    return Response.redirect(url.toString(), 301);
  }

  const response = await next();

  if (!LOCAL_HOSTS.has(hostname) && url.protocol === 'https:') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  return response;
});