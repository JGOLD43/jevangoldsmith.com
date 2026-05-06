# Code Optimization Execution Plan

Status: `ready to execute`
Audience: `engineering`, `agents`
Purpose: `make the current fast site lighter, simpler, and safer without changing product behavior`

## Goal

The site already feels fast. This plan is the next code-only pass: reduce bytes,
remove build cleverness, improve type safety, and make future performance work
boringly safe.

Non-goals:

- redesigning pages
- changing content strategy
- changing navigation or information architecture
- chasing Lighthouse vanity at the cost of maintainability
- removing browser support without an explicit decision

## Current Metrics

Captured after Instant Load pass 1 on May 5, 2026.

| Metric | Current |
|---|---:|
| `dist` budget-reported size | `74.3MB` |
| `dist` on disk | `~90MB` |
| `images/generated` on disk | `~70MB` |
| Generated WebP files | `4` |
| Unreferenced generated files | `555` |
| Average first-visit CSS after purge | `43.5KB` |
| Average repeat-page CSS | `5.6KB` |
| Post-build HTML mutations | `82/82` |
| Lighthouse scores | `98-100` |
| TBT | `0ms` on measured routes |
| Worst measured LCP | `~1073ms` |

Latest measured route table:

| Route | Score | LCP | CLS | TBT | Bytes |
|---|---:|---:|---:|---:|---:|
| `/` | `100` | `629ms` | `0.000` | `0ms` | `548.5KB` |
| `/books.html` | `98` | `891ms` | `0.058` | `0ms` | `1394.4KB` |
| `/movies.html` | `100` | `565ms` | `0.000` | `0ms` | `568.6KB` |
| `/people.html` | `99` | `814ms` | `0.001` | `0ms` | `1960.6KB` |
| `/adventures.html` | `99` | `1010ms` | `0.000` | `0ms` | `693.7KB` |
| `/podcasts.html` | `98` | `1073ms` | `0.000` | `0ms` | `731.6KB` |
| `/essays.html` | `100` | `606ms` | `0.000` | `0ms` | `234.3KB` |
| `/search.html` | `100` | `643ms` | `0.007` | `0ms` | `315.9KB` |

## Target Metrics

Strong target:

| Metric | Target |
|---|---:|
| `dist` budget-reported size | `<65MB` |
| `dist` on disk | `<75MB` |
| `images/generated` | `<55MB` |
| Unreferenced generated files | `<100` |
| Average first-visit CSS | `<32KB` |
| Static-page page-specific JS | `0-5KB` |
| Post-build HTML mutations | `0/82` or normalizer warn-only |
| Lighthouse scores | `98-100` |
| TBT | `0ms` |
| Worst measured LCP | `800-950ms` |

Stretch target:

| Metric | Target |
|---|---:|
| `dist` budget-reported size | `<55MB` |
| `dist` on disk | `<65MB` |
| `images/generated` | `<45MB` |
| Average first-visit CSS | `<25KB` |
| Worst measured LCP | `<850ms` |

## Operating Rules

1. Keep behavior identical unless a phase explicitly says otherwise.
2. Do byte-winning work before architecture-heavy work.
3. Do not hand-edit `dist/`; it is generated output.
4. Keep `normalize-astro-html.js` as a safety net until source output matches it.
5. Every phase must have a primary metric, a verifier, and a rollback path.
6. If visual tests fail, stop and inspect before stacking more changes.
7. Prefer source-level APIs over post-build regular expressions.
8. Remove `@ts-nocheck` gradually; do not mass-rewrite legacy scripts in one step.

## Canonical Verification

Run before and after every major phase:

```bash
npm run verify
```

Minimum targeted checks while iterating:

```bash
npm run lint
npm run check
npm run build:fast
npm run assets:inventory
```

Use these for metric captures:

```bash
npm run perf:lighthouse
du -sh dist images/generated
find dist/images/generated -type f | sed 's/.*\.//' | sort | uniq -c
```

## Phase 0: Measurement Hardening

Purpose: make regressions obvious before touching architecture.

Work:

- Extend asset inventory to report:
  - generated files referenced from built HTML
  - generated files referenced from content/runtime JSON
  - generated files not reachable from any known source
  - top files by byte size
