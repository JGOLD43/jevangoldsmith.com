# Post-Audit Cleanup + LH-99 Plan

Status: `proposed`
Audience: `engineering`, `agents`
Purpose: `close the /adventures Lighthouse acceptance miss, drop dead code + dist weight, and break up the two largest scripts — work surfaced by the post-Tier-1+2 audit`

## Goal

After the Post-Tier-1+2 plan landed, every acceptance criterion is green
except `/adventures` Lighthouse score (94, plan target ≥ 95) and a small
set of structural debts the audit identified:

- `~38MB` of JPEG image fallbacks shipped in `dist/` for browsers that
  no longer exist in the wild.
- `74KB` of unused leaflet JS still loaded inside Lighthouse's
  measurement window on `/adventures`.
- Dead `window.*State` / `window.AdventuresUrls` / `window.AdventuresConstants`
  getter blocks (defined but never read) and a `LETTERBOXD_USERNAME`
  const orphaned by slice 1.3.
- 56 `// Phase N (slice X)` comment markers that no longer carry context
  the surrounding code doesn't.
- Two single-page monoliths: `adventures-map.ts` (862 LOC) and
  `dateme.ts` (837 LOC).
- `// @ts-nocheck` pragma on every script — the type-debt marker landed
  in slice 3.2 should fall file by file.

This plan ships the wins, fixes the score, and leaves the bigger
structural follow-ups gated on the same visual-diff + Playwright +
Lighthouse harness the prior plans relied on.

## Non-goals

- **No rebuild of `optimize-assets.js`.** The script keeps emitting WebP
  + AVIF; only the JPEG output path is removed.
- **No new image variants.** The 220w-thumbnail debate from slice 1.1
  stays out of scope.
- **No leaflet replacement.** Defer-on-interaction is the only change;
  the library stays.
- **No Tailwind / Astro 7 / edge-SSR migration.**
- **No new product features.**

## Operating principles

1. **Score and bytes measure against the committed baseline.**
   `perf:check` confirms the win or fails the build.
2. **Visual diff is acceptance for chrome / image-format changes.** A
   `<picture>` source list change without zero-pixel-diff doesn't ship.
3. **One slice, one verifier.** Each slice owns its check.
4. **Cheapest wins first, structural changes last.**

---

## Phase 1 — Subtractions (no behaviour change)

These slices remove code that's verifiably dead. Zero runtime impact;
the gain is reading-load + grep-noise + future-bug-surface reduction.

### Slice 1.1 — Drop dead `window.*State` / Urls / Constants getters

**Work:**

- In `site-astro/src/scripts/adventures.ts`, delete the
  `window.AdventuresState` / `window.AdventuresUrls` /
  `window.AdventuresConstants` assignment block (the audit confirmed 0
  cross-file readers — only the definition references the names).
- Delete `window.BooksState` / `MoviesState` / `PeopleState` /
  `PodcastsState` / `EssaysState` declarations from each respective
  page script for the same reason.
- Strip the matching ambient declarations from
  `site-astro/src/scripts/window-types.d.ts` (including the duplicate
  `AdventuresState?` declaration on line 124).
- Drop the unused `LETTERBOXD_USERNAME` const from
  `site-astro/src/scripts/letterboxd.ts` (orphaned by slice 1.3).

**Verify:**

- `npm run --prefix site-astro check` 0/0/0.
- `npm run test:browser` — all 36 specs pass.
- Visual diff parity (no chrome change expected).

**Acceptance:**

- `~80 LOC` removed across the page scripts.
- 0 lint / type errors.

### Slice 1.2 — Phase-N comment cruft sweep

`grep -rE "^// Phase [0-9]" site-astro/src` returns 56 lines. Most are
provenance markers from completed work that the surrounding code
already explains.

**Work:**

- Delete each `// Phase N (slice X): ...` comment whose body merely
  names the historical slice. Keep any whose body documents a *current*
  invariant the next reader needs (e.g. comments noting why a wrapper
  exists, why an order matters).
- Standard for retention: would removing this comment confuse a reader
  in 6 months? If no, delete.

**Verify:**

- `npm run build:fast` succeeds.
- Visual diff parity.
- Spot-check: a fresh reader can still understand each touched
  function's purpose from the code alone.

**Acceptance:**

- Phase-N marker count drops from 56 → ≤ 10 (the survivors are the
  ones documenting current behaviour).

### Slice 1.3 — Drop JPEG fallbacks from generated images

Browser baseline (Safari 16, Oct 2022) supports AVIF; WebP is
universal fallback. The third format is shipping ~38MB of bytes that
no live browser fetches.

**Work:**

- Edit `scripts/optimize-assets.js`: drop the JPEG output branch from
  the per-image generation loop. Keep WebP + AVIF.
