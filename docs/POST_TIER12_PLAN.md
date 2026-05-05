# Post-Tier-1+2 Improvements Plan

Status: `proposed`
Audience: `engineering`, `agents`
Purpose: `next focused arc — close the four remaining Lighthouse-visible bugs, ship the mechanical perf wins, and finish the structural simplification gated on the visual-diff harness`

## Goal

After the Simplify+Perf and Tier 1+2 plans landed, the site is at
Lighthouse 95-100 on every route, source LOC is -42% vs legacy, and CI
gates lint + type-check + Playwright behavioral + visual diff +
Lighthouse budgets. This plan picks up the four remaining
user-facing perf bugs, ships the mechanical small wins, and finishes
the deeper structural simplifications now that the visual-diff harness
makes them safe.

## Non-goals

- **No "lazy mount cards on scroll"** style virtualization. Keep all
  cards in the DOM at SSR time. The image-fetch lazy-loading in this
  plan uses **native `<img loading="lazy">`** — the IMG element stays
  in the DOM; only the network fetch is deferred until the browser
  predicts the image will enter the viewport. Card-level
  intersection-observer hiding is out of scope.
- No Tailwind v5 / Astro 7 migration (own effort, gated on those
  upstream releases).
- No edge SSR for dynamic search (out of scope; would change
  the deploy model).
- No new product features.

## Operating principles

1. **Every change measures against the committed baseline.** `perf:check`
   either confirms the win or fails the build.
2. **Visual-diff parity is acceptance for chrome refactors.** No
   chrome surface change ships without zero-pixel-diff (or <1% with
   font subpixel tolerance).
3. **One slice, one verifier.** Each slice owns its check.
4. **Ordered by ratio of impact to risk.** Cheap wins first, then
   structural changes, then code-quality cleanup.

---

## Phase 1 — Lighthouse-visible bug fixes

Four routes have a measurable issue. Close each.

### Slice 1.1 — `/people` image lazy-load + bytes audit

`/people` ships ~2MB on first visit, dominated by ~98 person headshots
loaded eagerly. Every image below the initial viewport (~12 cards) is
wasted bytes pre-interaction.

**Work:**

- Audit `<img>` tags emitted by `lib/person-card.ts`. Add `loading="lazy"`
  + `decoding="async"` to all of them (already on some — verify).
- For the first 12 cards (the ones above the fold at desktop 1280×800
  viewport), use `loading="eager"` + `fetchpriority="high"` on the LCP
  candidate.
- Drop the `data/books.generated.json` runtime fetch by porting the
  book-author merge fully to build-time at `scripts/build/merge-people.js`.
  Output `data/people.merged.generated.json`. people.astro SSRs all 98
  cards from the merged file. people.js runs as a no-op since the grid
  is fully populated server-side.

**Verify:**

- `npm run perf:check` — `/people` Total Bytes drops by ≥ 1MB.
- DevTools Network panel under Slow-3G throttle: only ~12 image requests
  before user scrolls.
- Playwright `people.spec.ts` still passes (98 cards present, filter works).

**Acceptance:**

- `/people` Total Bytes < 700KB.
- Lighthouse score stays ≥ 99.
- No visual diff regression.

### Slice 1.2 — `/adventures` countries layer eager-load gate

`/adventures` ships ~3.3MB. Suspicion: `data/countries.slim.generated.json`
(248KB) loads eagerly even though the countries-filter is OFF in
`DEFAULT_FILTERS`. Confirm + gate.

**Work:**

- Read `loadCountriesData()` in `adventures-map.js`. Check whether the
  fetch runs in the initial `loadMapDatasets` Promise.all or only when
  `mapFilters.layers.countries` becomes true.
- If it loads eagerly: move the fetch behind a check on
  `mapFilters.layers.countries`. The first toggle flips it on triggers
  a one-shot fetch.
- Same audit for `data/popular-routes/*.json` chunks — only fetch the
  active route-type chunks.

**Verify:**

- `npm run perf:check` — `/adventures` Total Bytes drops by ≥ 200KB.
- Playwright `adventures-map.spec.ts` still passes (markers + map mount).
- Manually toggle the countries filter ON; confirm the layer renders.

**Acceptance:**

- `/adventures` initial Total Bytes < 3MB.
- Countries layer still works when toggled on.

### Slice 1.3 — `/movies` CLS deterministic fix

`/movies` CLS varies between 0.000 and 0.380 because the Letterboxd
RSS fetch sometimes expands the 6 SSR'd cards to ~20 mid-load. Two
paths — pick (a) for cheap, then (b) for permanent.

**Work (path A — cheap, ship first):**

