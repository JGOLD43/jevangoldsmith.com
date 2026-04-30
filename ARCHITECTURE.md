# Website Architecture

Status: `canonical`
Audience: `engineering`, `agents`
Purpose: `describe the current static-site architecture and target evolution`

## Runtime Shape

Firebase Hosting serves generated files from `dist/`.

The public runtime contains:

- generated `.html` pages
- hashed CSS/JS/vendor assets under `dist/assets/`
- hashed per-page JS bundles under `dist/assets/js/bundles/`
- static JSON data under `dist/data/`
- static images under `dist/images/`
- `sitemap.xml` and `robots.txt`

There is no active Cloud Functions package and no `/api/**` rewrite.

## Source Shape

The root-page migration is complete. Public route source now lives in `_src/`,
collection renderers, and data files:

- `_src/pages/*.html` files are source for template-driven pages
- `_src/layouts/base.html` owns the shared source page layout
- `_src/partials/nav.html` and `_src/partials/footer.html` own shared chrome
- `_src/collections/*` owns collection-specific partials used by generated
  collection pages
- `css/src/*.css` owns CSS source; `css/style.css` is generated
- `data/site.json` owns site identity, domain, social links, and core assets
- `data/site.config.json` owns deploy, CSP, external allowlist, and budgets
- `data/*.json` owns collection content and generated-data inputs
- `js/` owns browser behavior
- `vendor/leaflet/` owns self-hosted Leaflet runtime assets
- `scripts/` owns build and validation logic
- `admin/` is source for a browser-based admin interface, excluded from Hosting

## Build Flow

```text
_src pages/layouts/partials/collections + collection renderers + data + css/src + js + vendor
  -> scripts/build-site.js
  -> focused helpers in scripts/build/
  -> css/style.css
  -> data/pages.json
  -> sitemap.xml / robots.txt
  -> dist/
```

`dist/` is generated and should not be hand-edited.

## Checks

Run all local health checks:

```bash
npm run check
```

The check suite validates:

- generated build output
- JavaScript syntax
- content JSON and sitemap coverage
- local links inside `dist/`
- Firebase deploy-surface safety
- performance budgets
- canonical docs presence and key source-of-truth rules

## Site-Wide Config

After editing `data/site.json`, run:

```bash
node scripts/sync-site-config.js
```

After editing deploy/security/performance rules in `data/site.config.json`, run:

```bash
npm run build
npm run check
```

## Security Boundary

Firebase Hosting is the public serving layer. `admin/**` is intentionally ignored
by Hosting deploys. Firestore denies all non-admin documents and only allows the
configured admin email to access `/admin/**`.

The admin UI still runs in the browser. Do not treat client-side two-factor
checks as a backend authorization boundary. Any future write-capable admin
actions should move behind Cloud Functions or another server-side API that
verifies Firebase ID tokens and second-factor state before writing data.

## Evolution Rule

Move behavior into shared renderers and controllers one page family at a time.
Generated output should remain visually and behaviorally equivalent unless a
style/product change is explicitly requested.

Generated collection page configuration is split by concern:

- `scripts/build/collection-config.js` owns page-level layout and script wiring
- `scripts/build/collection-sections.js` owns sidebar section data and icon keys
- `scripts/build/task-list-config.js` owns projects/challenges task-list config
- `scripts/build/js-manifest.js` owns the source scripts that become per-page JS
  bundles in generated output

The collection runtime path is now:

```text
generated collection HTML
  -> dist/assets/js/bundles/page-*.js
  -> js/collection-runtime.js
  -> page modules such as js/projects.js, js/challenges.js, js/people.js,
     js/podcasts.js, js/books.js, js/letterboxd.js, or js/essays.js
```

Use `js/collection-runtime.js` for searchable/filterable card grids and managed
data collections. Keep page-specific modules for genuinely unique behavior such
as books modals, movie stats, essay previous/next navigation, or adventure maps.
