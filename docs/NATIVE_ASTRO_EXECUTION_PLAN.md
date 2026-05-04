# Native Astro Modernization Execution Plan

Status: `execution-plan`
Audience: `engineering`, `agents`
Purpose: `convert the optimized Astro refactor into a cleaner, more native Astro codebase without changing visuals, URLs, or user behavior`

## Goal

The site is already built by Astro, but it still carries legacy compatibility layers:

- ordered browser globals in `js/`
- manual post-build JS bundling
- HTML normalization
- conservative CSS purge/post-processing
- source/generated asset pruning
- page-specific runtime JSON assumptions

The goal is to move the site toward a fully native Astro static architecture while preserving the current production experience exactly.

Target outcomes:

- `30-60%` faster future content and page development
- `40-70%` lower regression risk
- `40-70%` less global JS and data-shape complexity
- `5-20%` extra runtime performance improvement on converted pages
- `0` visual, URL, SEO, or interaction regressions

## Definition Of Done

The modernization is done when:

- Astro source owns page HTML directly, with no required post-build HTML mutation.
- Vite/Astro owns page JS bundling instead of `scripts/bundle-page-scripts.js`.
- Browser JS uses explicit module imports instead of ordered globals.
- Shared collection pages use shared Astro components and typed data contracts.
- Runtime JSON exists only where the browser needs dynamic data.
- Build checks validate content, assets, budgets, and key interactions.
- Existing visuals, behavior, URLs, JSON-LD, RSS, sitemap, and hosting headers remain equivalent.

Keeping asset generation, route chunk generation, performance budgets, and deploy checks is fine. Those are normal production build tools and do not prevent the site from being native Astro.

## Current Baseline

Current useful wins already in place:

- production asset pruning
- immutable cache headers for generated/hashable assets
- localized remote home images
- Adventures async map bundle
- generated popular-route chunks
- production performance budget checks
- clean Astro content config: `0 errors`, `0 warnings`, `0 hints`

Current measured Adventures baseline:

- map ready: about `300-350ms`
- route overlays ready: about `1.3s`
- main Adventures bundle: about `62.5KB`
- async Adventures map bundle: about `29.1KB`

## Operating Rules

1. Preserve visuals and behavior.
2. Work in small, reversible slices.
3. Do not delete compatibility tooling until source code no longer depends on it.
4. Every phase must pass:
   - `npm run build:fast`
   - `npm run --prefix site-astro astro check`
   - `npm run lint`
   - browser smoke checks for touched pages
5. Use generated `dist/` only for verification. Do not hand-edit it.
6. If a refactor increases uncertainty, add a validation check before continuing.

## Phase 1: Architecture And Content Guardrails

Purpose: make the site easier to understand before deeper refactors.

Work:

- Update `ARCHITECTURE.md` to reflect the current build reality:
  - Astro pages/components
  - browser JS
  - source data
  - generated data
  - asset pipeline
  - deploy/output boundaries
- Add or update content workflow docs:
  - how to add a book
  - how to add a person profile
  - how to add an adventure
  - how to add a product/resource/project
  - how images are generated and referenced
- Expand build validation for:
  - duplicate IDs/slugs
  - missing required images for published content
  - missing titles/descriptions
  - unexpected remote runtime images
  - oversized runtime JSON

Acceptance criteria:

- A new contributor/agent can identify the right file for common edits.
- Published content mistakes fail locally before deploy.
- Existing build/perf checks still pass.

Expected impact:

- `30-50%` faster build/content issue diagnosis
- `60-90%` lower accidental production bloat risk

## Phase 2: Normalize Collection Data Contracts

Purpose: remove one-off data assumptions across collection pages.

Work:

- Create shared types in `site-astro/src/lib/content-types.ts`.
- Define a normalized base content shape:
  - `id`
  - `slug`
  - `title`
  - `url`
  - `status`
  - `description`
  - `image`
  - `srcset`
  - `searchText`
  - `tags`
- Add helpers:
  - `isPublished`
  - `collectionUrl`
  - `collectionImage`
  - `collectionDescription`
  - `collectionSearchText`
