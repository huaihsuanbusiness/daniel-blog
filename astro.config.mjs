import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://danielcanfly.com',
  build: {
    assets: '_assets',
  },
  vite: {
    build: {
      cssMinify: true,
    },
  },
});
