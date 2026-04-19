import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  // Access Cloudflare Workers env bindings and expose them via Astro.locals
  // This is the bridge between Workers' fetch handler env and Astro API routes
  const { env } = context;
  context.locals.workersEnv = env;
  return next();
});