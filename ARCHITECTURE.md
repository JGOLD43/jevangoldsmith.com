# Website Architecture

Status: `canonical`
Audience: `engineering`, `agents`
Purpose: `describe the current static-site architecture and target evolution`

## Runtime Shape

Firebase Hosting serves generated files from `dist/`.

The public runtime contains:

- generated `.html` pages
- hashed CSS/JS/vendor assets under `dist/assets/`
- static JSON data under `dist/data/`
- static images under `dist/images/`
- `sitemap.xml` and `robots.txt`

There is no active Cloud Functions package and no `/api/**` rewrite.

## Source Shape

The source model is intentionally transitional:

- root-level `.html` files are the current authored public page source for
  unmigrated pages
- `_src/pages/*.html` files are source for migrated template-driven pages
- `_src/layouts/base.html` owns the first shared source page layout
- `_src/partials/nav.html` and `_src/partials/footer.html` own shared chrome
- `css/src/*.css` owns CSS source; `css/style.css` is generated
- `data/site.json` owns site identity, domain, social links, and core assets
- `data/site.config.json` owns deploy, CSP, external allowlist, and budgets
- `data/*.json` owns migrated collection content
- `js/` owns browser behavior
- `vendor/leaflet/` owns self-hosted Leaflet runtime assets
- `scripts/` owns build and validation logic
- `admin/` is source for a browser-based admin interface, excluded from Hosting

## Build Flow

```text
root HTML + _src pages/layouts/partials + css/src + data + js + vendor
  -> scripts/build-site.js
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

## Target Evolution

The target architecture is:

```text
_src/
  pages/
  layouts/
  partials/
  components/
  content/
  styles/
dist/
```

Move one page type at a time. The generated output should remain visually and
behaviorally equivalent unless a style/product change is explicitly requested.