- Update `scripts/normalize-astro-html.js` (the `<img>` → `<picture>`
  wrapper): the `<img>` `src` falls back from `.jpg` to `.webp` for
  the no-AVIF path. Verify the picture-element output still parses.
- Re-run `npm run assets:optimize`. Old `.jpg` files in `images/generated/`
  remain on disk (untracked; gitignored) but new builds skip them.
- Add a one-shot cleanup step to `scripts/optimize-assets.js`: if a
  `.jpg` exists alongside its `.webp` + `.avif` and is older than the
  source, delete it. (Or: `find images/generated -name '*.jpg' -delete`
  as a one-time op.)

**Verify:**

- `dist/` size drops from ~99MB to ~61MB.
- `find dist/images -name '*.jpg' | wc -l` → 0.
- Visual diff parity on every image-heavy baseline page (`/people`,
  `/movies`, `/books`, `/podcasts`, `/`).
- Lighthouse byte budgets unchanged or smaller (browsers were already
  picking AVIF / WebP — the JPEG path was insurance, not load).
- Spot-check in a real browser (Safari 14 if available, otherwise
  document the floor): WebP fallback still renders.

**Acceptance:**

- `dist/` total size ≤ 65MB (down from 99MB).
- 0 visual-diff regressions.
- `npm run perf:check` green.

---

## Phase 2 — Lighthouse-visible gains

### Slice 2.1 — Defer leaflet past Lighthouse's measurement window

`/adventures` is 94 because leaflet (~74KB unused-JS audit) +
map paint runs inside Lighthouse's network-idle window. The map
`auto-mount` fires `setTimeout(load, 100)` after DOMContentLoaded,
which is well within Lighthouse's ~5-10s capture.

**Work — pick one path:**

**Path A — interaction-only mount (cleanest, score-best, UX cost):**

- In `site-astro/src/scripts/adventures.ts`, drop the
  `setTimeout(load, 100)` line from `setupWorldMapLazyLoad`. Map
  mounts only on `pointerenter` / `pointerdown` / `touchstart` /
  `focusin`.
- Add a static `<button class="map-load-cta">Load map</button>`
  overlay with a low-res world-map background image (~10KB AVIF) so
  pre-interaction users see something visually present. Click event
  triggers the same `ensureWorldMap` path.
- LCP element becomes the static page header.

**Path B — defer auto-mount past Lighthouse window:**

- Bump `setTimeout(load, 100)` to `setTimeout(load, 12000)`.
  Lighthouse's measurement closes earlier; real users still get the
  auto-mount, just slower.
- Risk: real users notice the lag. May hurt the user experience the
  Lighthouse score doesn't measure.

**Path A is recommended.** The static screenshot keeps the page from
looking broken, and the score gain is real-deal vs measurement-trick.

**Verify:**

- `npm run perf:check` — `/adventures` score ≥ 95 (target: 99).
- LCP element on `/adventures` is the page header (per Lighthouse
  "largest-contentful-paint-element" audit).
- Playwright `adventures-map.spec.ts` adapted: must trigger an
  interaction (e.g. `page.hover('.map-container')`) before asserting
  `.leaflet-container` exists.

**Acceptance:**

- `/adventures` Lighthouse ≥ 95 across 3 consecutive median-of-3 runs.
- All 5 adventures Playwright specs pass.
- Visual diff parity (the static map screenshot is the new baseline).

### Slice 2.2 — Per-page CSS bundles

`chrome.css` ships 39KB to every page. Lighthouse `unused-css-rules`
audit on `/adventures` says 29KB of those rules don't apply on that
page. The current per-page purge runs after the full css is
emitted — re-architect to ship narrower bundles up front.

**Work:**

- Audit `css/legacy-style.css` (192KB raw) for section boundaries.
  Cluster rules by which page-class they need (`body.adventures`,
  `body.books`, `.modal-*`, `.collection-sidebar`, etc.).
- Split into:
  - `chrome.core.css` — used by every page (nav, footer, baseline).
  - `chrome.collection.css` — collection-page-specific (sidebar +
    grid + modal).
  - `chrome.adventures.css` — adventures + map.
  - `chrome.dateme.css`, `chrome.meet.css` — page-specific shells.
- `Base.astro` includes only the bundles its current page uses (gate
  via `seoSlug` / `_currentPage` like the preconnect rule from slice
  2.1 of the prior plan).

**Verify:**

- Lighthouse `unused-css-rules` audit on `/adventures` shows < 5KB
  of unused rules from the chrome bundles.
- `purge:css` step still runs as a final guard but reports < 5KB
  trimmed per page.
- Visual diff parity.

**Acceptance:**

- 4–5 `chrome.*` bundles in `dist/css/`.
- Each baseline page's Lighthouse `unused-css-rules` < 5KB.

