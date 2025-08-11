// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// For Cloudflare Pages with Pages Functions, use a static build so the
// functions/ directory handles dynamic requests like /sendEmail.
export default defineConfig({
  output: 'static',
  integrations: [tailwind()],
});

