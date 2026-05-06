# Simplify + Performance Execution Plan

Status: `proposed`
Audience: `engineering`, `agents`
Purpose: `next planned engineering arc — measurable performance wins + targeted code simplification, ordered by risk-adjusted value`

## Goal

Move the now-Astro-native site from "works correctly" to "runs measurably
faster + is meaningfully simpler to evolve." The previous plan
(`NATIVE_ASTRO_EXECUTION_PLAN.md`) eliminated structural debt: 33 → 0 legacy
JS files, 17 → 0 page bundles, 30,881 → 17,275 source lines. This plan
takes the next step: **shrink user-facing payload, eliminate observable
runtime regressions, then tighten the code surface**.

## Non-Goals

- No redesign, URL changes, SEO changes, JSON-LD/RSS changes.
- No move to SSR-on-edge / serverless rendering.
- No rewrite of working code for stylistic preference. Every change must
  pay either a runtime perf bill or a maintenance bill in measurable
  terms.
- No speculative tooling additions (Lighthouse CI is justified by
  measuring; everything else justifies itself per phase).

## Operating Principles

1. **Measure before refactoring.** Phase 0 is non-skippable.
2. **Pay down observable regressions before stylistic ones.** A 22KB
   payload cut beats a 200-line type-annotation pass.
3. **One slice, one verifier.** Every phase ships a check that proves
   the win or fails loud.
4. **Visual + behavioral parity is acceptance.** Ship behind a Playwright
   smoke gate where rendered output could shift.
5. **Independent rollback.** No phase blocks a deploy if the next phase
   regresses.

---

## Phase 0 — Establish baseline

Before optimizing, lock in what "good" looks like today.

**Work:**

- Add `lighthouse-ci` (or `@unlighthouse/core`) as a devDep.
- Run Lighthouse against `http://localhost:8765/` for the 8 highest-
  traffic routes: `/`, `/books`, `/movies`, `/people`, `/adventures`,
  `/podcasts`, `/essays`, `/search`.
- Capture LCP, CLS, INP, TBT, Total Bytes per page.
- Commit results to `docs/perf-baseline-2026-05.md` with the build hash.
- Add `npm run perf:lighthouse` that re-runs the suite.

**Acceptance:**

- A signed-off baseline document with numbers per page.
- Phase 1's success criteria can be defined against these numbers.

**Risk / rollback:** none — read-only measurement.

**Why first:** every Phase 1+ win is reported as a delta against this
baseline. Without it, "we made it faster" is unverifiable.

---

## Phase 1 — User-facing payload cuts

Three changes with concrete byte savings, ordered by ratio of impact to
risk.

### Slice 1.1 — Lazy-load DOMPurify (low risk)

Today, `site-astro/src/scripts/sanitize.js` includes DOMPurify and is
imported by 8 pages. Only `essays.astro` ever calls `sanitizeHTML`. Net:
~22KB of unused JS shipped to 7 pages.

**Work:**

- Split `sanitize.js` into:
  - `sanitize.js` — `escapeHTML`, `escapeAttr`, `sanitizeUrl` only (~3KB chunk)
  - `sanitize-html.ts` — `sanitizeHTML` + `import DOMPurify from 'dompurify'`
- Import `sanitize-html.ts` only from `essays.astro` and `essays.js`.
- Remove the `window.sanitizeHTML` exposure from the small chunk (essays
  module is the only caller).

**Verify:**

- Run `npm run smoke` against dist. Ensure essays renders rich content
  unchanged.
- Inspect built `_astro/sanitize.HASH.js` chunk — should be < 5KB.
- Re-run Lighthouse on `/books`. Confirm Total Bytes drops by ~20KB.

**Acceptance:**

- `dist/_astro/sanitize.HASH.js` < 5KB.
- Essays page renders sanitized HTML identically (visual diff via
  Phase 6 smoke).
- Lighthouse Total Bytes on `/books` decreases by ≥ 18KB.

**Rollback:** revert two file diffs.

### Slice 1.2 — Build-time Letterboxd merge (medium risk)

