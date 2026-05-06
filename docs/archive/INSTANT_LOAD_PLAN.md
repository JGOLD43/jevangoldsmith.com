# Instant Load Execution Plan

Status: `implementation pass 1 complete`
Audience: `engineering`, `agents`
Purpose: `make the website feel instant by reducing startup work, shrinking generated assets, and moving rich behavior behind intent`

## Pass 1 Results

Captured on May 5, 2026 with `npm run verify` and `npm run build:fast`.

| Metric | Baseline | Pass 1 |
|---|---:|---:|
| `dist` budget-reported size | `99.3MB` | `74.3MB` |
| `dist` on disk | `~120MB` | `~90MB` |
| `images/generated` on disk | `~97MB` | `~70MB` |
| Generated WebP files | `1155` | `4` |
| Average first-visit CSS after purge | `~43.9KB` | `~43.5KB` |
| Average repeat-page CSS | `~5.4KB` | `~5.6KB` |
| `/adventures.html` route bytes | baseline | `-389.0KB` |
| `/adventures.html` LCP | `~1563ms` | `814-1010ms` across verify runs |
| `/adventures.html` Lighthouse score | `~94-95` | `99` |
| Main-thread blocking | `0ms` | `0ms` on all measured routes |

Completed in pass 1:

- fixed the lint/type gate and added a canonical `npm run verify`
- made `npm run build` run `lint` and `astro check` before deployable output
- added generated asset inventory reporting
- removed stale non-logo generated WebP from source and `dist`
- localized source-discovered remote images before build
- made Adventures load as static HTML first and load Leaflet only after intent
- deferred analytics and wisdom ticker work off the first-paint path
- kept per-page CSS purge in place as the practical CSS split for this pass

Still future work:

- source-level CSS bundle splitting, if we want to chase the extreme CSS target
- source-level replacement for `normalize-astro-html.js`
- deeper TypeScript cleanup of the legacy `@ts-nocheck` scripts
- generated asset width audit to push `dist` below `65MB`

## North Star

The site should feel instant on a cold visit and nearly invisible on repeat
navigation. The first screen must be useful from static HTML plus critical CSS.
JavaScript, maps, analytics, modals, and secondary images should wake up after
the first impression, not compete with it.

This is not only a Lighthouse plan. Lighthouse remains the gate, but the product
goal is perceived speed:

- nav, hero, text, and cards appear immediately
- no startup work blocks reading
- heavy experiences load only after intent
- repeat navigation feels cached and calm

## Current Baseline

Measured during the May 2026 audit:

| Metric | Current |
|---|---:|
| `dist` budget-reported size | `99.3MB` |
| `dist` on disk | `~120MB` |
| `images/generated` on disk | `~97MB` |
| `_astro` assets | `~236KB` |
| Average first-visit CSS after purge | `~43.9KB` |
| Average repeat-page CSS | `~5.4KB` |
| `/` LCP | `~631ms` |
| `/books.html` LCP | `~1065ms` |
| `/movies.html` LCP | `~568ms` |
| `/people.html` LCP | `~860ms` |
| `/adventures.html` LCP | `~1563ms` |
| `/podcasts.html` LCP | `~987ms` |
| `/essays.html` LCP | `~606ms` |
| `/search.html` LCP | `~624ms` |

Useful current strengths:

- Astro renders 82 static pages.
- Collection cards are SSR'd and survive hydration.
- Playwright behavior + visual smoke passes.
- `astro check` is down to `0 errors`, `0 warnings`, `1 hint`.
- Most TBT readings are already `0ms`.

Current problems blocking the next level:

- generated image assets dominate deploy size
- stale ignored generated assets stay on disk after strategy changes
- `/adventures` treats map work as startup-critical
- source CSS is still broad even though post-build purge narrows output
- many static pages still inherit global startup JavaScript
- `normalize-astro-html.js` mutates output after Astro builds it
- many scripts remain under `@ts-nocheck`

## Target Metrics

### Strong Target

| Metric | Target |
|---|---:|
| `dist` budget-reported size | `<65MB` |
| `dist` on disk | `<75MB` |
| `images/generated` | `<55MB` |
| `_astro` assets | `<180KB` |
| Average first-visit CSS | `<30KB` |
| Static-page startup JS | `<10KB` page-specific |
| `/adventures.html` LCP | `<1200ms` |
| Collection-page LCP | `<850ms` where image/network allows |
| Lighthouse pages | `99-100`, with `/adventures >= 99` |

### Extreme Target

