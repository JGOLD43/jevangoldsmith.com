# Dead Code & Simplification Cleanup Plan

Status: `ready to execute`
Audience: `engineering`
Purpose: `remove verified dead code, dead assets, and redundant boilerplate without changing product behavior`
Companion to: [CODE_OPTIMIZATION_EXECUTION_PLAN.md](CODE_OPTIMIZATION_EXECUTION_PLAN.md)

## Goal

Strip verified-dead code and ship-time bytes. Every item below was grepped against the full source tree and confirmed unused — not "agent thinks unused".

Non-goals:

- introducing new abstractions (modal helper extraction is Tier B and explicitly deferred)
- View Transitions / instant-feel work (separate effort)
- CSS purging of `legacy-style.css` (Tier C, separate session)
- changing any product behavior or page output

## Current Baselines

Captured 2026-05-06 against `refactor/astro` HEAD (`a4d268d`).

| Surface | Current | Source |
|---|---:|---|
| Source LOC (src/, scripts/) | 13,804 | `find src -type f \| wc -l` |
| `dist/` total | 204 MB | mostly images, unaffected here |
| `dist/_astro/` (bundled JS+CSS) | 240 KB | what user agents actually parse |
| `/vendor/dompurify/purify.min.js` shipped | 24 KB | `dist/vendor/dompurify/` |
| Repo-root `eng.traineddata` (untracked) | 5.0 MB | accidental OCR artifact |
| Top-of-file boilerplate per page script | 4–6 LOC × 8 files | type alias + escape consts |
| Lighthouse scores (Books page, slowest) | 99 perf, 881 ms LCP | [.perf-tmp/perf-current.md](../.perf-tmp/perf-current.md) |

## Target Outcome

| Surface | Target | Delta |
|---|---:|---:|
| Source LOC | ~13,594 | **−210** |
| `dist/` shipped JS bytes (vendor/dompurify) | 0 | **−24 KB** |
| `dist/_astro/` after boilerplate dedup | ~239 KB | ~−500 B gzipped |
| `public/data/` orphan JSON | removed | **−20 KB on disk** |
| Repo-root artifacts | clean | **−5 MB local** |
| `package.json` deps | −1 (`@lhci/cli`) | faster `npm i` ~2-3s |
| `astro check` errors / warnings / hints | 0 / 0 / 0 | unchanged |
| Lighthouse perf scores | unchanged | this is hygiene, not perf |

## Operating Rules

1. **One Tier A item per commit** so any regression is bisectable.
2. **`astro check` and `npm run build` green after every commit.** No exceptions.
3. **Skip anything that touches user-visible output.** This pass is invisible to users; if a change alters HTML output, kick it to a separate plan.
4. **Verify before deleting.** For each "0 references" claim, grep against `src/`, `scripts/`, `public/service-worker.js`, `astro.config.mjs`, `package.json`. Three patterns: bare name, `from '…/x'`, `import('…/x')`.
5. **Don't touch `public/api/v1/*`** — that's the documented Agent API per [llms.txt](../site-astro/public/llms.txt).

## Honest Framing on Performance Impact

This plan **will not move Core Web Vitals**. Not LCP, not FID/INP, not CLS. The site is already at 91-100 perf scores.

What it *will* do, with metrics:

- **`-24 KB` from `dist/`** — `/vendor/dompurify/purify.min.js` is in the deploy but referenced by zero pages (sanitize-html.ts uses the bundled npm package). Removing means 24 KB less on the CDN. If a misconfigured page started referencing it tomorrow, removal forces the bug surface earlier.
- **`-210 source LOC`** — translates to faster `astro build` walks (marginal, ~50-100 ms), faster TS check, less for humans/agents to read. Cognitive load wins, not user wins.
- **`-1 dep`** — faster `npm install` in CI by 2-3s. No user impact.
- **`-5 MB` local repo bloat** — `eng.traineddata` would otherwise enter any future `git add .`.
- **Boilerplate dedup** (A4 + A9) — ~500 B less gzipped per page-script chunk that uses it, summed across 8 chunks. Imperceptible per page; easier reading for humans.

If you want **metric-moving** work after this: dead CSS purge (Tier C — could shave 50-150 KB off every page), or View Transitions (LCP-equivalent perceived nav improvement of 200-400 ms).

---

## Phase A: Mechanical Deletions

All items independently verified. Each is its own commit. Tier A is the entire phase.

### A1. Drop unused `@lhci/cli` devDep

- **File**: [site-astro/package.json:26](../site-astro/package.json:26)
- **Verify**: `grep -rn "lhci\|lighthouse-ci" --include="*.json" --include="*.mjs" .` — only matches are package.json + lockfile.
- **Action**: delete the dependency line, run `npm install` to update lockfile.
- **Impact**: −1 dep, ~few MB out of `node_modules`, ~2-3 s faster CI install. **Zero user impact.**

### A2. Delete repo-root `eng.traineddata`