### Slice 2.3 — Critical CSS inline retry

The Base.astro comment notes critical-CSS-inline was tried before
the visual diff harness existed and reverted on a CLS regression. The
harness now catches that bug class, so the experiment is safe to
retry.

**Work:**

- Identify the above-the-fold CSS for each route's `seoSlug` (~5KB
  per route). Tools: `critical` npm package, or a hand-curated
  selector set per page.
- Inline the critical CSS in `<style>` inside `<head>` of `Base.astro`
  (gated by `seoSlug` like the preconnect rule).
- Async-load the rest of `chrome.*.css` via `<link rel="preload" as=
  "style">` + `<link rel="stylesheet" media="print" onload=
  "this.media='all'">` (or its modern equivalent).

**Verify:**

- `npm run perf:check` — FCP improves by ≥ 80ms across the 8 routes.
- `npm run test:browser` — visual diff parity on every page.
- CLS on every route stays < 0.05 (the failure mode that killed the
  prior attempt).

**Acceptance:**

- 0 CLS regressions past tolerance.
- ≥ 80ms FCP improvement on a majority of routes.
- Lighthouse `render-blocking-resources` audit on every page shows
  < 50ms savings (was ~120ms on `/adventures`).

**Rollback:**

- The visual diff harness catches the regression. If CLS spikes,
  revert this slice's commit independently — no other slice depends
  on it.

---

## Phase 3 — Structural cleanup

### Slice 3.1 — Split `adventures-map.ts`

862 LOC in one file. Splittable along clear boundaries.

**Work:**

- Extract `site-astro/src/scripts/adventures-map-data.ts`:
  `loadPlacesOfInterest`, `loadCountriesData`, `loadRoutes`,
  `loadPopularRoutes`, `loadPhotos`, `loadMapDatasets`,
  `schedulePopularRoutes`, `shouldLoadPopularRoutes`. Pure data
  loaders + the lazy gates from slice 1.2.
- Extract `site-astro/src/scripts/adventures-map-render.ts`:
  `createMapMarker`, `renderPlaceMarkers`, `renderCountryLayer`,
  `renderRouteLayer`, `renderPhotoLayer`, `applyAdventureMarkerFilter`.
  Pure presenter functions.
- Extract `site-astro/src/scripts/adventures-map-controls.ts`:
  `setBasemap`, `addFastBaseMap`, `addSatelliteTiles`,
  `renderLayerToggles`, `renderPoiToggles`, the wrapper
  `event.addEventListener('change', ...)` handler.
- `adventures-map.ts` becomes a small entrypoint: imports the three
  modules, wires `ensureWorldMap` + `initWorldMap`, exposes
  `window.AdventuresMap`.

**Verify:**

- `astro check` 0/0/0.
- All 5 adventures Playwright specs pass.
- Visual diff parity on `/adventures` + each per-adventure detail page.
- `npm run perf:check` — no regressions.

**Acceptance:**

- `adventures-map.ts` ≤ 250 LOC (entrypoint + types).
- 3 new modules each ≤ 350 LOC.

### Slice 3.2 — Split `dateme.ts`

837 LOC for a single page. Read first to find the natural split lines
(form, validation, render, submit?).

**Work:**

- Inspect `dateme.ts`. Identify 2–4 sub-modules along data /
  presentation / interaction lines.
- Extract sub-modules as siblings: `dateme-<part>.ts`.
- Entrypoint stays small.

**Verify:**

- `astro check` 0/0/0.
- Page renders correctly in browser preview (no specific Playwright
  spec exists; manual smoke).
- `npm run smoke` checks pass.

**Acceptance:**

- `dateme.ts` ≤ 250 LOC.
- Each sub-module ≤ 350 LOC.

### Slice 3.3 — Drop `// @ts-nocheck` from small scripts

The pragma landed in slice 3.2 of the prior plan as a debt marker.
Per-file removal is incremental and gated on `astro check` per file.

**Work, smallest-first:**

- 3.3a — `sanitize.ts` (50 LOC), `sanitize-html.ts` (34 LOC),
  `newsletter.ts` (53 LOC).
- 3.3b — `task-list.ts` (36 LOC), `shelf.ts` (71 LOC).
- 3.3c — `analytics.ts` (134 LOC), `data-fetch.ts` (70 LOC),
  `collection-helpers.ts` (69 LOC), `action-dispatcher.ts` (73 LOC).
- 3.3d — `home.ts` (144 LOC), `youtube.ts` (122 LOC),
  `search-astro.ts` (130 LOC).
- Defer the big ones (`adventures-map.ts`, `books.ts`, `letterboxd.ts`,
  `dateme.ts`, `essays.ts`, `movie-stats.ts`) to a separate effort.

**Per-file work:**

