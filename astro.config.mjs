// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://mradzic.github.io',
  base: '/theoria',

  server: {
    host: true,
    allowedHosts: [
      '.app.github.dev',
    ],
  },
});