| Metric | Target |
|---|---:|
| `dist` budget-reported size | `<50MB` |
| `dist` on disk | `<60MB` |
| `images/generated` | `<40MB` |
| `_astro` assets | `<130KB` |
| Average first-visit CSS | `<18KB` |
| Static-page startup JS | `0-5KB` |
| `/adventures.html` LCP | `<900ms` |
| Collection-page LCP | `<700ms` |
| Repeat navigation perceived latency | `<200ms` |

## Operating Rules

1. Every slice must be reversible.
2. Every slice must have one primary metric and one regression gate.
3. Generated `dist/` is verification output only; do not hand-edit it.
4. Primary content must remain SSR-visible without JavaScript.
5. Do not trade real UX for Lighthouse score. If deferring behavior, provide a
   visible static shell or explicit affordance.
6. Prefer source-level fixes over post-build regex transforms.
7. Keep visual diffs at zero unless the visual change is intentional and accepted.

## Verification Commands

Add a canonical command early:

```bash
npm run verify
```

It should run:

```bash
npm run lint
npm run --prefix site-astro astro check
npm run build:fast
npm run smoke
npm run test:browser
npm run perf:check
```

For metric captures:

```bash
npm run perf:lighthouse
du -sh dist images/generated
find dist/images/generated -type f | awk -F. '{count[$NF]++} END {for (ext in count) print ext, count[ext]}'
```

## Phase 0 — Measurement And Hygiene

Purpose: make every later win measurable and remove local noise from the branch.

Work:

- Fix lint so CI can run through the full workflow.
- Add `npm run verify`.
- Update docs to use `npm run --prefix site-astro astro check`, not the missing
  `npm run --prefix site-astro check`.
- Decide whether `.perf-tmp/*` and `.claude/scheduled_tasks.lock` are committed
  artifacts or local-only artifacts; ignore them if local-only.
- Add a generated asset inventory script:
  - total generated image bytes
  - count by extension
  - top 25 largest files
  - files referenced by built HTML
  - unreferenced generated files

Verify:

- `npm run verify` exists and completes locally, except Lighthouse flake must be
  captured as a documented failure if it occurs.
- Asset inventory prints stable counts.

Acceptance:

- CI-equivalent command is one command.
- Dirty worktree is explainable after normal build/test runs.

Expected impact:

- Performance: no direct user-facing gain.
- Engineering: major reduction in false-green builds and audit noise.

## Phase 1 — Image Asset Diet

Purpose: remove the biggest source of bytes without changing visuals.

### Slice 1.1 — Choose One Fallback Strategy

Pick exactly one:

**Recommended conservative path:** AVIF + JPG/PNG fallback.

- Keep AVIF as the preferred source.
- Keep JPG/PNG fallback for maximum compatibility.
- Stop generating unreferenced WebP except required logo poster assets.
- Update docs to reflect this.

**Aggressive path:** AVIF + WebP fallback.

- Keep AVIF as preferred source.
- Use WebP as fallback.
- Stop generating JPG/PNG for optimized generated images.
- Update `<img src>` and `srcset` generation to point at WebP.
- Keep original non-generated content images untouched.

Acceptance for either path:

- Built HTML references only formats the asset optimizer emits.
- The optimizer deletes stale generated siblings it no longer owns.
- `dist/images/generated` has no stale files from the old strategy.

Expected impact:

- `dist`: `99.3MB -> 65-75MB` conservative, `50-65MB` aggressive.
- `images/generated`: `97MB -> 55-70MB` conservative, `40-55MB` aggressive.
- Deploy upload: `25-45%` smaller.

### Slice 1.2 — Width Audit

Work:

- For each generated family, record actual rendered max width:
  - logo
  - profile
  - adventure hero
  - adventure gallery
  - people cards
  - books covers
  - product images
  - podcast images
- Remove widths that are never selected by `srcset`.
- Add smaller mobile-first widths where current smallest variant is oversized.

Verify:

- Playwright visual smoke passes on desktop and mobile.
- `perf:lighthouse` total bytes do not regress.
- `dist` and `images/generated` drop.

Expected impact:

- `dist`: additional `8-20MB` reduction.
- Image bytes on collection/detail pages: `10-30%` lower.
- LCP on image-heavy pages: `50-200ms` lower.

### Slice 1.3 — Placeholder Strategy

Work:

- Generate tiny blurred placeholders or static low-quality previews for:
  - adventure map shell
  - image-heavy galleries
  - below-fold collection media
- Keep placeholders under `5-12KB` each.
- Avoid placeholders for pages where the real image already paints sub-600ms.