- Add `min-height: 80vh` on `#movies-container` so the runtime expansion
  doesn't shift the layout. Same pattern as Phase 2.1 of the prior plan
  for `/search`.

**Work (path B — permanent fix, ships if A is insufficient):**

- Replace the allorigins.win CORS proxy with a real GitHub Action cron
  that fetches `https://letterboxd.com/<user>/rss/` directly (no CORS
  limit on a server-side runner) and commits the merged
  `data/movies.json` daily.
- The runtime path becomes pure SSR — no fetch, no expansion, CLS = 0.

**Verify:**

- `npm run perf:check` — `/movies` CLS < 0.05 across 3 consecutive runs.
- Run `npm run movies:sync` locally; verify it succeeds (or fails
  gracefully + falls back to the cached file).

**Acceptance:**

- `/movies` CLS consistently < 0.05.
- Lighthouse score stays ≥ 95.

### Slice 1.4 — `/podcasts` LCP optimization

`/podcasts` LCP is ~1087ms — slowest among the simple-pages tier.
Likely cause: 10 podcast cover images, none with
`fetchpriority="high"`, so the browser doesn't prioritize the LCP
candidate.

**Work:**

- Identify the LCP element on `/podcasts` via Lighthouse's "Largest
  Contentful Paint element" audit.
- Add `fetchpriority="high"` to the first podcast card image in
  `lib/podcast-card.ts`.
- Add `loading="lazy"` to cards 6+ (below the fold).

**Verify:**

- `npm run perf:check` — `/podcasts` LCP drops by ≥ 200ms.

**Acceptance:**

- `/podcasts` LCP < 900ms.

---

## Phase 2 — Mechanical small wins

These each yield small individual gains but stack into noticeable
net deltas. None requires a behavior change.

### Slice 2.1 — `<link rel="preconnect">` for external image origins

Every cross-origin image fetch costs an extra DNS+TLS handshake on
first hit. Preconnect in `<head>` cuts that.

**Work:**

- Audit which external origins each page uses:
  - `images.unsplash.com` (some adventures hero images)
  - `a.ltrbxd.com` (movie posters from Letterboxd)
  - `i.ytimg.com` (videos page YouTube thumbnails)
- Add `<link rel="preconnect" href="https://X" crossorigin>` in
  `Base.astro` only on pages that use each origin. Use
  `Astro.url.pathname` matching to gate.
- Tighter alternative: do it in each page's frontmatter via
  `<head slot="head">`.

**Acceptance:**

- DevTools shows preconnect tags on the right pages.
- Lighthouse "Preconnect to required origins" audit passes.

### Slice 2.2 — `astro:image` integration

Astro's built-in `<Image>` component (from `astro:assets`) generates
responsive `srcset`, picks AVIF when supported, lazy-loads by default,
and emits proper width/height attributes. We're not using it.

**Work:**

- Migrate `<img>` → `<Image>` in:
  - `Base.astro` (logo, OG image)
  - `index.astro` (hero, profile)
  - `lib/person-card.ts` (now becomes `PersonCard.astro`)
  - `lib/podcast-card.ts` (becomes `PodcastCard.astro`)
  - `lib/movie-card.ts` (becomes `MovieCard.astro`)
- The card builders today emit raw HTML strings — this slice converts
  them to real Astro components that emit `<Image>` and forward the
  exact same class names so existing CSS keeps working.
- Unsplash + Letterboxd images are remote — they need to be in
  `astro.config.mjs` `image.remotePatterns` to get optimized.

**Verify:**

- Lighthouse "Properly size images" + "Serve images in next-gen formats"
  audits both pass on `/people`, `/movies`, `/podcasts`.
- Visual-diff baselines pass.

**Acceptance:**

- All 5 card surfaces emit `<Image>` instead of `<img>`.
- AVIF served when supported.
- ≥ 30% reduction in image bytes across the 3 pages.

### Slice 2.3 — Firebase cache headers

`firebase.json` is conservative on caching. Tighter rules on hashed
assets save bytes for repeat visitors.

**Work:**

- Read current `firebase.json` headers config.
- For `assets/**/*.{js,css,woff2,jpg,webp,avif}` with a content hash:
  `Cache-Control: public, max-age=31536000, immutable`.
- For HTML: `Cache-Control: public, max-age=0, must-revalidate` plus
  the existing service-worker network-first strategy.

**Verify:**

- `curl -I http://localhost:8765/_astro/SOMECHUNK.HASH.js | grep
  Cache-Control` returns `immutable`.
- Repeat visit Lighthouse run shows the cached resources don't refetch.

**Acceptance:**

- Hashed assets carry `immutable` cache control.
- Lighthouse "Uses efficient cache policy" audit passes.

### Slice 2.4 — Build time tuning

