import { defineConfig, passthroughImageService } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
  adapter: cloudflare({ platformProxyType: 'nodejs' }),
  output: 'server',
  image: {
    service: passthroughImageService(),
  },
  site: 'https://danielcanfly.com',
  build: {
    assets: '_assets',
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh'],
    routing: {
      prefixDefaultLocale: true,
    },
  },
  vite: {
    build: {
      cssMinify: true,
    },
  },
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
  redirects: {
    '/blog/agent-design-patterns-atlas-part-1': '/blog/the-atlas-of-agent-design-patterns-part-1',
    '/blog/agent-design-patterns-atlas-part-1/': '/blog/the-atlas-of-agent-design-patterns-part-1',
    '/zh/blog/agent-design-patterns-atlas-part-1': '/zh/blog/the-atlas-of-agent-design-patterns-part-1',
    '/zh/blog/agent-design-patterns-atlas-part-1/': '/zh/blog/the-atlas-of-agent-design-patterns-part-1',
    '/en/blog/agent-design-patterns-atlas-part-1': '/en/blog/the-atlas-of-agent-design-patterns-part-1',
    '/en/blog/agent-design-patterns-atlas-part-1/': '/en/blog/the-atlas-of-agent-design-patterns-part-1',
  },
});