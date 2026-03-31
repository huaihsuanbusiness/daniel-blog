import { defineConfig, passthroughImageService } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  image: {
    service: passthroughImageService(),
  },

  output: 'static',
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

  adapter: cloudflare(),
});