`build:fast` is 6.7s vs legacy's 1.4s. Most of that is Astro + Vite
warming up. Half the time is recoverable.

**Work:**

- Profile with `astro build --verbose`. Identify the slow steps.
- Skip `routes:split` when no popular-routes change. Add a content-hash
  check upstream of the script.
- Drop the `prune:dist` warm scan if the previous step already pruned
  (idempotency check).
- Try `vite build --watch` style for `dev` if not already.

**Verify:**

- `time npm run build:fast` — wall time < 4s on warm cache.
- All gates still pass.

**Acceptance:**

- `build:fast` median wall time < 4s.

### Slice 2.5 — Drop `site-astro/src/legacy/` HTML fragments

14 raw `?raw`-imported HTML fragments still living in
`site-astro/src/legacy/`. They're consumed by collection pages via
the brittle `mainBodyRaw.replace('<div id="...container"></div>', '...')`
pattern.

**Work:**

- For each `_src/legacy/collections/<page>/*.html` fragment, port the
  markup directly into the corresponding `.astro` page or component.
- Drop the `?raw` imports.
- Delete `site-astro/src/legacy/` entirely.

**Verify:**

- Visual diff parity on every affected page.
- Behavioral Playwright still green.

**Acceptance:**

- `site-astro/src/legacy/` does not exist.
- No `?raw` imports remain in `site-astro/src/pages/`.

---

## Phase 3 — Structural simplification

Two big remaining structural cleanups, gated on the visual-diff
harness from Phase 4 of the Tier 1+2 plan.

### Slice 3.1 — Replace `collection-chrome.ts` with real Astro components

`collection-chrome.ts` is 845 lines of TypeScript-as-HTML. Rendered via
`<Fragment set:html={...}>`, which prevents:
- Astro CSS scoping
- TypeScript validation of HTML structure
- IDE syntax highlighting
- Vite tree-shaking of unused chrome variants

**Work — components** (gated on visual diff per page):

- `CollectionShell.astro` — accepts layout id/className + `<slot>`.
- `CollectionSidebar.astro` — sidebar header, list dropdown, search,
  sections, footer. Owns scoped CSS.
- `CollectionMain.astro` — header, counter, body slot.
- `CollectionSection.astro` — sidebar category buttons. The 27 inline
  SVG icons become `<Icon name="..." />` from a shared icon component.
- `CollectionListDropdown.astro`, `CollectionSearch.astro` — small
  focused components.

**Work — migration**, one page at a time:

- 3.1a `books.astro`
- 3.1b `movies.astro`
- 3.1c `people.astro`
- 3.1d `podcasts.astro`
- 3.1e `essays.astro`
- 3.1f `projects.astro` + `challenges.astro` (use `TaskCollectionPage`
  which also gets a real component)

Each migration:
1. Convert the page to use the new components.
2. Run `npm run test:browser` — all behavioral specs green.
3. Run visual diff — zero pixel-diff (or < 1% with subpixel tolerance).
4. Commit. Move to next page.

**Acceptance:**

- All 7 collection pages on real Astro components.
- `collection-chrome.ts` deleted.
- Visual diff zero pixel-diff (or < 1%) on every migrated page.

### Slice 3.2 — TypeScript conversion of `site-astro/src/scripts/*`

7,745 LOC across 21 files. Real value: catches the kind of cross-module
ReferenceError bugs that the Tier 1+2 plan had to fix manually
(`WEB_MERCATOR_MAX_LAT is not defined`, `nearestWrappedLongitude is not
defined`, etc.).

**Work, file by file:**

- Rename `.js` → `.ts`.
- Add minimal type annotations to silence strict errors. Prefer
  `unknown` + narrowing over pervasive `any`.
- Resolve cross-module imports via the `window-types.d.ts` ambient
  types file (already in place).

**Migration order (smallest first):**

- 3.2a `task-list.ts`, `newsletter.ts`, `shelf.ts` (already simple)
- 3.2b `home.ts`, `cool-shit.ts`, `youtube.ts`, `search-astro.ts`
- 3.2c `analytics.ts`, `theme.ts`, `data-fetch.ts`,
  `collection-helpers.ts`, `action-dispatcher.ts`, `grid-zoom.ts`
- 3.2d `essays.ts`, `podcasts.ts`, `movie-stats.ts`, `letterboxd.ts`,
  `people.ts`, `books.ts`
- 3.2e `adventures.ts`, `adventures-map.ts`

**Verify, per file:**

- `astro check` 0/0/0.
- `npm run smoke` + `npm run test:browser` green.

**Acceptance:**

- All files in `site-astro/src/scripts/` are `.ts`.
- `astro check` clean.

### Slice 3.3 — Adventures `globalThis` → state object

