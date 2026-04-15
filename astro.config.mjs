import { defineConfig, passthroughImageService } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
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
  output: 'static',
  adapter: cloudflare(),
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
});