- Normalize these collections first:
  - books
  - people
  - movies
  - podcasts
  - products
  - adventures
  - projects
  - challenges

Deliverables:

- `site-astro/src/lib/content-types.ts` with shared collection interfaces.
- `site-astro/src/lib/collection-normalizers.ts` with pure normalization helpers.
- A per-collection mapping table that shows:
  - source file
  - normalized fields
  - required fields for published items
  - runtime fields still needed by browser JS
- Content validation that fails on duplicate IDs, duplicate slugs, missing published images, and missing published descriptions.

Migration tracker:

| Collection | Source | Normalized Contract | Runtime Manifest Reviewed | Done |
|---|---|---:|---:|---:|
| Books | `data/books.json`, `data/books.generated.json` | yes (helper) | no | no |
| People | `data/people.json`, `data/people.profiles.json` | yes (helper) | no | no |
| Movies | `data/movies.json` | yes (helper) | no | no |
| Podcasts | `data/podcasts.json` | yes (helper) | no | no |
| Products | `data/products.json` | yes (helper) | no | no |
| Adventures | `data/adventures.json` | yes (helper) | partial | no |
| Projects | `data/projects.json` | yes (helper) | no | no |
| Challenges | `data/challenges.json` | yes (helper) | no | no |

Phase 2 status:

- `site-astro/src/lib/content-types.ts` — shared `NormalizedItem`, `CollectionContract`,
  and a per-collection `COLLECTION_CONTRACTS` table listing required fields and
  runtime fields.
- `site-astro/src/lib/collection-normalizers.ts` — pure normalizer per collection
  (`normalizeBook`, `normalizePerson`, `normalizeMovie`, `normalizePodcast`,
  `normalizeProduct`, `normalizeAdventure`, `normalizeProject`,
  `normalizeChallenge`) + `isPublished`, `collectionUrl`, `collectionImage`,
  `collectionDescription`, `collectionSearchText` helpers.
- `scripts/validate-content.js` — fails build on duplicate ids, duplicate
  explicit slugs, and missing published titles. Strict mode (`npm run
  content:validate:strict`) also fails on missing description/image; default
  mode logs those as warnings until source data is cleaned up.
- Wired into `npm run build` and `npm run build:fast` (runs first, fast feedback).
- Currently surfaced warnings: 110 books missing `shortDescription`/`review`.

Pages have not been migrated to read normalized fields yet — this slice
deliberately keeps page rendering untouched so the contract can land without
visual risk. Page migrations land alongside Phase 3 shared components.

Acceptance criteria:

- Collection pages read normalized fields wherever possible.
- Existing page output remains equivalent.
- Content validation catches missing required normalized fields.

Expected impact:

- `40-70%` reduction in one-off data-shape assumptions
- `30-60%` lower broken card/image/filter risk

## Phase 3: Shared Collection Components

Purpose: reduce duplicated markup and make future collection work faster.

Work:

- Create shared Astro components where output can remain identical:
  - `CollectionShell.astro`
  - `CollectionGrid.astro`
  - `CollectionCard.astro`
  - `CollectionFilterBar.astro`
  - `CollectionEmptyState.astro`
- Move repeated page structures into shared components gradually.
- Preserve existing class names where CSS and JS depend on them.
- Start with lower-risk pages:
  - projects
  - challenges
  - podcasts
  - essays
- Then handle higher-risk pages:
  - books
  - people
  - movies
  - products/resources

Deliverables:

- Shared components with narrow, stable APIs:
  - `CollectionShell.astro`: page header, subtitle, counts, optional toolbar slot.
  - `CollectionGrid.astro`: layout wrapper, empty state slot, stable class hooks.
  - `CollectionCard.astro`: generic card only where visual output truly matches.
  - `CollectionFilterBar.astro`: reusable filter/search shell, not page-specific logic.
  - `CollectionEmptyState.astro`: consistent empty/result states.
- Page-specific card components remain where visuals or behavior are genuinely distinct:
  - `BookCard`
  - `MovieCard`
  - `PersonCard`
  - `ProductCard`