Expected impact:

- Perceived image load: noticeably smoother.
- CLS: lower risk from late image settlement.
- LCP: small direct gain, bigger subjective gain.

Phase 1 target:

- `dist <65MB` strong, `<50MB` extreme.
- `images/generated <55MB` strong, `<40MB` extreme.

## Phase 2 — Adventures Shell First

Purpose: make the heaviest page feel like a static page until the user asks for the map.

Work:

- Replace startup Leaflet mount with a static map shell:
  - static preview image or CSS-backed world map panel
  - clear "Load map" control
  - hover, focus, pointerdown, or click starts real map load
- Move Leaflet, marker cluster, route overlays, countries, and POIs behind the
  same intent boundary.
- Split `adventures-map.ts` into:
  - `adventures-map/state.ts`
  - `adventures-map/leaflet-loader.ts`
  - `adventures-map/markers.ts`
  - `adventures-map/routes.ts`
  - `adventures-map/pois.ts`
  - `adventures-map/controls.ts`
  - `adventures-map/index.ts`
- Keep route chunks lazy and load popular routes only after map intent.

Verify:

- Playwright adventures specs trigger map intent before asserting Leaflet.
- Visual baseline updated only for the intentional static shell.
- `perf:check` passes 3 consecutive runs.
- Lighthouse LCP element is not Leaflet/map canvas.

Acceptance:

- `/adventures` is usable before map JS.
- Map loads within `300-800ms` after intent on local dev.
- No console errors if the user never opens the map.

Expected impact:

- `/adventures` LCP: `1563ms -> 900-1200ms` strong, `700-900ms` extreme.
- Initial map-related JS/network: `70-150KB` deferred.
- Lighthouse `/adventures`: `95 -> 99-100`.
- Mobile responsiveness: noticeably better during first second.

## Phase 3 — Zero-JS Static Pages

Purpose: stop shipping startup JS to pages that only need content.

Work:

- Classify every page:
  - static content
  - light interaction
  - collection interaction
  - rich app/map
- Static content pages get:
  - no page script
  - no collection runtime
  - no newsletter runtime unless a form exists
  - theme/nav script trimmed to the smallest necessary inline bootstrap
- Defer analytics with `requestIdleCallback` or after `load`.
- Ensure forms still work without heavy app JS.

Candidate static pages:

- `/about.html`
- `/contact.html`
- `/health.html`
- `/reading-philosophy.html`
- `/people-philosophy.html`
- `/movie-philosophy.html`
- `/living-manifesto.html`
- `/north-star.html`
- `/notes.html`
- `/speeches.html`
- `/takes.html`
- `/weekly-review-template.html`

Verify:

- No console errors.
- Navigation/theme still works.
- Visual smoke passes.
- Per-page JS inventory shows no page-specific bundle for static pages.

Expected impact:

- Static-page startup JS: `10-40KB -> 0-5KB`.
- TBT remains `0ms` with more headroom.
- Mobile perceived load improves.
- `_astro` total: `236KB -> 180-210KB` after first pass.

## Phase 4 — Source-Level CSS Splitting

Purpose: make CSS small before post-build purge, not only after.

Work:

- Split legacy CSS into source bundles:
  - `core.css`: variables, base, nav, footer, typography
  - `static.css`: simple content pages
  - `collections.css`: grid/sidebar/modal shared rules
  - `taste.css`: books/movies/people/podcasts variants
  - `adventures.css`: cards, map shell, detail pages
  - `forms.css`: contact/newsletter/dateme
- `Base.astro` includes bundles by route class.
- Keep post-build purge as a safety net until source bundles stabilize.

Verify:

- CSS inventory per page.
- Visual diff zero for 8 baseline pages.
- Mobile screenshots for collection sidebar and nav.

Expected impact:

- Average first-visit CSS: `43.9KB -> 20-30KB` strong, `12-18KB` extreme.
- Static-page render-blocking CSS: `10-20KB`.
- Repeat-page CSS roughly unchanged or slightly better.

## Phase 5 — Remove Post-Build HTML Normalization

Purpose: make source equal output so performance work is predictable.

Work:

- Move these responsibilities from `normalize-astro-html.js` into Astro source:
  - optimized picture rendering
  - remote asset localization
  - CTA data attributes
  - SEO-related placement
  - static Leaflet/font stripping
- Create reusable helpers/components:
  - `OptimizedImage.astro`
  - `RemoteImage.astro`
  - `TrackedLink.astro`
  - `SeoRelatedSlot.astro`