- Remove the `// @ts-nocheck` line.
- Run `astro check`. Fix the strict errors that surface — prefer
  proper types; `any` only where the runtime genuinely is dynamic
  (e.g. JSON parse results, leaflet vendor surface).
- Add narrow `as` casts at DOM-event boundaries
  (`event.target as HTMLElement`).

**Verify, per file:**

- `astro check` 0/0/0.
- All Playwright specs touching the file's page pass.

**Acceptance:**

- 12 of 27 scripts (the small + medium ones) shed the pragma.
- The big-file backlog is named explicitly in DECISION_LOG.md.

---

## Sequencing

```
Phase 1            ─ Subtractions
   │  ├─ 1.1 dead window.*State + LETTERBOXD_USERNAME
   │  ├─ 1.2 Phase-N comment sweep
   │  └─ 1.3 drop JPEG fallbacks
   ▼
Phase 2            ─ Lighthouse-visible
   │  ├─ 2.1 leaflet defer (fixes /adventures = 94)
   │  ├─ 2.2 per-page CSS bundles
   │  └─ 2.3 critical CSS inline retry
   ▼
Phase 3            ─ Structural
   │  ├─ 3.1 split adventures-map.ts
   │  ├─ 3.2 split dateme.ts
   │  └─ 3.3 drop @ts-nocheck (small files)
```

**Why this order:**

- **Phase 1** is pure subtraction. No risk, fastest wins, frees the
  next reader.
- **Phase 2.1** closes the only failing acceptance criterion from the
  prior plan. Independent of everything else.
- **Phase 2.2 + 2.3** stack into ~100ms FCP on every page. Highest
  perceived perf gain. CLS-risk in 2.3 is gated on the visual diff
  harness.
- **Phase 3** is organizational. Big diffs, no behaviour change, all
  gated on the same Playwright + visual diff suite.

## Expected outcomes

| Metric | Current | Target | Phase |
|---|---:|---:|---:|
| `/adventures` Lighthouse score | 94 | ≥ 95 (target 99) | 2.1 |
| `dist/` total size | 99MB | ≤ 65MB | 1.3 |
| `assets:optimize` runtime | 100% | ~67% (one fewer format) | 1.3 |
| Phase-N comments in src | 56 | ≤ 10 | 1.2 |
| Dead `window.*` LOC | ~80 | 0 | 1.1 |
| `chrome.css` first-visit waste | ~30KB / page | < 5KB / page | 2.2 |
| FCP improvement (avg) | — | ≥ 80ms | 2.3 |
| `adventures-map.ts` LOC | 862 | ≤ 250 entrypoint + 3× ≤ 350 | 3.1 |
| `dateme.ts` LOC | 837 | ≤ 250 entrypoint + 2–3× ≤ 350 | 3.2 |
| Scripts free of `@ts-nocheck` | 0 / 27 | 12 / 27 | 3.3 |

## Acceptance criteria for the whole plan

- All 8 baseline routes Lighthouse score ≥ 95 across 3 consecutive
  median-of-3 runs.
- `/adventures` specifically ≥ 95 (the prior plan's open miss).
- `npm run perf:check` green vs an updated `docs/perf-baseline.md`.
- `npm run test:browser` 36+ specs all pass.
- Visual diff zero pixel-diff (or < 1%) on every baseline page.
- `astro check` 0/0/0.
- `dist/` size ≤ 65MB.
- 0 `.jpg` files under `dist/images/generated/`.
- 0 `window.*State` / `window.AdventuresUrls` / `window.AdventuresConstants`
  assignments in source.
- `adventures-map.ts` + `dateme.ts` each ≤ 250 LOC.
- 12 of 27 scripts free of the `@ts-nocheck` pragma.

## Rollback strategy

Each slice is independently revertable. Hard dependencies:

- Slice 2.1's Playwright spec change depends on the spec already
  asserting interaction-triggered map mount; revert both together.
- Slice 3.1's three-way split is one commit (the move + entrypoint
  re-wiring), revert atomically if regressions appear.
- Slice 3.3 per-file commits are each independent.

If any Phase 2 slice regresses Lighthouse past tolerance, `perf:check`
fails the build and the slice's commit reverts.

## Out of scope (intentionally)

- Building a custom leaflet bundle. Defer-on-interaction gets us to
  ≥ 95 without it.
- Generating new image variants (220w thumbnails for `/people`).
- The card-builder → `<Image>` migration (slice 2.2 of the prior plan).
- The full per-component split of `collection-shell.ts` into
  `CollectionSidebar.astro` / `CollectionMain.astro` / etc.
- `@ts-nocheck` removal on the big files (`adventures-map.ts`,
  `books.ts`, `letterboxd.ts`, `dateme.ts`, `essays.ts`,
  `movie-stats.ts`). Each is hours of work and goes in its own focused
  effort.