- A short component decision rule:
  - extract shared layout when markup repeats
  - keep page-specific cards when abstraction would create boolean-prop sprawl
  - preserve current class names until CSS/JS dependencies are migrated

Migration tracker:

| Page | Shared Shell | Shared Grid | Shared Filter Shell | Page-Specific Card Kept | Done |
|---|---:|---:|---:|---:|---:|
| Projects | yes (TaskCollectionPage) | n/a | inherited | yes | partial |
| Challenges | yes (TaskCollectionPage) | n/a | inherited | yes | partial |
| Podcasts | yes (CollectionPage) | inherited | inherited | yes | partial |
| Essays | yes (CollectionPage) | inherited | inherited | yes | partial |
| Books | yes (CollectionPage) | inherited | inherited | yes | partial |
| People | yes (CollectionPage) | inherited | inherited | yes | partial |
| Movies | yes (CollectionPage) | inherited | inherited | yes | partial |
| Products/resources | no | no | no | yes | no |

Phase 3 status (slice 1 — thin Astro wrappers):

- `site-astro/src/components/CollectionPage.astro` — wraps Base + chrome
  rendering for collection pages.
- `site-astro/src/components/TaskCollectionPage.astro` — wraps Base + task-list
  rendering for projects/challenges.
- Migrated pages: `books`, `movies`, `people`, `podcasts`, `essays`, `projects`,
  `challenges`. Output is byte-identical (same `renderCollectionMain` /
  `renderTaskListMain` calls under the hood).
- Verified live via dev server at /books, /movies, /people, /podcasts,
  /essays, /projects, /challenges (all 200, main + footer present).
- Future slice will replace the `renderCollectionMain` string-template chrome
  with native Astro markup + slots so the shell becomes editable per-page
  without growing boolean-prop sprawl. That requires class-name parity
  testing and is gated on the smoke harness from Phase 10.

Acceptance criteria:

- Generated HTML is visually equivalent.
- Filter/modal behavior still works.
- Page-specific customizations remain possible without branching the component too heavily.

Expected impact:

- `30-60%` duplicate rendering reduction
- `20-50%` fewer files touched for typical collection changes

## Phase 4: Adventures Feature Module Cleanup

Purpose: make the most complex page safer to change.

Work:

- Move Adventures browser code into a feature directory, for example:
  - `site-astro/src/features/adventures/state.ts`
  - `site-astro/src/features/adventures/data.ts`
  - `site-astro/src/features/adventures/list.ts`
  - `site-astro/src/features/adventures/map.ts`
  - `site-astro/src/features/adventures/detail.ts`
  - `site-astro/src/features/adventures/filters.ts`
- Replace shared globals with a small controller/state object.
- Keep current async map loading and route chunk loading.
- Keep overlay data loading together in parallel after map boot.
- Preserve:
  - list rendering
  - sidebar count
  - map markers
  - route overlays
  - POIs
  - countries layer
  - detail overlay
  - mobile list/map toggle

Acceptance criteria:

- Browser check confirms:
  - map markers render
  - all route overlays load
  - controls exist
  - selecting an adventure still pans/opens detail
  - no console errors

Expected impact:

- `50-80%` lower Adventures script-order/global regression risk
- `30-50%` faster future Adventures work
- small runtime smoothness improvement from clearer module boundaries

## Phase 5: Convert Browser JS To ES Modules

Purpose: retire ordered global scripts and make dependencies explicit.

Work:

- Convert browser JS page family by page family.
- Start with pages that are now modular or low-risk:
  - Adventures
  - quotes
  - projects
  - challenges
  - products/resources
- Then convert heavier collections:
  - books
  - people
  - movies
  - podcasts
- Replace manual global dependencies with imports/exports.
- Let Vite produce hashed page bundles.
- Retire corresponding entries from `scripts/bundle-page-scripts.js` only after each page is native.

Acceptance criteria:

- Converted pages no longer rely on ordered `/js/*.js` globals.
- Bundle output remains hashed/cacheable.
- Existing interactions still pass browser smoke checks.

Expected impact:

- `40-70%` reduction in global JS complexity
- `50-80%` lower script-order bug risk
- `10-25%` lower JS parse/eval on pages where dead code falls away

## Phase 6: Runtime Data Simplification

Purpose: send less JSON and make browser data contracts intentional.

Work:

- Audit runtime fetches page by page.
- For each collection page, classify data as:
  - build-time render data
  - filter/search data
  - modal/detail data
  - genuinely dynamic data
- Render stable card data in Astro HTML.
- Generate small page-specific manifests for dynamic interactions.
- Add budget checks for each runtime manifest.

Priority pages:

1. books
2. people
3. movies
4. podcasts
5. search

Acceptance criteria:

- Initial card rendering does not depend on client JSON.
- Filter/search/modal behavior remains equivalent.
- Runtime JSON files contain only fields used in the browser.

Expected impact:

- `10-40%` lower runtime JSON on converted pages
- `10-30%` lower initial transfer on some collection pages
- less main-thread data parsing

## Phase 7: Retire Compatibility Build Scripts

Purpose: remove hidden post-build transformations after source code owns the output.

Work:

- Audit each build script and mark it as:
  - keep permanently
  - replace with Astro/Vite source behavior
  - remove after migration
- Candidates to retire:
  - `scripts/normalize-astro-html.js`
  - `scripts/bundle-page-scripts.js`
  - parts of CSS purge/post-processing if native CSS ownership replaces it
- Candidates to keep:
  - asset optimization
  - route chunk generation
  - production pruning/assertions
  - performance/content budgets

Compatibility retirement checklist:

| Layer | Current Owner | Native Target | Retirement Gate | Status |
|---|---|---|---|---|
| HTML normalization | `scripts/normalize-astro-html.js` | Astro page/component source | built HTML is correct before post-processing | keep |
| JS bundling | `scripts/bundle-page-scripts.js` | Vite/Astro module graph | converted pages import explicit modules | keep |
| Page script manifest | `site-astro/src/lib/page-scripts.ts` | Astro component imports / Vite entries | no ordered global scripts remain for migrated pages | keep |
| CSS purge | `scripts/purge-css-per-page.js` | native scoped/component CSS ownership | CSS output remains small without post-build purge | keep |
| Dist pruning | `scripts/prune-dist-assets.js` | explicit deploy asset boundary | keep as production safety guard | keep |
| Asset optimization | `scripts/optimize-assets.js` | generated asset pipeline | keep unless Astro asset pipeline fully replaces it | keep |

Retirement rule:

Do not delete a compatibility layer in the same change that introduces its replacement unless the affected surface is one page and the browser smoke check covers it. Prefer a two-step process:

1. Native source takes ownership while compatibility remains harmless.
2. Remove compatibility after verification proves it is no longer doing work.

Acceptance criteria:

- Removing a compatibility script does not change generated page behavior.
- Build is simpler and easier to explain.
- Guardrails still catch asset and data regressions.

Expected impact:

- `30-50%` reduction in build pipeline complexity
- `30-60%` faster build failure diagnosis

## Phase 8: Search And Index Pipeline Cleanup

Purpose: make search consume the same normalized data as pages.

Work:

- Generate one canonical search index from normalized collections.
- Use shared collection metadata helpers.
- Validate that every published searchable item has:
  - title/name
  - URL
  - type
  - description/search text
- Keep current search UI and behavior.

Acceptance criteria:

- Search returns equivalent results for existing queries.
- New content appears in search automatically when it is published.
- Search index has a budget.

Expected impact:

- `30-50%` simpler search/content indexing
- lower risk of published content missing from search

## Phase 9 Status (in flight)

- Removed unreferenced `js/search.js` (search uses `search-astro.js` and
  is the only page that fetched the legacy file). Verified via `rg` over
  page-scripts manifest, all `.html`, `.json`, `.js`, `.ts`. Build remains
  green.

## Phase 4 Status (additive namespace surfaces — 6 collection pages)

