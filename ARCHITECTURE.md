# Website Architecture

Status: `canonical`
Audience: `engineering`, `agents`
Purpose: `describe the current static-site architecture (Astro 6 + Tailwind v4)`

## Runtime Shape

Firebase Hosting serves generated files from `dist/`.

The public runtime contains:

- `*.html` pages built by Astro from `site-astro/src/pages/`
- hashed CSS bundle under `dist/_astro/`
- static JSON data under `dist/data/`
- static images under `dist/images/` (symlinked from project-root `images/`)
- self-hosted Chivo fonts under `dist/fonts/`
- self-hosted Leaflet under `dist/vendor/leaflet/`
- `sitemap-index.xml` + `sitemap-0.xml`, `rss.xml`, `robots.txt`, `llms.txt`

There is no active Cloud Functions package and no `/api/**` rewrite.

## Source Shape

The site is an Astro project rooted at `site-astro/`:

- `site-astro/src/pages/*.astro` — public page sources
  - top-level pages: `about.astro`, `books.astro`, `essays.astro`, etc.
  - dynamic routes: `people/[slug].astro`, `adventure-[slug].astro`, `topics/[slug].astro`
  - `rss.xml.ts` for the essays RSS feed
- `site-astro/src/layouts/Base.astro` — shared HTML layout (head, nav, footer, JSON-LD)
- `site-astro/src/components/` — Nav, Footer, JsonLd, SeoRelated, plus the
  Phase 3 collection wrappers `CollectionPage.astro` and
  `TaskCollectionPage.astro` that thin out the per-page boilerplate
- `site-astro/src/content.config.ts` — Zod schemas + custom loaders that read `../data/*.json` directly (no copy)
- `site-astro/src/lib/seo.ts` — schema.org Person / WebSite descriptors
- `site-astro/src/lib/content-types.ts` — Phase 2 normalized collection types
  (`NormalizedItem`, `COLLECTION_CONTRACTS`)
- `site-astro/src/lib/collection-normalizers.ts` — pure normalizers per
  collection plus `isPublished` / `collectionUrl` / `collectionImage` /
  `collectionDescription` / `collectionSearchText` helpers
- `site-astro/src/lib/collection-chrome.ts` — string-template chrome renderer
  used by `CollectionPage.astro` and `TaskCollectionPage.astro`
- `site-astro/src/styles/` — Tailwind v4 entry, design tokens, fonts, transitional chrome-legacy.css and pages-legacy.css
- `data/*.json` — source of truth for books, movies, people, essays, podcasts, adventures, etc. Read by both Astro and the (archived) legacy build
- `images/` — source + generated image variants (symlinked into `site-astro/public/images/`)
- `fonts/chivo/` — self-hosted Chivo font (symlinked into `site-astro/public/fonts/`)
- `vendor/leaflet/` — self-hosted Leaflet (copied into `site-astro/public/vendor/`)
- `scripts/` — enrichment + sync scripts (Letterboxd, Spotify, TMDB), content
  guard (`validate-content.js`), performance budgets, and smoke harness
  (`smoke-check.js`)
- `admin/` — browser-based admin interface, excluded from Hosting

## Build Flow

```text
data/*.json + site-astro/src/* + images/ + fonts/ + vendor/
  -> Astro 6 build (npm run build)
  -> Tailwind v4 (via @tailwindcss/vite)
  -> dist/<route>.html, dist/_astro/<hash>.css, dist/sitemap-*.xml, dist/rss.xml
```

Build time: ~4s for 82 routes. Legacy was ~30s.

`dist/` is generated and should not be hand-edited.

## Build Pipeline (post-Astro)

`npm run build:fast` chains:

1. `content:validate` — fails on duplicate ids/slugs and missing published
   titles in source JSON; warns on missing description/image until cleanup
   (`content:validate:strict` flips warnings to errors).
2. `routes:split` — explodes `popular-routes.json` into per-route chunks.
3. `astro build` — page HTML + asset graph.
4. `normalize:html`, `bundle:js`, `purge:css`, `prune:dist` — compatibility
   layer that lives until Phase 7 retires each piece.
5. `perf:budget` — fails the build if any production budget regresses.

Browser smoke harness (`npm run smoke`) hits a running dev server (or any
`BASE_URL`) and asserts stable structural anchors per page.

## Checks

Run all local health checks:

```bash
npm run check
```

The check suite validates:

- generated build output
- JavaScript syntax (Biome)
- content JSON and sitemap coverage
- local links inside `dist/`
- Firebase deploy-surface safety
- canonical docs presence and key source-of-truth rules

## Parity Harness

`tests/` contains a four-layer parity harness used to detect regressions
between builds (legacy ↔ Astro, or Astro release ↔ release):

| Fixture | Locks | Capture | Check |
|---|---|---|---|
| `seo-fixture.json` | `<head>` per page (title, meta, og, twitter, canonical, JSON-LD) | `npm run check:seo:capture` | `npm run check:seo` |
| `content-fixture.json` | heading outline, link/image counts, word count, data-action surface, landmarks | `npm run check:content:capture` | `npm run check:content` |
| `visual-baselines/` | PNG SHA-256 at desktop / tablet / mobile | `npm run check:visual:capture` | `npm run check:visual` |
| `perf-baseline.json` | load timing + bytes by asset class per page | `npm run check:perf:capture` | `npm run check:perf` |

Capture every layer in one shot:

```bash
npm run check:parity:capture
```

## Site-Wide Config

`data/site.json` owns site identity (domain, social links, core assets).
`data/site.config.json` owns deploy / CSP / external allowlist (consumed by
the legacy build; the Astro build embeds the relevant subset directly in
`site-astro/src/lib/seo.ts` and `firebase.json`).

## Security Boundary

Firebase Hosting is the public serving layer. `admin/**` is intentionally
ignored by Hosting deploys. Firestore denies all non-admin documents and only
allows the configured admin email to access `/admin/**`.

The admin UI still runs in the browser. Do not treat client-side two-factor
checks as a backend authorization boundary. Any future write-capable admin
actions should move behind Cloud Functions or another server-side API that
verifies Firebase ID tokens and second-factor state before writing data.

## Evolution Rule

After Phase 11 cleanup, retire `chrome-legacy.css` and `pages-legacy.css`
(currently inlined for visual parity) by migrating every chrome rule to
Tailwind utilities or `@layer components` in `site-astro/src/styles/`.
That cuts the CSS bundle from ~166KB to a target of ~15KB.

For new pages, write Astro components that use Tailwind utilities directly.
Do not append to the legacy stylesheets.