Movies page currently fetches Letterboxd RSS at runtime via the
allorigins.win CORS proxy. The fetch is slow (~600ms median in dev),
sometimes fails, and causes layout shift when 6 SSR'd cards expand to
~40 fetched cards.

**Work:**

- Move the RSS parse into `scripts/sync-letterboxd.js` (existing
  `enrich-movies.js` already does part of this — extend it).
- Run nightly (cron) or on-demand. Output to
  `data/movies-letterboxd.generated.json`.
- Have `letterboxd.js` detect already-populated grid (mirror books'
  pattern) and skip its initial render.
- Add a perf budget for `data/movies-letterboxd.generated.json`.

**Verify:**

- Movies page renders all cards from SSR. Open DevTools Network — no
  call to `allorigins.win`.
- Lighthouse CLS on `/movies` < 0.05.

**Acceptance:**

- No runtime call to `allorigins.win` from `/movies`.
- Movies CLS ≤ baseline; ideally drops below 0.05.
- Build still completes in < 15s.

**Rollback:** revert the .astro change. Page falls back to runtime fetch.

### Slice 1.3 — Build-time book-author merge for /people (medium risk)

People page SSRs 12 cards, then runtime fetches 4 JSON files (people +
books generated + movies + profiles), merges them into 98 cards, and
**wipes the SSR'd grid**. Big CLS hit.

**Work:**

- Build a generator at `scripts/build/merge-people.js` that runs the
  current `mergeBookPeople` logic at build time.
- Output to `data/people.merged.generated.json`.
- Update `people.astro` to SSR all 98 cards from the merged file.
- Update `people.js` to detect populated grid (already has the skip
  branch from Phase 6 slice 3 — just bump the count comparison).

**Verify:**

- View-source on `/people` shows 98 SSR'd `.person-card` elements.
- No runtime DOM wipe of `#people-grid`.
- Lighthouse CLS on `/people` < 0.05.

**Acceptance:**

- 98 SSR'd cards on initial HTML.
- People CLS drops below 0.05.
- People runtime JSON fetches reduce by 3 (people.json + books.generated +
  profiles still needed for the detail modal; book-people inferred fetch
  goes away).

**Rollback:** revert people.astro + people.js diffs. Cards fall back to
runtime merge.

### Phase 1 acceptance gate

Before Phase 2 begins:

- All 3 slices land or get explicitly deferred with a recorded reason.
- Lighthouse re-run shows total-bytes decrease across the 3 affected
  pages averaging ≥ 15KB.
- CLS on `/people` and `/movies` ≤ 0.05.
- No regression in any other Lighthouse metric on any other page.

---

## Phase 2 — CSS retirement (depends on Phase 6)

The biggest payload on every page is now CSS, not JS. `legacy-style.css`
is 190KB and is loaded with `fetchpriority=high` on every page. It exists
because `collection-chrome.ts` (845 lines of TypeScript-as-HTML) emits
chrome via `<Fragment set:html>`, which prevents Astro's per-component
CSS scoping from working.

This is the biggest single LCP improvement available — but also the
highest-risk slice in the plan.

**Prerequisite:** Phase 6 (Playwright behavioral smoke) must land first.
Visual diff is essential here.

### Slice 2.1 — Build CollectionShell + CollectionMain + CollectionSidebar Astro components

**Work:**

- Build `CollectionShell.astro` with `<slot name="sidebar" />` and
  `<slot />` for main content.
- Build `CollectionSidebar.astro` accepting the sidebar config and
  emitting the same DOM structure the legacy chrome produces.
- Build `CollectionMain.astro` accepting header config + body slot.
- These components own their CSS via Astro `<style>` blocks (scoped).
- Mirror class names exactly so the existing JS/CSS still resolves.

**Verify:**

- `astro check` clean.
- Build green.
- Run Playwright behavioral smoke on `/books`, `/movies`, `/people`,
  `/podcasts`, `/essays` — all assertions pass.

**Acceptance:**

- 5 collection pages still pass smoke harness + Playwright behavioral.
- View-source markup byte-equivalent (whitespace tolerated).

### Slice 2.2 — Migrate one page (books) to the new components