- `js/adventures-runtime.js` exposes `window.AdventuresState`,
  `window.AdventuresUrls`, `window.AdventuresConstants` via lazy getters
  that proxy to the existing script-scope `let` declarations. Bare-global
  consumers (`adventures-ui.js`, `adventures-map.js`, `adventures.js`,
  `adventures-map-loader.js`) keep working unchanged.
- `js/people.js` exposes `window.PeopleState` (cards, runtime, byId,
  lastFocused).
- `js/podcasts.js` exposes `window.PodcastsState` (runtime).
- `js/books.js` exposes `window.BooksState` (the existing `booksState`
  IIFE state container).
- `js/letterboxd.js` exposes `window.MoviesState` (the existing
  `movieState` IIFE state container).
- `js/essays.js` exposes `window.EssaysState` (runtime accessor).
- Verified live and in dist bundles: each namespace appears in exactly
  one page bundle, no console errors, page counters match source data
  (7 adventures, 98 people, 122 books, 6 movies).
- These give future feature-module migration a stable, type-checkable
  import target without retiring the existing script-concat bundle.

## Phase 8 Status (slice 1 — coverage audit)

- Added `scripts/audit-search-index.js` (`npm run search:audit`).
  Cross-checks `site-astro/public/api/v1/search-index.json` against
  published items across adventures, projects, people, podcasts, books,
  movies. Honors the per-page visibility filter
  (`status !== 'draft|private|retired'`, `visibility !== 'private'`).
- Initial audit surfaces 28 published items missing from the curated
  index: 12 people, 10 podcasts, 6 movies. Adventures (7/7), projects
  (5/5), books (122/122) are fully indexed.
- The audit does NOT mutate the index and is non-fatal by default; the
  `--strict` flag fails on coverage gaps and is wired into `build` /
  `build:fast` so new content cannot ship without an index entry.
- Sync slice (Phase 8 / slice 2): `scripts/sync-search-index.js`
  (`npm run search:sync`) generates records for people / podcasts / movies
  from source JSON using the same record schema as
  adventures/projects/books and merges them into the curated index.
  Idempotent (deduplicates by `${type}:${title}`). Took the index from
  261 → 289 records, raised coverage to 100% across all collections.
- Verified live: search for "naval" returns book + person + podcast +
  page; "lawrence" returns the new movie record; `people` filter shows
  12 results matching the source data exactly.
- Index size grew from 130KB → 170KB; well under the 240KB budget.

## Phase 5 Status (slice 1 — first native module)

- Migrated `quotes.astro` to a native Astro `<script>` module that owns
  the filter logic. Astro/Vite emits an inlined or fingerprinted
  `<script type="module">` and the post-build bundler leaves it alone
  (it only rewrites `<script src="/js/X.js">` tags).
- Dropped `quotes.html` from `PAGE_SCRIPTS` and removed the `page-quotes`
  bundle from `scripts/bundle-page-scripts.js`. `quotes.html` now uses
  the shared `page-common` bundle (theme + analytics) plus the inline
  filter module.
- Verified live on dev (4321) + dist (8765):
  - 22 quote cards, 7 filter buttons (unchanged).
  - Click `business` filter → 4 visible; `All Quotes` → 22 visible.
  - `dist/quotes.html` no longer contains any reference to
    `/js/collection-filters.js`.
- Phase 9 follow-on: `js/collection-filters.js` removed entirely
  (was its only consumer).
- Future slice: apply the same pattern to other low-risk pages
  (`important-or-not`, `cool-shit`, `videos`) once each is browser-smoked.

### Phase 5 slice 12 + Phase 7 slice 8 — adventures + bundle-page-scripts.js retired

After every page except adventures was on Vite-emitted modules, the
adventures pile finally got its rewrite:

- All 4 main files (`adventures-runtime`, `adventures-map-loader`,
  `adventures-ui`, `adventures`) concatenated into a single
  `site-astro/src/scripts/adventures.js` ES module.
- `adventures-map.js` became a separate module dynamically imported
  via `import('./adventures-map.js')` so Vite produces a code-split
  chunk under `dist/_astro/`.