- Add JS/CSS inventory by route:
  - linked CSS bytes
  - linked JS bytes
  - dynamic import chunk bytes
- Write one summary file after `npm run verify`, for example:
  - `.perf-tmp/code-optimization-current.md`

Primary metric:

- Route-level asset table exists and is stable.

Acceptance:

- `npm run verify` still passes.
- Inventory output explains `dist`, CSS, JS, and generated image size.

Expected user-visible behavior change:

- None.

Rollback:

- Revert only the inventory scripts.

## Phase 1: Asset Pipeline V2

Purpose: win the largest remaining byte reduction with minimal UX risk.

Work:

- Build a generated-asset reachability graph from:
  - Astro source
  - content JSON
  - route split manifests
  - remote asset manifest
  - built HTML
  - runtime data files fetched by page scripts
- Add a dry-run prune mode:

```bash
npm run assets:inventory -- --prune-dry-run
```

- Add a confirmed prune mode only after dry-run is clean:

```bash
npm run assets:prune
```

- Audit generated widths against actual rendered sizes:
  - logo
  - hero/profile images
  - book covers
  - people cards
  - product cards
  - podcast covers
  - adventure cards and detail galleries
- Remove never-selected widths.
- Keep conservative image compatibility: AVIF preferred, JPG/PNG fallback.
- Keep only intentional logo WebP assets.

Primary metrics:

- `images/generated`
- `dist` budget size
- unreferenced generated file count

Expected metric change:

| Metric | Current | Expected |
|---|---:|---:|
| `images/generated` | `~70MB` | `45-55MB` |
| `dist` budget size | `74.3MB` | `60-68MB` |
| Unreferenced generated files | `555` | `0-100` |
| Image-heavy route bytes | current | `10-30%` lower |

Acceptance:

- `npm run assets:inventory` reports no unexpected stale generated assets.
- `npm run build:fast` passes.
- Playwright visual tests pass.
- No runtime 404s for generated images.

Expected user-visible behavior change:

- None intended.

Risk:

- A runtime-loaded image gets pruned because it is not visible in built HTML.

Mitigation:

- Treat runtime JSON as a first-class root in the reachability graph.
- Run browser tests and smoke all JSON-driven pages.

Rollback:

- Restore optimizer width settings and generated assets by rerunning previous
  `npm run assets:optimize`.

## Phase 2: Source-Native Image Rendering

Purpose: move image output into Astro source so post-build rewriting becomes unnecessary.

Work:

- Add `site-astro/src/components/OptimizedImage.astro`.
- Add `site-astro/src/components/RemoteImage.astro` if remote/localized images
  need a distinct interface.
- The component API should require:
  - `src`
  - `alt`
  - `width`
  - `height`
  - `sizes`
  - optional `loading`
  - optional `fetchpriority`
  - optional class names
- The component should emit:
  - AVIF source where generated
  - JPG/PNG fallback
  - no WebP except explicitly allowed logo assets
- Migrate high-traffic image surfaces first:
  - home
  - books
  - people
  - adventures
  - podcasts
- Keep `normalize-astro-html.js` active after each slice and inspect mutation count.

Primary metrics:

- post-build image mutation count
- image-heavy HTML byte size

Expected metric change:

| Metric | Current | Expected |
|---|---:|---:|
| Post-build image rewrites | broad | near zero for migrated pages |
| Image-heavy HTML | current | `5-15%` smaller |
| Runtime remote image leaks | none expected | none |

Acceptance:

- Migrated pages are visually unchanged.
- HTML image output matches expected format before normalizer runs.
- `npm run verify` passes.

Expected user-visible behavior change:

- None intended.

Risk:

- A component emits subtly different `sizes` or fallback order.

Mitigation:

- Snapshot built HTML for representative image blocks.
- Use visual tests on desktop and mobile.

Rollback:

- Revert migrated page/component changes; keep normalizer.

## Phase 3: Remove Post-Build HTML Normalization

Purpose: make Astro output the final source of truth.

Work:

- Move these normalizer responsibilities into source:
  - optimized image/picture rendering
  - remote asset localization
  - tracked CTA attributes
  - SEO-related placement
  - Field Notes CTA insertion
  - external font stripping
  - static Leaflet stripping