Single-page proof. Visual-diff against current dist.

**Work:**

- Convert `books.astro` to use `<CollectionShell>` + `<CollectionSidebar>`
  + `<CollectionMain>` with the existing config object.
- Generate Playwright visual snapshot before + after. Diff must be
  zero pixels (or tolerate <1% difference for font subpixel rounding).

**Verify:**

- Visual diff passes.
- Book filter modal still opens.
- Carousel still animates.
- BooksState API unchanged.

**Acceptance:** visual diff zero or <1%; behavioral smoke passes.

### Slice 2.3 — Migrate remaining 6 collection pages

Mechanical: movies, people, podcasts, essays, projects, challenges.

### Slice 2.4 — Retire `chrome-legacy.css` and `pages-legacy.css`

Once chrome is rendered by scoped Astro components, the global CSS
override sheets become dead. Delete or shrink:

- `site-astro/src/styles/chrome-legacy.css`
- `site-astro/src/styles/pages-legacy.css`

**Verify:**

- `dist/css/legacy-style.css` shrinks from 190KB to a target of
  < 60KB (only typography + tokens + non-component styles).
- Lighthouse LCP on `/books`, `/movies`, `/people` decreases by 200-
  500ms (depending on connection speed simulated).

**Acceptance:**

- `legacy-style.css` < 60KB.
- LCP on at least 4 of 8 baseline pages improves by ≥ 100ms.

**Rollback:** keep the legacy stylesheets in place; revert the chrome
components on a per-page basis.

### Phase 2 acceptance gate

- All 7 collection pages on real Astro components.
- `legacy-style.css` < 60KB (down from 190KB).
- Visual-diff Playwright smoke shows zero pixel-diff (or < 1%) on every
  migrated page.
- No regression on any other Lighthouse metric.

---

## Phase 3 — Code surface tightening (low user-facing risk)

These don't move user-facing perf much (~5% bundle savings), but they
make the codebase tractable to evolve. Ordered to compound.

### Slice 3.1 — Replace `window.JG*` globals with named ES exports

Today: `window.JGCollectionRuntime = { create }`. Consumers call
`window.JGCollectionRuntime.create(config)`. Vite can't tree-shake the
non-`create` functions.

**Work:**

- For each of `JGActions`, `JGAnalytics`, `JGCollectionHelpers`,
  `JGCollectionRuntime`, `JGCollectionUI`, `JGDataFetch`, `JGGridZoom`,
  `JGTaskList`:
  - Convert the file to use `export function X` instead of
    `window.JGX = { X }`.
  - Update all consumers to `import { X } from './lib/Y.js'`.
- Keep the `window.JGX` exposure as a backwards-compat shim for one
  release if needed.

**Verify:**

- `astro check` clean.
- Smoke harness 19/19 dev + dist.
- Bundle inspection: shared chunks shrink by 5-15% (varies by chunk).

**Acceptance:**

- All 8 `window.JG*` namespaces consumed via `import` in at least one
  module.
- No new console errors on any page.
- Total page-modules JS bytes (sum across `_astro/*.js`) decreases by
  ≥ 8KB.

### Slice 3.2 — Convert `site-astro/src/scripts/*.js` to `.ts`

21 files; mostly mechanical. Catch: implicit `any` will surface.
Existing `astro check` already shows 10 hints from these files; they'll
become errors under strict mode.

**Work:**

- Rename `.js` → `.ts` one file at a time.
- Add minimal type annotations to silence strict errors.
- Don't aggressively type — use `unknown` + narrowing rather than
  pervasive `any`.

**Verify:**

- `astro check` 0/0/0.
- Smoke 19/19.
- Compile output byte-equivalent (TS strips at compile time).

**Acceptance:** all files in `site-astro/src/scripts/` are TS; `astro
check` clean.

### Slice 3.3 — Adventures: globalThis → state object

After Slice 3.2, the 27 `globalThis.X = Y` assignments in `adventures.ts`
become awkward. Replace with a typed state module:

```ts
// adventures-state.ts
export const state = {
  allAdventures: [] as Adventure[],
  mapFilters: { ...DEFAULT_FILTERS },
  // ...
};
```

