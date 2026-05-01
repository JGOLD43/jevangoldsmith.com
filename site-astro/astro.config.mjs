import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// As of Phase 10 (dist swap), Astro is the default build. Output goes to
// ../dist/ which Firebase Hosting serves. The legacy scripts/legacy-build/
// is kept for emergency rollback; npm run build:legacy still works.
export default defineConfig({
  site: 'https://jevangoldsmith.com',
  output: 'static',
  outDir: '../dist',
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
