# Source Of Truth

Status: `canonical`
Audience: `engineering`, `agents`
Purpose: `define which files own each part of the website`

## Generated Output

| Concern | Source Of Truth | Generated/Consumed By |
|---|---|---|
| Firebase deploy output | Source files plus `scripts/build-site.js` | `dist/` |
| Public HTML output | exactly one source per route: `_src/pages/*.html` or collection renderer | `dist/*.html` |
| Shared CSS output | `css/src/*.css` | `css/style.css`, `dist/assets/css/*` |
| Per-page CSS bundles | `css/src/*.css`, `scripts/build/page-manifest.js` | `css/page-*.css`, `dist/assets/css/*` |
| Hashed asset paths | `scripts/build/assets.js` | `dist/asset-manifest.json` |
| Versioned static JSON paths | generated `dist/data/*.json`, `dist/api/v1/*.json` | `dist/data/runtime-data-manifest.json` |
| Generated file manifest | `scripts/build-site.js` | `data/generated-manifest.json` |
| Route ownership allowlist | `data/source-ownership.json` | `npm run check:source` |
| Page index | public page sources, `_src/pages/`, collection data | `data/pages.json`, `dist/data/pages.json` |
| Sitemap | public page sources, `data/site.json` | `sitemap.xml`, `dist/sitemap.xml` |
| Robots | `data/site.json` | `robots.txt`, `dist/robots.txt` |
| Agent instructions | public page sources, collection data | `llms.txt`, `dist/llms.txt` |
| Primary calls to action | `data/ctas.json` | `dist/api/v1/ctas.json`, future page CTA modules |
| Field Notes audience model | `data/newsletter.json`, `_src/pages/field-notes.html` | `field-notes.html`, `dist/api/v1/newsletter.json` |
| Topic taxonomy | `data/topics.json` | `dist/api/v1/topics.json`, search/topic trails |
| Popular route geometry | `data/popular-routes.json` compact JSON | `dist/data/popular-routes.json`, adventures map |

Never hand-edit generated `dist/` files.

Generated root artifacts such as `css/style.css`, `css/page-*.css`,
`data/pages.json`, `data/generated-manifest.json`, `sitemap.xml`, and
`llms.txt` are recreated by `npm run build`. Public source lives in
`_src/pages/` plus collection renderers; topic pages are generated into
`dist/topics/` from `data/topics.json` and SEO metadata. `npm run check:repo`
prevents generated files from being accidentally staged for commit,
`npm run check:source` protects route ownership, and `npm run check:structure`
keeps legacy CSS, local screenshots, and retired admin workflow text from
creeping back in.

Production-safe product media is generated into `images/generated/products/`.
Raw `images/products/` files remain source assets and should not ship to `dist/`.

## Source Ownership

| Concern | Owner |
|---|---|
| Site identity, domain, social links, core assets | `data/site.json` |
| Deploy, CSP, external allowlist, performance budgets | `data/site.config.json` |
| Shared navigation | `_src/partials/nav.html` |
| Shared footer | `_src/partials/footer.html` |
| CSS source layers | `css/src/` |
| Shared base page layout | `_src/layouts/base.html` |
| Public page source | `_src/pages/` or collection renderers, never both for the same route |
| Books content | `data/books.json` |
| Adventures content | `data/adventures.json` |
| Essays content | `data/essays.json` |
| Skills content | `data/skills.json` |
| Quotes/ticker content | `data/quotes.json` |
| Commercial action model | `data/ctas.json` |
| Field Notes newsletter model | `data/newsletter.json` |
| Topic taxonomy | `data/topics.json` |
| Popular route geometry | `data/popular-routes.json`, kept compact because it is machine-sized route geometry |
| Page journey stage and CTA routing | `data/ctas.json`, with generated defaults in `scripts/build-site.js` |
| Public route ownership map | `data/source-ownership.json` |
| Browser behavior | `js/` |
| Build and checks | `scripts/` |
| Admin source | `admin/`, excluded from Hosting |
| Leaflet vendor runtime | `vendor/leaflet/` |

## Source Model

The active source model is:

```text
_src/
  pages/
  layouts/
  partials/
  components/
  content/
  styles/
```

Public routes are now sourced from `_src/pages/` and collection renderers, then
emitted into `dist/`. Shared chrome flows through `_src/layouts/base.html` plus
the shared partials. The old root-page migration is complete.