- A one-shot codemod (`scripts/convert-adventures-to-globalthis.js`)
  rewrote 27 top-level `let X = Y` state declarations to
  `globalThis.X = Y` and 30+ bare reassignments `X = Y` to
  `globalThis.X = Y`. Bare reads (`mapFilters.basemap`,
  `allAdventures.length`) keep working because property access on
  `globalThis` resolves through the same scope chain.
- The duplicate `function highlightAdventureOnMap` and
  `function clearMapHighlight` declarations from
  `adventures-map-loader` (proxy versions) were removed; the ui
  versions handle both first-load and post-load paths via
  `loadAdventuresMapBundle`.
- A small bind block at the top of the 8 collection-script modules
  (`books`, `essays`, `people`, `letterboxd`, `movie-stats`,
  `podcasts`, `search-astro`, `adventures`) destructures
  `{ escapeHTML, escapeAttr, sanitizeUrl, sanitizeHTML } = window`
  so bare references — `${escapeAttr(book.title)}`, etc. — resolve
  to module-local `const` bindings instead of relying on
  globalThis lookup (which strict-mode modules don't always honor for
  reads).
- Verified live on dev + dist: 7 adventures, counter 7,
  `window.AdventuresState.adventures.length === 7`,
  `<script src="/js/...">` tags zero, `dist/assets/js/bundles/` gone.

Final state of legacy infrastructure:

- `js/` directory: empty (was 33 files at start of session).
- `scripts/bundle-page-scripts.js`: deleted (was 165 lines).
- `bundle:js` step: removed from `npm run build` and `build:fast`.
- `dist/assets/js/bundles/`: no longer created.

The site is now 100% on Vite-emitted Astro modules + the existing
post-build pipeline (normalize-html, purge-css, prune-dist, perf:budget).

### Phase 7 slices 3–6 — bundler retirement

After Phase 5 collapsed every per-page JS to native modules, the shared
infra files (`grid-zoom`, `collection-ui`, `collection-runtime`,
`collection-helpers`, `data-fetch`, `action-dispatcher`, `task-list`,
`sanitize`, `theme`, `analytics`) were all converted in the same pattern:
copy to `site-astro/src/scripts/`, import explicitly from each consumer's
`<script>` block, drop from `page-scripts.ts` PAGE_SCRIPTS and from
`bundle-page-scripts.js` BUNDLES.

For `sanitize.js`, free identifiers (`escapeHTML`, `escapeAttr`,
`sanitizeUrl`) consumed by other scripts as bare names had to keep working
even though ES modules don't share script-tag scope. Solution: append
`window.escapeHTML = escapeHTML;` etc. in `sanitize.js`. Free identifiers
in modules fall through to the global object, so the existing references
keep resolving.

`theme.js` + `analytics.js` are now imported once from `Base.astro` —
they run on every page automatically without per-page wiring.

Final state:

- 3 legacy bundles remain: `page-adventures` (cross-script-globals,
  deferred), `page-adventures-map` (lazy-loaded, deferred with adventures),
  `page-essays` (DOMPurify, not ES-module-friendly).
- 16 bundles retired entirely (page-common, page-home, page-field-notes,
  page-search, page-videos, page-cool-shit, page-important-or-not,
  page-dateme, page-adventure-detail, page-books, page-movies, page-essays
  shrunk to dompurify only, page-people, page-podcasts, page-projects,
  page-challenges, page-products-resources, page-quotes).
- Legacy `js/` directory: 33 → 7 files (5 adventures-* + analytics +
  theme; analytics + theme retained for the legacy adventures bundle).
- `bundle-page-scripts.js` config shrunk from ~70 lines of bundle map +
  page mapping to ~10.
- Verified live: every collection page + home + search + dateme renders
  correctly, all `window.JG*` namespaces register, `data-theme=dark`
  applies, no legacy `<script src="/js/X.js">` tags appear in built HTML
  for migrated pages.

### Phase 5 slices 3–17 — collection + interactive pages

