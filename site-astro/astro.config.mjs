import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
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
      filter: (page) => ![
        '/data-smoke',
        '/data-smoke.html'
      ].some((suffix) => page.endsWith(suffix))
    })
  ]
});