- **File**: `/eng.traineddata` (5.0 MB, untracked)
- **Action**: `rm eng.traineddata`; add `eng.traineddata` to `.gitignore` to prevent re-add.
- **Impact**: −5 MB local; no shipping impact.

### A3. Drop local `escapeHTML` / `escapeAttr` in [youtube.ts](../site-astro/src/scripts/youtube.ts)

- **Lines**: [src/scripts/youtube.ts:6-9](../site-astro/src/scripts/youtube.ts:6)
- **Verify**: `window.escapeHTML` + `window.escapeAttr` are registered globally in [sanitize.ts:47-48](../site-astro/src/scripts/sanitize.ts:47) and ambient-typed in [window-types.d.ts:101,103](../site-astro/src/scripts/window-types.d.ts:101).
- **Action**: delete the two local function declarations; rely on globals (after A9 they're directly callable).
- **Impact**: −4 LOC source, ~80 B gzipped off youtube chunk.

### A4 + A9. Centralize page-script boilerplate

This is the highest-LOC mechanical win. Combine into one commit since they touch the same 8 files at the same head-of-file location.

**A4** — `type AnyObj = any` declared at top of 10 files: [adventures.ts](../site-astro/src/scripts/adventures.ts), [adventures-map.ts](../site-astro/src/scripts/adventures-map.ts), [books.ts](../site-astro/src/scripts/books.ts), [cool-shit.ts](../site-astro/src/scripts/cool-shit.ts), [dateme.ts](../site-astro/src/scripts/dateme.ts), [essays.ts](../site-astro/src/scripts/essays.ts), [letterboxd.ts](../site-astro/src/scripts/letterboxd.ts), [movie-stats.ts](../site-astro/src/scripts/movie-stats.ts), [people.ts](../site-astro/src/scripts/people.ts), [podcasts.ts](../site-astro/src/scripts/podcasts.ts).

**A9** — `const escapeHTML = window.escapeHTML as ...` redundant typing workaround in 8 files: [adventures.ts](../site-astro/src/scripts/adventures.ts), [books.ts](../site-astro/src/scripts/books.ts), [letterboxd.ts](../site-astro/src/scripts/letterboxd.ts), [people.ts](../site-astro/src/scripts/people.ts), [podcasts.ts](../site-astro/src/scripts/podcasts.ts), [essays.ts](../site-astro/src/scripts/essays.ts), [movie-stats.ts](../site-astro/src/scripts/movie-stats.ts), [search-astro.ts](../site-astro/src/scripts/search-astro.ts).

- **Verify A4**: ambient declaration in `window-types.d.ts` is sufficient (add `type AnyObj = any` there once). Each file's `eslint-disable-next-line` for `no-explicit-any` goes away with it.
- **Verify A9**: ambient `function escapeHTML(s: any): string` already declared at [window-types.d.ts:101](../site-astro/src/scripts/window-types.d.ts:101). Calling `escapeHTML(x)` directly type-checks today.
- **Action**:
  1. Add `type AnyObj = any` to [window-types.d.ts](../site-astro/src/scripts/window-types.d.ts) (top-level declare).
  2. In each affected file, delete the `type AnyObj = any`, the `eslint-disable` line, and the two `const escapeHTML/escapeAttr` lines.
  3. Run `astro check` — must stay 0/0/0.
- **Impact**: ~30 LOC source, ~500 B gzipped saved across 8 chunks (string literal dedup compresses well so this is upper bound). Bigger win is cognitive: head of every page script shrinks from 6 lines of typing-workaround to 0.

### A5. Delete `public/vendor/dompurify/`

- **Path**: [site-astro/public/vendor/dompurify/purify.min.js](../site-astro/public/vendor/dompurify/) (24 KB)
- **Verify**: `grep -rn "vendor/dompurify\|/dompurify" src/ public/service-worker.js astro.config.*` returns zero. The npm `dompurify` package is bundled via `import DOMPurify from 'dompurify'` in [sanitize-html.ts:6](../site-astro/src/scripts/sanitize-html.ts:6) and chunked separately.
- **Action**: `rm -r site-astro/public/vendor/dompurify/`.
- **Impact**: **−24 KB from `dist/`** on every deploy. Largest single byte saving in this plan.

### A6. Delete unused Astro components

- **Files**: [src/components/OptimizedImage.astro](../site-astro/src/components/OptimizedImage.astro) (72 LOC), [src/components/RemoteImage.astro](../site-astro/src/components/RemoteImage.astro) (88 LOC).
- **Verify**: `grep -rn "OptimizedImage\|RemoteImage" src/` returns only the components themselves. Zero importers.
- **Action**: `rm` both files.
- **Impact**: −160 LOC source. Build walks one fewer dir node.

### A7. Delete orphan `public/data/*.json`

- **Files**:
  - [public/data/seo.json](../site-astro/public/data/seo.json) (18 KB)
  - [public/data/site.json](../site-astro/public/data/site.json) (641 B)
  - [public/data/skills.json](../site-astro/public/data/skills.json) (19 B)
  - [public/data/newsletter.json](../site-astro/public/data/newsletter.json) (1 KB)
- **Verify**: each has 0 references in `src/`, `scripts/`, `astro.config.*`, `package.json`. Distinct from `public/api/v1/*.json` (intentional Agent API).
- **Action**: `rm` four files.
- **Impact**: −20 KB on disk shipped to `dist/`. These weren't fetched by any page so user-byte impact is 0; but cleaning prevents them appearing in CDN crawls.

### A8. Update stale `package.json` description

- **File**: [site-astro/package.json:6](../site-astro/package.json:6)
- **Issue**: description references `/scripts/build-site.js` which doesn't exist.
- **Action**: rewrite to current state (e.g., `"Astro static site for jevangoldsmith.com"`).
- **Impact**: cosmetic, but otherwise lies to readers.

---

## Phase B: Larger Deletions

### B1. Delete [scripts/port-page.mjs](../site-astro/scripts/port-page.mjs)

- **Lines**: 138 LOC standalone tool
- **Verify**: zero references in `package.json` scripts. Phase 4 page-porting is complete (all 82 pages built from data + Astro routes).
- **Action**: `rm scripts/port-page.mjs`. If preferring not to delete outright, move to `_archive/scripts/`.
- **Impact**: −138 LOC. Removes a misleading entrypoint that newcomers would think is current.

### B2. (Deferred) Modal scaffolding extraction

[books.ts](../site-astro/src/scripts/books.ts), [letterboxd.ts](../site-astro/src/scripts/letterboxd.ts), [people.ts](../site-astro/src/scripts/people.ts), [podcasts.ts](../site-astro/src/scripts/podcasts.ts) each hand-roll modal open/close/focus-restore patterns ~10 LOC each. Common shape: ensure-element → set innerHTML → add `open` class → `installEscapeCloser`.

- **Why deferred**: this is a refactor not a deletion; touches 4 page scripts at the same time, higher regression risk, no user impact.
- **Pre-req if pursued**: B2 should ride a short-lived branch with all 4 page e2e tests run before merge.
- **Estimated impact if done**: −40 LOC source.

---

## Phase C: Out of Scope (For Reference)

These were identified during audit but are NOT part of this plan:

- **C1. `legacy-style.css` purge** — file is 188 KB, on every page, not all selectors used. Real perf win (could be 50-150 KB shaved per page) but requires careful selector audit (some classes built only inside JS innerHTML strings). Own session.
- **C2. `localizeUnsplash` in [home-body.ts](../site-astro/src/lib/home-body.ts)** — needs investigation of whether `data/remote-assets.generated.json` is current and rewriting still fires. Not a clear win.
- **View Transitions** — separate effort already documented.

---

## Verification Steps

Run after **every** commit in Phase A and B:

```bash
cd site-astro
npx astro check       # must be 0 / 0 / 0
npm run build         # must complete green
ls dist/_astro/       # spot-check no chunks deleted unexpectedly
```

After A5 specifically:

```bash
[ ! -d dist/vendor/dompurify ] && echo "dompurify gone from dist ✓"
```

After Phase A entirely:

```bash
npm run perf:lighthouse  # baselines should not regress
```

## Recommended Execution Order

| # | Item | Rationale |
|---|---|---|
| 1 | A8 description fix | trivial warmup |
| 2 | A2 eng.traineddata | local-only, frees 5 MB |
| 3 | A1 lhci dep | one-line + lockfile |
| 4 | A6 unused components | atomic, safe |
| 5 | A7 orphan JSON | atomic, safe |
| 6 | A5 vendor/dompurify | biggest user-byte win |
| 7 | A3 youtube escapes | sets up A9 pattern |
| 8 | A4+A9 boilerplate | combined commit, ~30 LOC |
| 9 | B1 port-page.mjs | standalone deletion |
| 10 | (B2 only if explicitly requested) |

Single-commit alternative: bundle items 1–9 into one "chore: remove dead code & assets" commit if you'd rather not have 9 commits in PR history. Pro: single review surface. Con: harder to bisect a regression.

## Rollback Strategy

Each item is a standalone deletion:

- **Files deleted**: `git checkout HEAD~1 -- <path>` restores instantly.
- **Dep removed**: `npm install <pkg>@^<ver>` from the prior `package.json`.
- **Boilerplate dedup (A4+A9)**: revert the commit; ambient declaration in `window-types.d.ts` is non-breaking even if reverted in isolation.

Risk per item is bounded; no item touches runtime behavior, only build inputs.

## Definition of Done

- [ ] All Phase A commits landed
- [ ] `astro check` 0 / 0 / 0
- [ ] `npm run build` succeeds
- [ ] `dist/vendor/dompurify/` no longer exists
- [ ] `dist/_astro/` size unchanged or smaller
- [ ] Lighthouse run on `/`, `/books.html`, `/adventures.html` shows scores within ±1 of baseline (random variance only)
- [ ] B1 either committed or explicitly deferred with rationale
- [ ] [perf-current.md](../.perf-tmp/perf-current.md) refreshed if any byte numbers shifted