Each pattern: copy the legacy `/js/X.js` into `site-astro/src/scripts/X.js`,
update the page's `.astro` to `<script>import '../scripts/X.js';</script>`,
drop the entry from `page-scripts.ts` PAGE_SCRIPTS and from
`bundle-page-scripts.js` BUNDLES, then delete the original `/js/X.js`. Each
file with `document.addEventListener('DOMContentLoaded', X)` was rewritten
to a guarded form because ES modules execute later than classic deferred
scripts and DCL may have already fired.

Pages converted (verified live on dev + dist):

- slice 3: `cool-shit` (286 lines)
- slice 4: `videos` (109 lines + inlined sanitize helpers)
- slice 5: `projects` (bootstrap + JGTaskList consumer)
- slice 6: `challenges` (bootstrap)
- slice 7: `podcasts` (225 lines)
- slice 8: `essays` (409 lines)
- slice 9: `people` (761 lines)
- slice 10: `movies` (`movie-stats` + `letterboxd`, 1068 lines)
- slice 11: `books` (702 lines)
- slice 13: `products`/`free-resources` (`shelf.js`, 71 lines)
- slice 14: `index` (`home.js` + `newsletter.js`)
- slice 15: `field-notes` (`newsletter.js`)
- slice 16: `search` (`search-astro.js`, 125 lines)
- slice 17: `dateme` (828 lines), `adventure-[slug]` (`adventure-detail.js`)

Slice 12 (adventures) is deferred. The 5 adventures-* files share state via
top-level `let allAdventures` style globals across the script-tag scope —
ES modules don't share those, so a feature-module rewrite (proper
`import`/`export` of state) is required first. The additive
`window.AdventuresState/Urls/Constants` namespace surface from Phase 4
slice 1 is the migration target; consumers haven't migrated yet.

Files removed: `cool-shit.js`, `youtube.js`, `projects.js`, `challenges.js`,
`podcasts.js`, `essays.js`, `people.js`, `letterboxd.js`, `movie-stats.js`,
`books.js`, `shelf.js`, `home.js`, `newsletter.js`, `search-astro.js`,
`dateme.js`, `adventure-detail.js`.

### Phase 5 slice 2 — important-or-not

- Same conversion pattern applied to `important-or-not.astro`. Native
  Astro `<script type="module">` owns the filter logic; bundler entry
  retired; `js/important-or-not.js` removed.