Failed twice in prior runs because the bare-identifier reads in
`adventures-map.js` resolve via globalThis. Now safe to attempt with
the Playwright map-mount + detail-pane specs as the safety net.

**Work:**

- Create `site-astro/src/scripts/adventures-state.ts` exporting a
  typed `state` object.
- Rewrite each `globalThis.X` reference site in `adventures.ts` and
  `adventures-map.ts` (after Phase 3.2 lands them as TS) to
  `state.X`.
- Each reference rewrite is mechanical: read sites become `state.X`,
  write sites become `state.X = …`.

**Verify, after each file:**

- `astro check` 0/0/0.
- `npm run test:browser` — adventures-map + adventures-detail specs pass.

**Acceptance:**

- 0 `globalThis.X` references in `adventures.ts` + `adventures-map.ts`.
- All 5 adventures Playwright tests pass.

---

## Sequencing

```
Phase 1            ─ Lighthouse-visible bug fixes
   │  ├─ 1.1 /people image lazy-load + merge to build time
   │  ├─ 1.2 /adventures countries gate
   │  ├─ 1.3 /movies CLS deterministic fix
   │  └─ 1.4 /podcasts LCP optimization
   ▼
Phase 2            ─ Mechanical small wins
   │  ├─ 2.1 preconnect for external image origins
   │  ├─ 2.2 astro:image integration
   │  ├─ 2.3 firebase cache headers
   │  ├─ 2.4 build time tuning
   │  └─ 2.5 drop src/legacy/ fragments
   ▼
Phase 3            ─ Structural simplification
   │  ├─ 3.1 collection-chrome.ts → Astro components (per page)
   │  ├─ 3.2 TS conversion (per file)
   │  └─ 3.3 adventures globalThis → state object
```

**Why this order:**

- **Phase 1 first** — these are the four real numbers that aren't yet
  green. Cheapest user-facing wins.
- **Phase 2 second** — mechanical small wins compound but no individual
  one is gating.
- **Phase 3 last** — biggest structural changes. The visual-diff +
  Playwright harness is the safety net; running these without that
  net (which is now in place) would be reckless.

## Expected outcomes

| Metric | Current | Target | Phase |
|---|---:|---:|---:|
| `/people` Total Bytes | 2007KB | < 700KB | 1.1 |
| `/people` runtime fetches | 4 | 1 | 1.1 |
| `/adventures` Total Bytes | 3279KB | < 3000KB | 1.2 |
| `/movies` CLS (median 3 runs) | 0.380 | < 0.05 | 1.3 |
| `/podcasts` LCP | 1087ms | < 900ms | 1.4 |
| AVIF served on image-heavy pages | 0% | 100% (modern browsers) | 2.2 |
| `build:fast` wall time | 6.7s | < 4s | 2.4 |
| `site-astro/src/legacy/` files | 14 | 0 | 2.5 |
| `collection-chrome.ts` lines | 845 | 0 (deleted) | 3.1 |
| `site-astro/src/scripts/*` TS | 0/21 | 21/21 | 3.2 |
| Adventures `globalThis.X` refs | 41 | 0 | 3.3 |

## Acceptance criteria for the whole plan

- All 8 baseline routes Lighthouse score ≥ 95 across 3 consecutive
  median-of-3 runs.
- `npm run perf:check` green vs an updated `docs/perf-baseline.md`.
- `npm run test:browser` 36+ specs all pass.
- Visual diff zero pixel-diff (or < 1%) on every baseline page.
- `astro check` 0/0/0.
- `collection-chrome.ts` deleted.
- `site-astro/src/legacy/` deleted.
- All `site-astro/src/scripts/*` files are `.ts`.
- 0 `globalThis.X` reference assignments in source.

## Rollback strategy

Each slice is independently revertable. The dependency chain:

- Phase 3.1 each per-page migration gated on visual-diff parity for
  that page.
- Phase 3.2 each file gated on `astro check` clean + smoke green.
- Phase 3.3 gated on Phase 3.2 of the same files (TS conversion finds
  the bugs first).

If any slice regresses Lighthouse past tolerance, `perf:check` fails
the build and the slice's commit is reverted independently.

## Out of scope (intentionally)

- Card-level intersection-observer hiding. Cards stay in the DOM at
  SSR time; only image network fetches lazy-load.
- Tailwind v5 / Astro 7 migration.
- Edge SSR for dynamic search.
- Mobile-viewport Playwright pass.
- A new image format pipeline beyond `astro:image`.
- Service-worker prefetching strategy beyond what already exists.
- The `data/site.config.json` legacy file (orphaned but tiny + harmless).

These would each be their own focused effort. Adding any of them
inflates this plan past its risk-adjusted-value sweet spot.