- Keep the normalizer in warn-only mode for one release:
  - report mutations it would have made
  - fail if mutations are still required after migration

Verify:

- Build output diff against previous accepted output.
- SEO head and JSON-LD still match expected structure.
- Visual smoke and Playwright pass.

Expected impact:

- HTML size: `5-15%` lower on image-heavy pages.
- Build complexity: materially lower.
- Future image changes become safer and faster.

## Phase 6 — Type And Module Cleanup

Purpose: make refactors safe enough to keep pushing performance.

Work:

- Remove `@ts-nocheck` from small scripts first:
  - `sanitize.ts`
  - `data-fetch.ts`
  - `analytics.ts`
  - `action-dispatcher.ts`
  - `grid-zoom.ts`
- Then collection scripts:
  - `books.ts`
  - `people.ts`
  - `podcasts.ts`
  - `essays.ts`
  - `letterboxd.ts`
- Last:
  - `adventures.ts`
  - `adventures-map/*`
  - `dateme.ts`
- Replace `window.JG*` service-locator reads with explicit imports.
- Keep only true public browser APIs on `window`.

Verify:

- `astro check` stays `0 errors`.
- Playwright behavior passes after each file or small group.

Expected impact:

- Direct payload gain: modest, `5-25KB`.
- Regression risk: large reduction.
- More tree-shaking opportunities in later work.

## Phase 7 — Instant Navigation

Purpose: make second-page navigation feel under 200ms.

Work:

- Add link prefetch on:
  - pointerenter
  - focus
  - touchstart
  - high-confidence nav links
- Cache only HTML and route assets, not huge gallery images.
- Avoid prefetch on data-saver or slow connection.
- Keep service worker conservative:
  - hashed assets cache-first
  - HTML network-first with short timeout
  - no aggressive stale content for pages

Verify:

- Manual browser timing for common paths:
  - home -> books
  - books -> people
  - adventures -> adventure detail
  - people -> person detail
- No excessive network on idle page.
- Data saver path disables prefetch.

Expected impact:

- Repeat navigation perceived latency: `100-250ms`.
- Cold first page unchanged.
- More "instant" feel during browsing sessions.

## Final Expected Metrics

### Strong Outcome

| Metric | Current | Strong Outcome |
|---|---:|---:|
| `dist` budget size | `99.3MB` | `50-65MB` |
| `dist` on disk | `~120MB` | `60-75MB` |
| `images/generated` | `~97MB` | `45-55MB` |
| `_astro` assets | `~236KB` | `150-180KB` |
| Avg first-visit CSS | `~43.9KB` | `20-30KB` |
| `/adventures` LCP | `~1563ms` | `900-1200ms` |
| Collection LCP | `850-1100ms` | `650-850ms` |
| Static-page JS | current global/page scripts | `0-10KB` |

### Extreme Outcome

| Metric | Current | Extreme Outcome |
|---|---:|---:|
| `dist` budget size | `99.3MB` | `<50MB` |
| `dist` on disk | `~120MB` | `<60MB` |
| `images/generated` | `~97MB` | `<40MB` |
| `_astro` assets | `~236KB` | `<130KB` |
| Avg first-visit CSS | `~43.9KB` | `12-18KB` |
| `/adventures` LCP | `~1563ms` | `700-900ms` |
| Collection LCP | `850-1100ms` | `550-700ms` |
| Repeat navigation | normal static navigation | `<200ms` perceived |

## Recommended Execution Order

1. Phase 0: measurement and hygiene.
2. Phase 1: image asset diet.
3. Phase 2: adventures shell-first map.
4. Phase 4: source-level CSS splitting.
5. Phase 3: zero-JS static pages.
6. Phase 5: remove post-build normalization.
7. Phase 6: type and module cleanup.
8. Phase 7: instant navigation.

The order is intentionally byte wins first, startup-work wins second, architecture
cleanup third. That keeps the site fast while lowering risk over time.

## Rollback Strategy

Each slice should land independently. If a slice regresses visuals or behavior:

- revert the slice commit
- keep captured metric output
- write the failure into the plan under a "Lessons" note
- do not stack another performance slice on top until the failure is understood

## Definition Of Done

The instant-load project is done when:

- `npm run verify` is green
- `dist` is under the accepted target
- `/adventures` Lighthouse is `99-100` across repeated runs
- static pages have no page-specific startup JS
- average first-visit CSS is under target
- generated assets have no stale unreferenced siblings
- navigation between common pages feels sub-200ms on repeat visits
- the post-build HTML normalizer is removed or warn-only with zero mutations