Update all readers/writers to import + mutate state properties.

**Acceptance:** zero `globalThis.X = ` assignments in `adventures.ts`;
adventure page still renders 7 cards; map still loads.

### Slice 3.4 — Wire Phase 2 normalized contracts into card renderers

`content-types.ts` and `collection-normalizers.ts` shipped in Phase 2 but
no page consumes them. Migrate `book-card.ts`, `podcast-card.ts`,
`person-card.ts`, `free-resources-render.ts` to take `NormalizedItem`
instead of per-collection types.

**Acceptance:** removing `book-card.ts`'s `Book` interface in favor of
`NormalizedItem` doesn't break the build.

### Phase 3 acceptance gate

- 0 `window.JG*` global declarations remain in source.
- `astro check` 0/0/0 with all `site-astro/src/scripts/*.ts`.
- Adventures page free of `globalThis.X = ` assignments.
- Card renderers consume `NormalizedItem` from `content-types.ts`.

---

## Phase 4 — Validation infrastructure

Builds the safety net that Phases 2 and 5 rely on.

### Slice 4.1 — Playwright behavioral smoke

Today: `scripts/smoke-check.js` checks structural anchors (`id="..."`).
That couldn't catch the `escapeAttr is not defined` regression we hit
during Phase 7. Need real browser tests.

**Work:**

