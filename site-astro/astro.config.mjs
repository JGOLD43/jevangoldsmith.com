import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Astro is the canonical build. Output goes to ../dist/ which Firebase
// Hosting serves.
export default defineConfig({
  site: 'https://jevangoldsmith.com',
  output: 'static',
  outDir: '../dist',
  trailingSlash: 'never',
  build: {
    format: 'file'
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          // Hoist shared collection-page deps into one chunk so navigating
          // books → movies → people hits the cache instead of re-downloading
          // html-escape, debounce, storage, dom-ready, action-dispatcher,
          // collection-helpers/ui/runtime, data-fetch.
          manualChunks(id) {
            if (!id.includes('/site-astro/src/')) return undefined;
            if (id.includes('/lib/html-escape')
              || id.includes('/lib/debounce')
              || id.includes('/lib/storage')
              || id.includes('/scripts/dom-ready')
              || id.includes('/scripts/action-dispatcher')
              || id.includes('/scripts/collection-helpers')
              || id.includes('/scripts/collection-ui')
              || id.includes('/scripts/collection-runtime')
              || id.includes('/scripts/data-fetch')) {
              return 'collection-shared';
            }
            return undefined;
          }
        }
      }
    }
  },
  integrations: [
    sitemap({
      // Match legacy URL form so external backlinks + Search Console don't
      // see a URL change.
      serialize(item) {
        if (!item.url.endsWith('/') && !/\.[a-z]+$/.test(item.url)) {
          item.url = `${item.url}.html`;
        }
        return item;
      },
      filter: (page) => ![
        '/data-smoke',
        '/data-smoke.html'
      ].some((suffix) => page.endsWith(suffix))
    })
  ]
});