- Add a normalizer check mode:

```bash
npm run normalize:html -- --check
```

- Change build flow from mutate mode to check mode once mutations are zero.
- Remove normalizer from build only after one clean verification cycle.

Primary metric:

- post-build HTML mutations.

Expected metric change:

| Metric | Current | Expected |
|---|---:|---:|
| Mutated HTML files | `82/82` | `0/82` |
| Build predictability | post-build mutation | source-native output |

Acceptance:

- Normalizer check reports zero required mutations.
- SEO-related sections are in the intended DOM position.
- CTA analytics attributes still exist.
- JSON-LD still validates structurally.
- `npm run verify` passes.

Expected user-visible behavior change:

- None intended.

Risk:

- SEO or CTA behavior drifts.

Mitigation:

- Add targeted smoke assertions for CTA attributes and SEO-related placement.

Rollback:

- Restore normalizer mutate mode in `build` and `build:fast`.

## Phase 4: TypeScript Cleanup

Purpose: make the type gate meaningful and reduce future refactor risk.

Work order:

1. Remove `@ts-nocheck` from small utilities:
   - `analytics.ts`
   - `data-fetch.ts`
   - `sanitize.ts`
   - `action-dispatcher.ts`
   - `grid-zoom.ts`
2. Then collection helpers:
   - `collection-helpers.ts`
   - `collection-runtime.ts`
   - `collection-ui.ts`
3. Then page runtimes:
   - `books.ts`
   - `people.ts`
   - `podcasts.ts`
   - `essays.ts`
   - `letterboxd.ts`
4. Leave Adventures and Dateme until last.

Rules:

- One small group per change.
- Prefer explicit imports/exports over new globals.
- Keep only true public browser APIs on `window`.
- Do not silence errors with broad `any` unless the boundary is genuinely dynamic.

Primary metrics:

- number of `@ts-nocheck` files
- `astro check` errors/warnings/hints

Expected metric change:

| Metric | Current | Expected |
|---|---:|---:|
| `@ts-nocheck` scripts | many | steadily lower |
| JS bytes | current | `5-20KB` possible reduction |
| Type-check value | weak in legacy scripts | materially stronger |

Acceptance:

- `npm run check` returns `0 errors`, `0 warnings`, `0 hints`.
- Playwright behavior tests pass after each group.
- No new console errors.

Expected user-visible behavior change:

- None.

Risk:

- Surfacing implicit legacy globals may require small architecture choices.

Mitigation:

- Start with utility files.
- Avoid changing Adventures until supporting modules are cleaner.

Rollback:

- Revert the specific script group.

## Phase 5: Adventures Map Module Split

Purpose: preserve the successful lazy-map behavior while making the rich runtime easier to optimize.

Work:

- Split `adventures-map.ts` into:
  - `adventures-map/map-state.ts`
  - `adventures-map/leaflet-loader.ts`
  - `adventures-map/markers.ts`
  - `adventures-map/routes.ts`
  - `adventures-map/pois.ts`
  - `adventures-map/controls.ts`
  - `adventures-map/index.ts`
- Keep the public browser API stable:
  - `window.AdventuresMap.ensureWorldMap`
  - existing tests should need minimal changes
- Keep initial `/adventures.html` static-shell-first.
- Load routes, POIs, and overlays only after map intent.

Primary metrics:

- initial Adventures route bytes
- post-intent map startup time
- map module size by chunk

Expected metric change:

| Metric | Current | Expected |
|---|---:|---:|
| Initial Adventures route bytes | `693.7KB` measured | same or lower |
| Map startup after intent | current | `100-300ms` easier to improve |
| Code reviewability | one large module | smaller modules |

Acceptance:

- Adventures shell still renders without map JS.
- Map loads after pointer/focus/click intent.
- Map markers/routes/POIs still render.
- Adventures Playwright tests pass.

Expected user-visible behavior change:

- No initial-page behavior change.
- Map may open faster after intent.

Risk:

- Splitting state incorrectly can break map layers.

Mitigation:

- Keep API stable first; only optimize chunking after behavior is green.

Rollback:

- Revert the module split.

## Phase 6: Source CSS Bundles

Purpose: reduce render-blocking CSS at the source level, not only after purge.

Work:

- Split `site-astro/public/css/legacy-style.css` source ownership into:
  - `core.css`: variables, reset, base type, nav, footer
  - `static.css`: simple content page layouts
  - `collections.css`: sidebar/grid/card/modal primitives
  - `adventures.css`: Adventures shell/cards/detail/map styles
  - `forms.css`: contact/newsletter/forms
- Add a route-to-css-bundles helper in Astro source.
- Keep post-build purge as a safety net until bundle split is stable.
- Do not attempt heroic micro-splitting in this pass.

Primary metrics:

- average first-visit CSS
- static-page CSS bytes
- visual regression count

Expected metric change:

| Metric | Current | Expected |
|---|---:|---:|
| Average first CSS | `43.5KB` | `25-32KB` |
| Static-page CSS | current | `15-22KB` |
| LCP/FCP | current | `20-100ms` better on slower devices |

Acceptance:

- Visual snapshots pass on baseline routes.
- Mobile nav/sidebar behavior is unchanged.
- CSS byte inventory hits target or clearly explains misses.

Expected user-visible behavior change:

- None intended.

Risk:

- Missing selectors cause visual regressions.

Mitigation:

- Split by route class first, not by tiny component.
- Keep purge and visual tests active.

Rollback:

- Restore the single legacy stylesheet.

## Phase 7: Static Page JS Diet

Purpose: make simple pages as close to HTML plus CSS as practical.

Work:

- Classify pages:
  - static content
  - light interaction
  - collection interaction
  - rich app
- Static content pages should not load page-specific bundles.
- Keep nav/theme behavior working.
- Keep analytics idle-loaded.
- Keep service worker/speculation rules only if measured benefit still exceeds
  their small cost.

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

Primary metrics:

- page-specific JS on static pages
- console errors
- nav/theme behavior

Expected metric change:

| Metric | Current | Expected |
|---|---:|---:|
| Static-page page-specific JS | small scripts/global chrome | `0-5KB` |
| TBT | `0ms` | `0ms` |
| Low-end consistency | good | better |

Acceptance:

- Static pages render and navigate without console errors.
- Theme toggle works.
- Mobile nav works.
- Analytics still records after idle or first interaction.

Expected user-visible behavior change:

- None intended.

Risk:

- Removing a small script that a page implicitly depended on.

Mitigation:

- Use route classification and per-page browser smoke.

Rollback:

- Restore the previous page script mapping.

## Final Definition Of Done

This code-only optimization pass is done when:

- `npm run verify` passes.
- `npm run check` returns `0 errors`, `0 warnings`, `0 hints`.
- `npm run lint` passes.
- `npm run build:fast` passes.
- `npm run assets:inventory` hits or explains target misses.
- `dist` budget-reported size is `<65MB`.
- `images/generated` is `<55MB`.
- Average first-visit CSS is `<32KB`.
- Static pages have `0-5KB` page-specific JS.
- Normalizer is either removed or check-only with zero mutations.
- Lighthouse routes stay `98-100`.
- TBT remains `0ms`.
- Playwright tests pass.
- Browser spot-check confirms no visible behavior changes.

## Recommended Execution Order

1. Phase 0: Measurement hardening.
2. Phase 1: Asset Pipeline V2.
3. Phase 2: Source-native image rendering.
4. Phase 3: Remove post-build normalization.
5. Phase 4: TypeScript cleanup.
6. Phase 5: Adventures map module split.
7. Phase 6: Source CSS bundles.
8. Phase 7: Static page JS diet.

The order is intentionally conservative: bytes first, source correctness second,
type/module safety third, CSS/runtime risk last.

## Rollback Strategy

Each phase should land independently. If a phase fails:

- stop stacking changes
- capture the metric output
- revert only that phase
- document the failure in this file under `Execution Notes`
- rerun `npm run verify`

## Execution Notes

Use this section to record actual metric deltas as phases land.

| Date | Phase | Result | Metrics |
|---|---|---|---|
| 2026-05-05 | Plan created | Ready to execute | Baseline captured above |
