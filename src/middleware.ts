import { defineMiddleware } from 'astro:middleware';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const hostname = url.hostname.toLowerCase();

  if (!LOCAL_HOSTS.has(hostname) && url.protocol === 'http:') {
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 308);
  }

  const response = await next();

  if (!LOCAL_HOSTS.has(hostname) && url.protocol === 'https:') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  return response;
});