- Verified live: 18 cards, 4 filter buttons, "Important" filter shows 8
  cards (matches the page's "Important: 8" stat counter), "All" shows 18.
- Built `dist/important-or-not.html` references neither
  `/js/important-or-not.js` nor a per-page bundle — only the shared
  `page-common` bundle and the inline module.

## Phase 6 Status (slice 1)

- Added Phase-6 runtime data budgets to
  `scripts/check-performance-budgets.js`. 15 runtime JSON manifests now have
  upper-bound size budgets; growth above ~25% headroom fails the build
  (`npm run perf:budget`). Current largest:
  `data/countries.geo.json` 819KB, `data/pages.json` 98KB,
  `data/books.generated.json` 52KB.
- Lower-bound + JSON-validity checks added to the smoke harness so
  truncated or empty manifests fail fast.

## Phase 10 Status (in flight)

- Added `scripts/smoke-check.js` (exposed as `npm run smoke`). Hits 11 high-
  signal routes (home + 8 collection pages + adventures + search) plus 8
  runtime JSON manifests and asserts stable structural anchors
  (`id="books-container"`, etc.) without brittle pixel/markup assertions.
- Verified against the running Astro dev server: `19/19 checks passed`.
- Future slice: extend the harness to consume the dist output via
  `http-server` so it can run after `npm run build:fast` in CI without a
  live dev server, and add JS-driven assertions (map markers count,
  card-grid populated post-fetch) via Playwright once Phase 4 lands.

## Phase 9: Dead Code And Legacy Cleanup

Purpose: reduce confusion and remove confirmed-unused paths.

Work:

- Use `rg`, build references, and browser checks to identify unused files.
- Remove only after proving there is no runtime/build dependency.
- Candidates:
  - stale legacy page fragments
  - unused helper scripts
  - unused JS files after ES module migration
  - obsolete docs superseded by this plan
- Update `docs/DOC_INDEX.md` and architecture docs after removals.

Acceptance criteria:

- Build/check/browser smoke tests pass.
- Removed files are documented in the decision log or commit message.

Expected impact:

- `15-35%` reduction in obsolete/legacy surface area, depending on what remains referenced

## Phase 10: Regression QA Harness

Purpose: make large cleanup safe.

Work:

- Add practical browser smoke tests for:
  - home loads
  - navigation works
  - Adventures map appears
  - Adventures route overlays load
  - Books filters/search/modal work
  - People cards/detail behavior works
  - Search returns results
  - Products/resources render
- Keep tests focused on stable behavior, not brittle pixel-perfect assertions.

Acceptance criteria:

- Smoke tests can be run before deploy.
- Tests fail on obvious broken interactions.
- Tests are fast enough to run during refactor work.

Expected impact:

- `40-70%` lower regression risk
- much higher confidence during source cleanup

## Cross-Phase Migration Dashboard

Use this dashboard to track whether the site is actually moving toward native Astro rather than only adding cleaner code around the old shape.

| Area | Current State | Target State | Priority |
|---|---|---|---:|
| Collection data contracts | mixed JSON shapes | shared normalized contracts | high |
| Collection rendering | page-specific repeated markup | shared shells/grids, page-specific cards where needed | high |
| Adventures JS | async bundle, still global-heavy | feature module with explicit state/controller | high |
| Browser JS | ordered globals + manual bundling | ES modules + Vite-owned bundles | high |
| Runtime JSON | broad page fetches | small purpose-built manifests | medium |
| HTML post-processing | required for compatibility | unnecessary for migrated pages | high |
| CSS post-processing | effective but compatibility-driven | native component/source ownership where practical | medium |
| Search index | separate metadata path | generated from normalized collection contracts | medium |
| Smoke QA | manual/browser snippets | repeatable browser smoke suite | high |

## Execution Order

Recommended order:

1. Phase 1: architecture and content guardrails
2. Phase 2: normalized data contracts
3. Phase 3: shared collection components
4. Phase 4: Adventures feature module cleanup
5. Phase 5: ES module migration
6. Phase 6: runtime data simplification
7. Phase 7: compatibility script retirement
8. Phase 8: search/index cleanup
9. Phase 9: dead code cleanup
10. Phase 10: regression QA harness

The order can be adjusted, but do not retire compatibility scripts before the native source equivalent exists.

## Estimated Churn

Rough implementation estimate:

- files touched: `40-80`
- lines added: `1,500-3,500`
- lines removed: `1,000-3,000`
- net change: `-500 to +1,500 LOC`
- total churn: roughly `4,000-6,000 LOC`

The codebase may end near the same LOC, but with less hidden coupling and less duplicated page logic.

## Expected Metrics

Runtime:

- site-wide perceived speed: `5-15%` better
- converted collection page initial JS: `10-30%` lower
- converted collection page runtime JSON: `10-40%` lower
- main-thread JS parse/eval on converted pages: `10-25%` lower
- build output size: `0-10%` smaller

Maintainability:

- future content additions: `30-60%` faster
- new collection/page development: `40-70%` faster
- regression risk: `40-70%` lower
- global JS complexity: `40-70%` lower
- duplicate collection rendering: `30-60%` lower
- build failure diagnosis: `30-60%` faster
- future Astro/Vite upgrade risk: `40-60%` lower

## Verification Commands

Run after every meaningful phase:

```bash
npm run build:fast
npm run --prefix site-astro astro check
npm run lint
```

For pages with browser behavior, also run a browser smoke check against the built `dist/` server.

## Rollback Strategy

- Keep phases small.
- Each phase should be revertable independently.
- If a behavior regression appears, revert the phase rather than layering fixes on uncertain foundations.
- Do not delete old compatibility code in the same change that introduces the native replacement unless the verification surface is very small.

## Non-Goals

- No redesign.
- No URL changes.
- No SEO/schema behavior changes except bug fixes.
- No move to SSR unless explicitly planned separately.
- No Tailwind rewrite unless it is separately justified and visually verified.