- `playwright.config.ts` pointing at `http://localhost:8765`.
- Test files at `tests/playwright/`:
  - `home.spec.ts` — hero loads, nav links.
  - `books.spec.ts` — 122 cards render, filter buttons change visibility,
    book modal opens.
  - `movies.spec.ts` — Letterboxd cards present (post-Phase 1.2 SSR'd),
    modal opens.
  - `people.spec.ts` — 98 cards (post-Phase 1.3), filter changes count.
  - `adventures.spec.ts` — 7 cards, sidebar toggles, mobile-tab toggles
    (skip map markers — leaflet is heavy).
  - `search.spec.ts` — `?q=naval` returns 4 results.
- Wire as `npm run test:browser`.

**Acceptance:** all specs pass against current dist.

### Slice 4.2 — Visual diff harness

Required gate for Phase 2.4.

**Work:**

- Add `tests/visual-baselines/` (already exists from main; restore
  baseline images for current dist).
- `npm run check:visual:capture` regenerates from current dist.
- `npm run check:visual` diffs current dist vs baseline.

**Acceptance:** baseline captured for 8 pages; check passes against
current dist.

### Slice 4.3 — CI gates

Trigger lint + astro check + build:fast + smoke + behavioral on every
PR.

**Work:**

- `.github/workflows/test.yml` runs:
  - `npm ci`
  - `npm run lint`
  - `npm run --prefix site-astro astro check`
  - `npm run build:fast`
  - `npm run smoke` (against http-server-served dist)
  - `npm run test:browser` (Playwright)
- Optionally upload Lighthouse report as artifact.

**Acceptance:** PR-creation triggers the workflow; failure blocks merge.

---

## Phase 5 — Cleanup work

After Phase 1-4 land, mop-up:

- **Slice 5.1**: delete `site-astro/src/legacy/` (14 raw HTML fragments
  imported via `?raw`). Each fragment moves into the corresponding
  Astro page or component as inline JSX.
- **Slice 5.2**: standardize escape-helper import pattern. Replace the
  per-file `function escapeHTML` definitions in `movie-stats.ts`,
  `cool-shit.ts`, `youtube.ts` with imports from
  `site-astro/src/scripts/lib/sanitize.js`.
- **Slice 5.3**: audit `data/site.config.json` for keys still consumed
  by Astro source. Prune the rest.
- **Slice 5.4**: remove unused deps from `site-astro/package.json` and
  root `package.json`.

Each slice is independent. None gates on the others.

---

## Phase 6 — Long-term observability

Not a one-time slice. Establishes:

- Lighthouse CI runs on every PR (added in Phase 0; wired into CI in
  Phase 4.3).
- Perf-budget script (already running) tracks JS/CSS/JSON sizes per
  build.
- Smoke + behavioral + visual diff catch regressions.

If a future change regresses LCP > 100ms or CLS > 0.05, the budget
alert fires.

---

## Sequencing summary

```
Phase 0          ─ measure
   │
   ▼
Phase 1          ─ user payload cuts
   │  ├─ 1.1 lazy DOMPurify
   │  ├─ 1.2 letterboxd build-time
   │  └─ 1.3 people build-time merge
   ▼
Phase 4          ─ validation infra (gates Phase 2)
   │  ├─ 4.1 Playwright behavioral
   │  ├─ 4.2 visual diff
   │  └─ 4.3 CI gates
   ▼
Phase 2          ─ CSS retirement
   │  ├─ 2.1 components
   │  ├─ 2.2 books migration
   │  ├─ 2.3 6 more pages
   │  └─ 2.4 retire legacy CSS
   ▼
Phase 3          ─ code surface
   │  ├─ 3.1 ES exports
   │  ├─ 3.2 TypeScript
   │  ├─ 3.3 adventures state
   │  └─ 3.4 normalized contracts
   ▼
Phase 5          ─ cleanup
```

## Expected outcomes

Quantitative targets, in order of size:

| Metric | Current | Target | Phase |
|---|---:|---:|---:|
| `legacy-style.css` size | 190KB | < 60KB | 2 |
| Total bytes /books first visit | ~340KB | < 240KB | 1 + 2 |
| Total bytes /movies first visit | ~360KB | < 250KB | 1 + 2 |
| /people CLS | (unmeasured) | < 0.05 | 1.3 |
| /movies CLS | (unmeasured) | < 0.05 | 1.2 |
| LCP on collection pages | (unmeasured) | -200ms vs baseline | 2 |
| `_astro/` shared chunks total | 252KB | -10% via tree-shake | 3.1 |
| `astro check` errors | 0 | 0 (with .ts files) | 3.2 |
| `window.JG*` global writes | 8 | 0 | 3.1 |

## Acceptance criteria for the whole plan

- Lighthouse LCP on at least 6 of 8 baseline pages improved by ≥ 100ms
  vs Phase 0 baseline.
- Lighthouse CLS on `/people` and `/movies` < 0.05.
- `legacy-style.css` < 60KB.
- 0 `window.JG*` global writes in source.
- `astro check` 0/0/0.
- All Playwright behavioral specs pass.
- Visual diff zero pixel-diff on 8 baseline pages.
- CI runs lint + check + build + smoke + behavioral on every PR.

## Rollback strategy

Each slice is independently revertable. The hard prerequisite chain:

- Phase 1.2 + 1.3 require Phase 0 baseline to verify they helped.
- Phase 2 requires Phase 4.2 (visual diff) — without it, "did chrome
  refactor break anything?" is unanswerable.
- Phase 3.2 requires Phase 3.1 (avoid retyping things twice).
- Phase 5 requires Phases 1-3 completed (it's the cleanup-after).

If any slice regresses:

- Revert the slice diff.
- Lighthouse should return to baseline ± noise.
- If multiple slices stack, bisect via the CI artifact history.

## Open questions

1. Do we want SSR-on-edge later? If yes, some Phase 1 SSR-at-build-time
   work doubles up. Decide before starting Phase 1.
2. Is the perf baseline measured with cold cache, warm cache, or both?
3. Are we comfortable with a build-time Letterboxd sync (requires a
   GitHub Action to run nightly), or do we accept the runtime fetch as
   the canonical source of truth?

These need answers before Phase 1.2 ships.

## Out of scope (intentionally)

- Tailwind v5 migration.
- Moving to Astro 7 (when released).
- Image format migration (AVIF, JXL).
- Service-worker prefetching strategy beyond what already exists.
- Search-index full regen pipeline (search:sync is good enough).
- Phase 4 deeper Adventures rewrite (already done in
  `NATIVE_ASTRO_EXECUTION_PLAN.md` Phase 5 slice 12).

These would each be their own focused effort. Adding any of them
inflates this plan past its risk-adjusted-value sweet spot.
