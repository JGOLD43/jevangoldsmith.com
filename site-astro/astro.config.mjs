import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// In-progress migration. Outputs to ../dist-astro/ so the legacy build (writes
// to ../dist/) and this build coexist until Phase 10 swap-and-archive.
export default defineConfig({
  site: 'https://jevangoldsmith.com',
  output: 'static',
  outDir: '../dist-astro',
  trailingSlash: 'never',
  build: {
    format: 'file'
  },
  integrations: [mdx(), sitemap()],
  vite: {
    plugins: [tailwindcss()]
  }
});
