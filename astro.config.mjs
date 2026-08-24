// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://theoria.rs',
  base: '/',

  server: {
    host: true,
    allowedHosts: [
      '.app.github.dev',
    ],
  },
});