import { defineConfig, passthroughImageService } from 'astro/config';

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
});
