# Source Of Truth

Status: `canonical`
Audience: `engineering`, `agents`
Purpose: `define which files own each part of the website`

## Generated Output

| Concern | Source Of Truth | Generated/Consumed By |
|---|---|---|
| Firebase deploy output | Source files plus `scripts/build-site.js` | `dist/` |
| Public HTML output | exactly one source per route: root `.html`, `_src/pages/*.html`, or collection renderer | `dist/*.html` |
| Shared CSS output | `css/src/*.css` | `css/style.css`, `dist/assets/css/*` |
| Per-page CSS bundles | `css/src/*.css`, `scripts/build-site.js` bundle map | `css/page-*.css`, `dist/assets/css/*` |
| Hashed asset paths | `scripts/build-site.js` | `dist/asset-manifest.json` |
| Generated file manifest | `scripts/build-site.js` | `data/generated-manifest.json` |
| Route ownership allowlist | `data/source-ownership.json` | `npm run check:source` |
| Page index | public page sources, `_src/pages/`, collection data | `data/pages.json`, `dist/data/pages.json` |
| Sitemap | public page sources, `data/site.json` | `sitemap.xml`, `dist/sitemap.xml` |
| Robots | `data/site.json` | `robots.txt`, `dist/robots.txt` |
| Agent instructions | public page sources, collection data | `llms.txt`, `dist/llms.txt` |
| Primary calls to action | `data/ctas.json` | `dist/api/v1/ctas.json`, future page CTA modules |
| Field Notes audience model | `data/newsletter.json`, `_src/pages/field-notes.html` | `field-notes.html`, `dist/api/v1/newsletter.json` |
| Topic taxonomy | `data/topics.json` | `dist/api/v1/topics.json`, search/topic trails |

Never hand-edit generated `dist/` files.

Generated root artifacts such as `css/style.css`, `css/page-*.css`,
`data/pages.json`, `data/generated-manifest.json`, `sitemap.xml`, and
`llms.txt` are recreated by `npm run build`. Treat tracked legacy root HTML as
source only until that page is migrated to `_src/pages/` or a collection
renderer. After migration, the root copy is removed and only `dist/*.html` is
generated. `npm run check:repo` prevents generated files from being
accidentally staged for commit, `npm run check:source` prevents root and
`_src/pages/` from owning the same route, and `npm run check:structure` keeps
legacy CSS, local screenshots, and retired admin workflow text from creeping
back in.

## Source Ownership

| Concern | Owner |
|---|---|
| Site identity, domain, social links, core assets | `data/site.json` |
| Deploy, CSP, external allowlist, performance budgets | `data/site.config.json` |
| Shared navigation | `_src/partials/nav.html` |
| Shared footer | `_src/partials/footer.html` |
| CSS source layers | `css/src/` |
| Shared base page layout | `_src/layouts/base.html` |
| Public page source | root `.html` files or `_src/pages/`, never both for the same route |
| Books content | `data/books.json` |
| Adventures content | `data/adventures.json` |
| Essays content | `data/essays.json` |
| Skills content | `data/skills.json` |
| Quotes/ticker content | `data/quotes.json` |
| Commercial action model | `data/ctas.json` |
| Field Notes newsletter model | `data/newsletter.json` |
| Topic taxonomy | `data/topics.json` |
| Page journey stage and CTA routing | `data/ctas.json`, with generated defaults in `scripts/build-site.js` |
| Inline style/script ratchet baseline | `data/inline-ratchet.json` |
| Public route ownership map | `data/source-ownership.json` |
| Browser behavior | `js/` |
| Build and checks | `scripts/` |
| Admin source | `admin/`, excluded from Hosting |
| Leaflet vendor runtime | `vendor/leaflet/` |

## Migration Direction

The target source model is:

```text
_src/
  pages/
  layouts/
  partials/
  components/
  content/
  styles/
```

Root `.html` files remain valid source until a page has been migrated into
`_src/pages/` and the generated output is proven equivalent. Once migrated, the
root source file is deleted; the build still emits the route into `dist/`.

Currently migrated:

- `reading-philosophy.html` is sourced from `_src/pages/reading-philosophy.html`
  through `_src/layouts/base.html`.
- `start-here.html` is sourced from `_src/pages/start-here.html` through
  `_src/layouts/base.html`.
- `index.html`, `field-notes.html`, and `weekly-review-template.html` are now
  sourced from `_src/pages/` through `_src/layouts/base.html`.
