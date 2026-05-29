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

`site-astro/src/styles/legacy.src.css` is the **single source of truth**. The
shipped `site-astro/public/css/legacy-style.css` (minified) is generated from
it by `scripts/build-legacy-css.js`, which runs as the first step of
`npm run build` — so a normal build always recompiles it. **Never edit
`legacy-style.css` directly.** When dev-previewing (`npm run dev`, which serves
`public/` without recompiling), run `npm run css:build-legacy` after editing the
source. See `site-astro/src/styles/README.md` for the long-term migration plan
to scoped Astro component styles.

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

## Adding content

**Fastest way to add an entry:** scaffold a valid skeleton, then fill it in:

```bash
npm run new:essay -- "Why I Keep a Commonplace Book"
# also: new:book, new:adventure, new:podcast, new:person, new:project, new:challenge
```

This appends a correctly-shaped stub (id/slug derived from the title, required
fields filled) to the right `data/*.json`. Your editor also autocompletes and
validates these files as you type — JSON Schemas live in `schema/` and are wired
via `.vscode/settings.json` (loose collections allow extra fields, so nothing
false-flags).

All collections are hand-authored JSON in `data/`. Edit the **source** file;
the build regenerates any `*.generated.json` and the search index for you
(`npm run build` runs content:validate → books:generate → search:sync →
people:merge automatically). The pre-commit hook runs `content:validate`, which
fails on duplicate ids/slugs, missing titles, bad ISBN/URL/date, and stale
people↔title links.

| Collection | Source file | Top-level shape | id / slug from |
|---|---|---|---|
| Books | `data/books.json` | bare array | ISBN (do **not** edit `books.generated.json` — it's generated) |
| Movies | `data/movies.json` | bare array | TMDB id (Letterboxd cron + TMDB enrich populate metadata) |
| People | `data/people.json` (+ `people.profiles.json`, `people-merge-config.json`) | `{ people: [...] }` | slug from name |
| Adventures | `data/adventures.json` | `{ adventures: [...] }` | `id` |
| Essays / Podcasts / Projects / Challenges / Products / Quotes | `data/<name>.json` | named-key wrapper (see file) | `id` or slug-from-title |

Gotchas worth knowing before you add an entry:

- **Books**: add to `books.json` only. Covers resolve automatically from the
  ISBN via the remote-asset manifest; `books:generate` writes
  `books.generated.json` (what the page renders) on every build.
- **People ↔ books/movies**: links live in `people-merge-config.json`
  (`BOOK_PEOPLE` / `MOVIE_PEOPLE`), keyed by the **exact title string** from
  `books.json` / `movies.json`. If you rename a book/movie, update the key too —
  `content:validate` now errors on a stale key, but it can't auto-fix it. Person
  photos go in `images/generated/people/{slug}-{200,400,800}.jpg`.
- **Adventures**: the heaviest entry — `content` HTML, `gallery[]` with per-photo
  `src`/`caption`/`lat`/`lng`, `mapCenter`, `mapZoom`. Coordinates are currently
  hand-entered (the photo-GPS pipeline is dormant — see below).

## Dormant integrations (need one-time setup)

Two features are fully built in code but ship empty because their credentials
were never configured. Until set up, they render nothing (the UI degrades
silently):

- **Spotify podcast feed** (`data/podcast-episodes.json`, `podcast-shows.json`):
  populated by `.github/workflows/spotify-*.yml`. Needs `SPOTIFY_CLIENT_ID`,
  `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN` as repo secrets (one-time
  OAuth — see `docs/archive/SPOTIFY_PODCAST_TRACKER.md`). The podcasts page
  falls back to the curated `data/podcasts.json` picks meanwhile.
- **Adventure-map photos** (`data/photos.generated.json`): populated by
  `npm run photos:sync` (`scripts/sync-photos.js`), which reads GPS EXIF from a
  Google Drive folder. Needs a service-account key at `.secrets/drive-sa.json`
  and `GOOGLE_DRIVE_FOLDER_ID` (see `docs/photo-import.md`). Until then the map
  shows no photo markers and galleries are empty.

To **retire** either instead of finishing it, delete the empty data file(s),
the matching workflow(s)/script, and the consuming UI branch.

## Quick patterns

- New collection page: copy the pattern from podcasts.astro (DOM mode)
  or books.ts (managed mode). Both use the registries above.
- New action: add to `ACTION_NAMES`, register handler in the page's
  script, reference in markup via `data-action={ACTION_NAMES.foo}`.
- New persistent setting: add to `LOCAL_KEYS` or `SESSION_KEYS` and
  import the constant.
- New deep-link URL param: add to `URL_PARAMS` and document the
  expected value shape in the registry comment.
