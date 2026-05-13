# Tier 1 + 2 Improvements Execution Plan

Status: `proposed`
Audience: `engineering`, `agents`
Purpose: `close the remaining real perf bug + test gaps + code-quality wins after the Simplify + Perf plan landed`

## Goal

The Simplify + Perf plan (`docs/SIMPLIFY_AND_PERF_PLAN.md`) shipped Phase
0/1/4 and most of 3.1 in commit `7850365`. Six routes now Lighthouse 98+;
one route (`/search`) stayed at 80 because of a CLS=0.461 regression we
deferred. Three test gaps and three small code-quality wins are also
documented in the post-mortem. This plan finishes that work.

## Non-goals

- No move to TypeScript on the legacy `site-astro/src/scripts/*.js` files
  (that's Phase 3.2 of the previous plan — own effort).
- No adventures `globalThis` → state-object refactor (Phase 3.3 — own
  effort, gated on map-rendering Playwright coverage).
- No image format migration / cache-header tuning / mobile-viewport test
  pass (Tier 3 from the post-mortem — out of scope).
- No new product features.

## Operating principles

1. **Regression guard first.** Phase 1 lands Lighthouse on CI before any
   other perf-affecting change so we can prove deltas instead of trusting
   them.
2. **One slice, one verifier.** Every slice ships a check that proves it
   worked.
3. **Independent rollback.** No slice blocks another.
4. **No churn-only changes.** Every line touched should pay either a
   user-facing bill or a maintenance bill.

---

## Phase 1 — Lighthouse regression guard

Lands first so every subsequent slice can prove its delta against a
committed baseline. Without this, "we made it faster" remains
unverifiable in CI.

### Slice 1.1 — Commit a baseline + threshold config

**Work:**

- Promote `docs/perf-after-2026-05-05.md` to `docs/perf-baseline.md`
  (canonical, replaces the dated copies).
- Add `scripts/check-lighthouse-budget.js` that reads
  `docs/perf-baseline.md`, re-runs `perf:lighthouse`, and fails if any
  metric regresses past tolerance:
    - LCP regression > 100ms
    - CLS regression > 0.05
    - Total Bytes regression > 25KB
    - Performance score drop > 3 points
- Add `npm run perf:check` that wraps the above.

**Verify:**

- Running `npm run perf:check` against current dist exits 0.
- Manually bumping a perf budget by editing `docs/perf-baseline.md`
  produces a deliberate fail.

**Acceptance:** `npm run perf:check` is a stable green pass.

### Slice 1.2 — Wire perf-check into CI

**Work:**

- Add a step to `.github/workflows/test.yml` that:
    - serves `dist` via `http-server`
    - runs `npm run perf:check`
    - uploads the lighthouse JSON output as a CI artifact on failure
- The step needs Chrome on the runner (`puppeteer` or
  `--with-deps chromium` already used by Playwright handles this).

**Verify:**

- Push a branch that intentionally regresses a perf budget (e.g. add a
  100KB module to one page). CI fails on `perf:check`.
- Push a normal change. CI passes.

**Acceptance:** the workflow has a `perf:check` step that runs after
build and gates merges.

---

## Phase 2 — `/search` CLS fix (the loudest remaining bug)

`/search` Lighthouse score is 80, dragged down by CLS=0.461. The shift
happens when `#site-search-results` expands from height 0 to 261+ records
on JS hydration. This is the biggest visible perf bug in the site.

### Slice 2.1 — Reserve vertical space

**Work:**

- Add CSS to `#site-search-results` (in the search page or chrome CSS):
    ```css
    #site-search-results { min-height: 80vh; }
    ```
- The min-height matches a typical results-list height so the container
  doesn't grow past it on hydration.

**Verify:**

- `npm run perf:lighthouse` re-run shows `/search` CLS < 0.05.
- Visual diff baseline updated with one captured screenshot.

**Acceptance:** `/search` Lighthouse score ≥ 95, CLS < 0.05.

### Slice 2.2 — Server-render the result list

If 2.1 doesn't get CLS below 0.05 on its own, escalate:

**Work:**

- Move the search-index iteration into `search.astro` so all 261 record
  cards exist in the SSR'd HTML.
- `search-astro.js` becomes a filter-visibility script: it toggles
  `hidden` on existing cards based on the query/type, instead of
  building DOM nodes.
- Type-filter chips already SSR'd — the unused-types stay greyed.

**Verify:**

- View-source on `/search.html` shows ≥ 261 result-card elements.
- No DOM construction in `search-astro.js` (only style/visibility
  toggles).
- CLS < 0.01.

**Acceptance:** ships only if 2.1 is insufficient. Visual diff parity
with the runtime-rendered version on at least 4 representative queries.

---

## Phase 3 — Adventures map test coverage

Adventures is the most complex page and the worst-tested. Closing this
gap is a prerequisite for the deferred state refactor (Phase 3.3 of the
prior plan) and protects the most fragile feature on the site.

### Slice 3.1 — Map-mount Playwright spec

**Work:**

- Add `tests/playwright/adventures-map.spec.ts`:
    - Navigate to `/adventures.html`.
    - If the page is in mobile-tabs mode, click the map tab; otherwise
      the desktop split renders both panes by default.
    - Wait for `.leaflet-container` to mount.
    - Assert ≥ 1 marker (`.leaflet-marker-icon`) renders.
    - Assert at least one route polyline (`.leaflet-overlay-pane path`)
      renders if `mapFilters.layers.routes` is true.
- Use `page.waitForFunction(() => document.querySelector('.leaflet-container') !== null)`
  with a 15s timeout — leaflet bootstrap is async (lazy-loaded chunk
  via `import('./adventures-map.js')`).

**Verify:** new spec passes against current dist.

**Acceptance:** the spec is part of `npm run test:browser` and asserts
both marker count and route-overlay count.

### Slice 3.2 — Adventures detail-pane Playwright spec

**Work:**

- Add `tests/playwright/adventures-detail.spec.ts`:
    - Click the first adventure card in the list.
    - Wait for `#adventure-detail-overlay` to be visible.
    - Assert title, location, hero image render.
    - Press Escape; assert overlay closes.

**Verify:** spec passes.

**Acceptance:** detail-pane open + close path tested.

---

## Phase 4 — Code quality cleanup

After the perf + test gaps close, three small code-quality items.

### Slice 4.1 — Investigate and resolve console-error patterns

**Work:**

- Open `/books.html` on the dist server with a fresh Incognito window.
- Capture console errors. If any are real (not stale HMR), trace and
  fix:
    - The `escapeAttr is not defined` pattern from Phase 7 slice 8 may
      not handle every code path; check `books.js` carousel render and
      `letterboxd.js` review modal.
- The fix is to either:
    - Add the destructure to the affected file
    - Or convert the bare reference to `window.escapeAttr` explicitly

**Verify:**

- Open all 8 baseline routes in Incognito → DevTools console clean.
- Add a Playwright spec that fails on any `console.error` text matching
  `not defined|undefined is not a function`.

**Acceptance:** zero unexpected console errors across the 8 routes;
Playwright guard in place.

### Slice 4.2 — depcheck audit

**Work:**

- Add `depcheck` as a one-off devDep at root.
- Run `npx depcheck`. Review output. Remove deps that:
    - Are not imported anywhere
    - Are not used by any `scripts/*.js` build helper
- Be conservative on `optionalDependencies` (e.g. `googleapis` may be
  used by sync scripts).

**Verify:**

- `npm install` after removal still works.
- `npm run build:fast` green.
- `npm run smoke` 19/19.

**Acceptance:** root + site-astro `package.json` carry only deps that
are actually imported. Document removed packages in commit message.

### Slice 4.3 — Resolve `astro check` hints

**Work:**

- Run `npm run --prefix site-astro astro check`. Read the 10 hints.
- For each:
    - If it's a genuinely unused variable / parameter / import, remove
      it.
    - If it's a false positive (used by name-only via `window.X`), add
      a `// eslint-disable-next-line` style suppression comment OR
      restructure the code so the linter sees the use.

**Verify:** `astro check` returns `0 errors / 0 warnings / 0 hints`.

**Acceptance:** `astro check` clean across all 86 files.

---

## Sequencing

```
Phase 1            ─ Lighthouse on CI
   │  ├─ 1.1 baseline + threshold
   │  └─ 1.2 wire into CI
   ▼
Phase 2            ─ /search CLS fix
   │  ├─ 2.1 reserve space (try first)
   │  └─ 2.2 SSR results (escalate if 2.1 insufficient)
   ▼
Phase 3            ─ Adventures map coverage
   │  ├─ 3.1 map-mount spec
   │  └─ 3.2 detail-pane spec
   ▼
Phase 4            ─ Code-quality cleanup
   │  ├─ 4.1 console errors
   │  ├─ 4.2 depcheck
   │  └─ 4.3 astro check hints
```

**Why this order:**

- **Phase 1 first** so Phase 2's CLS fix can be verified against a
  committed delta target.
- **Phase 2 second** because it's the loudest user-visible bug.
- **Phase 3 before any future state refactor** — without map test
  coverage, refactors like Phase 3.3 of the prior plan can't be done
  safely.
- **Phase 4 last** because each slice is small + independent.

## Expected outcomes

| Slice | Metric / artifact | Target |
|---|---|---|
| 1.1 + 1.2 | CI step `perf:check` | passes on green PR; fails on regression |
| 2.1 | `/search` Lighthouse score | ≥ 95 |
| 2.1 | `/search` CLS | < 0.05 |
| 2.2 | `/search` SSR record count | ≥ 261 in HTML |
| 3.1 | map markers in Playwright | ≥ 1 marker, ≥ 1 polyline |
| 3.2 | detail-pane test | open + close paths green |
| 4.1 | console errors | zero unexpected on 8 routes |
| 4.2 | unused npm deps | 0 |
| 4.3 | `astro check` | 0/0/0 |

## Acceptance criteria for the whole plan

- `/search` Lighthouse score ≥ 95.
- `npm run test:browser` includes adventures map + detail specs and
  passes.
- `npm run perf:check` is part of CI and protects all 8 baseline routes.
- `astro check` clean.
- No unused npm deps.
- No unexpected console errors on any of the 8 baseline routes.

## Rollback strategy

Each slice is independent. The dependency chain is:

- 2.1 before 2.2 (try the cheap fix first).
- 3.1 before any state refactor (map-test prerequisite).
- All others are independent.

If a slice regresses any other metric, revert that slice's commit and
move on. Phase 4 slices can be reordered freely.

## Out of scope (intentionally)

- TypeScript conversion of `site-astro/src/scripts/*` — own effort.
- Adventures `globalThis` → state-object refactor — own effort.
- Image format / cache-header tuning — Tier 3 from prior post-mortem.
- Mobile-viewport Playwright pass — Tier 3 from prior post-mortem.
- Any new content / product feature.

These are each their own focused effort and would inflate this plan past
its risk-adjusted-value sweet spot. Each is documented for a future
arc.
