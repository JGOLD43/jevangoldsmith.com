# Contributing — where things live

This document is a map. It doesn't tell you HOW to write code; it tells
you WHERE to look first so you don't have to grep 30 files to learn the
conventions.

## Registries — single sources of truth

Three runtime registries pin contracts that markup and scripts share.
Import from these instead of using string literals.

| Registry | File | What it contains |
|---|---|---|
| Actions | `site-astro/src/scripts/actions-registry.ts` | Every valid `data-action` name. Markup uses `data-action={ACTION_NAMES.foo}`; scripts register handlers via `registerActions({ [ACTION_NAMES.foo]: handler })`. Adding a new action? Add it here first. |
| Storage keys | `site-astro/src/scripts/storage-keys.ts` | Every `localStorage` + `sessionStorage` key the site writes. `LOCAL_KEYS.theme`, `SESSION_KEYS.bookFlight`, etc. Use these instead of string literals to avoid collision. |
| URL params | `site-astro/src/scripts/url-params.ts` | Every query-string param the site responds to: `URL_PARAMS.book`, `URL_PARAMS.movie`, `URL_PARAMS.focus`. Deep links are part of the public contract — adding a new one is API design. |

Inline scripts in `Base.astro` and `pages/books/[slug].astro` use string
literals because they run before module loading. They have comments
pointing back at the registries; keep them in sync.

## Data-loading patterns

Three patterns exist. Pick by collection shape:

1. **Astro content collection** — for collections defined by a single
   JSON file with stable IDs (books, movies, essays, etc.). Wire it up
   in `site-astro/src/content.config.ts` via the `jsonArrayLoader`
   helper. SSR pages call `getCollection('foo')`. **Default choice for
   new collections.**

2. **Runtime fetch from `*.generated.json`** — for collections that need
   client-side filtering/sorting against a precomputed shape. The page
   emits an inline JSON `<script>`; runtime scripts call `readInlineJson`
   with the same id. Used by books (`books.generated.json`).

3. **Merged build artifact** — for collections derived from multiple
   sources at build time. Only `people` uses this today — `merge-people.js`
   composes `people.json` + `BOOK_PEOPLE` config + `MOVIE_PEOPLE` config
   into `people.merged.generated.json`. **Don't add new merged
   collections without a strong reason.**

## Collection runtime modes

`createCollectionRuntime` in `site-astro/src/scripts/collection-runtime.ts`
serves two modes — see types in `collection-runtime-types.ts`:

- **DOM mode** (`DomCollectionConfig`): runtime owns SSR'd card
  visibility. Pages ship their cards in HTML; runtime hides/shows on
  filter+search. Used by podcasts, challenges, projects, people.
- **Managed mode** (`ManagedCollectionConfig`): caller owns rendering
  via render-callback hooks. Used by books, movies/letterboxd, essays.

The mode is determined by whether you supply `getFilteredItems`.

## CSS

`legacy-style.css` (minified, shipped) is generated from
`site-astro/src/styles/legacy.src.css`. Edit the source; run
`npm run css:build-legacy` to regenerate the minified output. See
`site-astro/src/styles/README.md` for the long-term migration plan to
scoped Astro component styles.

## Testing

- **Unit tests** (`tests/unit/*.test.js`): `node --test` with
  `--experimental-strip-types` so TS modules can be imported directly.
  Cover pure-logic functions: slugify (cross-context equivalence),
  validators (ISBN/URL/date), CLS windowing.
- **Visual diff** (Playwright `site-astro/tests/playwright/visual.spec.ts`):
  8 routes × 3 viewports (desktop 1280, tablet 768, mobile 375). Re-capture
  baselines with `UPDATE_SNAPSHOTS=1 npm run test:browser`.
- **Behavioral E2E** (Playwright): page-specific specs.
- **Lighthouse perf budget**: per-route gate in `test.yml`.
- **Post-deploy verification**: `scripts/check-live.js` runs in
  `deploy-pages.yml` after Pages deploy completes.

## Performance budgets

`scripts/check-performance-budgets.js`. Site-specific budgets
(chrome.css 75KB, adventures map chunk 120KB, etc.). PR fails if
budget regresses. Don't bump a budget casually — investigate first.

## Build pipeline

`scripts/build.js` orchestrates 13 post-Astro phases sequentially. Order
matters: purge → critical CSS → minify → SW finalize → CSP hashes go
last because every prior phase mutates HTML.

## Action dispatcher

`site-astro/src/scripts/action-dispatcher.ts`. One document-level click
listener resolves `data-action="foo"` attributes against a runtime
registry. The dispatcher logs a console warning once per unknown action
name (typo catcher). See "Registries" above for the typed name list.

## RUM

`site-astro/src/scripts/rum.ts` captures Core Web Vitals + uncaught JS
errors. Tree-shaken out unless `RUM_ENDPOINT` is set at build time:

```
RUM_ENDPOINT=https://your-receiver/api npm run build
```

Endpoints that work out of the box: Cloudflare Web Analytics, Plausible,
any HTTP POST receiver.

## Quick patterns

- New collection page: copy the pattern from podcasts.astro (DOM mode)
  or books.ts (managed mode). Both use the registries above.
- New action: add to `ACTION_NAMES`, register handler in the page's
  script, reference in markup via `data-action={ACTION_NAMES.foo}`.
- New persistent setting: add to `LOCAL_KEYS` or `SESSION_KEYS` and
  import the constant.
- New deep-link URL param: add to `URL_PARAMS` and document the
  expected value shape in the registry comment.
