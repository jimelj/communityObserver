// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';

// Use hybrid mode to support both static pages and server endpoints
// Server endpoints will work in dev and deploy to Cloudflare Pages Functions
export default defineConfig({
  output: 'hybrid',
  adapter: cloudflare(),
  integrations: [tailwind()],
});

