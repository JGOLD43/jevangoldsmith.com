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
  integrations: [
    mdx(),
    sitemap({
      // Match legacy URL form so external backlinks + Search Console don't
      // see a URL change.
      serialize(item) {
        if (!item.url.endsWith('/') && !/\.[a-z]+$/.test(item.url)) {
          item.url = `${item.url}.html`;
        }
        return item;
      },
      filter: (page) => !page.endsWith('/data-smoke') && !page.endsWith('/data-smoke.html')
    })
  ],
  vite: {
    plugins: [tailwindcss()]
  }
});
