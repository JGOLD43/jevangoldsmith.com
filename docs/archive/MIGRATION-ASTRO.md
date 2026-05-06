# Astro + Tailwind Migration Plan

This branch (`refactor/astro`) migrates the site from a hand-rolled SSG to Astro
+ Tailwind v4. Goal: 80% source-code reduction with zero feature loss.

## Why

Current site: ~30k lines (10k JS, 13k CSS, 2.5k HTML templates, 5.4k build scripts).
For a personal blog + galleries + maps, that is 5–10× over budget. Most of the
volume is reinventing standard SSG patterns: layout composition, asset hashing,
collection rendering, metadata injection, hand-rolled DOM "framework" split across
four modules.

Astro replaces the build orchestrator and template system. Tailwind replaces the
13k-line CSS spaghetti and the 1.8k-line override file that papers over scope leaks.

## Target end state

| Layer | Now | After | Cut |
|---|---|---|---|
| JS | 9.9k | ~3k | 70% |
| CSS source | 13.4k | ~1k | 92% |
| Build scripts | 5.4k | ~300 | 94% |
| HTML/templates | 2.5k | ~1.5k | 40% |
| **Total** | **~30k** | **~6k** | **80%** |

User-facing perf: 20–40% improvement on real metrics (already fast, gains modest).
Per-page payload: 40–80% smaller. Dev loop: ~600× faster (HMR vs full rebuild).

## Parity guarantees

These fixtures lock current behavior. Migration ships only when all pass.

| Fixture | What it locks | Capture | Check |
|---|---|---|---|
| `tests/seo-fixture.json` | 79 pages × full `<head>` | `npm run check:seo:capture` | `npm run check:seo` |
| `tests/content-fixture.json` | 79 pages × heading outline + link/image counts + word count + data-action surface + landmarks | `npm run check:content:capture` | `npm run check:content` |
| `tests/visual-baselines/` | 79 pages × 3 viewports (PNG SHA-256) | `npm run check:visual:capture` | `npm run check:visual` |
| `tests/perf-baseline.json` | 79 pages × load timing + bytes by asset class | `npm run check:perf:capture` | `npm run check:perf` |
| `tests/coverage.spec.js` + `tests/interactions.spec.js` + `tests/smoke.spec.js` | functional/interaction surface | `npm run test:browser` | (same) |

**Capture all parity baselines:** `npm run check:parity:capture`

## Phases

Each phase is independently shippable + reversible. Parity gate must be green
before merging the phase.

| # | Phase | Scope | Days |
|---|---|---|---|
| 0 | Parity harness | Lock current state across SEO, content, visual, perf | 1 |
| 1 | Astro skeleton | `npm create astro` in `site-astro/` subdir, port `Base.astro` chrome | 1 |
| 2 | Tailwind + tokens | `@theme` block, port `01-tokens.css`, shared button/card components | 1 |
| 3 | Data layer | Copy `data/*.json` to `src/data/`, write Zod schemas | 1 |
| 4 | Simple content pages | About, contact, meet, etc. (~24 pages, 5/PR) | 3 |
| 5 | Collection factory | `<Collection>` component + Card components for books/movies/essays/people/podcasts | 3 |
| 6 | Detail pages | person/[slug], adventure/[slug], skill/[slug] dynamic routes | 2 |
| 7 | Adventures + maps | Leaflet as `client:visible` island, GPX pipeline preserved | 2 |
| 8 | SEO + sitemap + RSS | `@astrojs/sitemap`, structured-data helper component | 1 |
| 9 | Image + asset pipeline | `astro:assets` + remote-asset localization | 1 |
| 10 | Dist swap | Move `site-astro/` → root, archive legacy build, update Firebase deploy | 1 |
| 11 | Cleanup | Delete `site-astro/src/`, `css/src/`, old `js/`, `scripts/build/` | 1 |
| 12 | Polish | view transitions, content collections, real CMS auth | ongoing |

**Total: ~3 weeks part-time.**

## Branch strategy

```
main
 └── refactor/astro          ← this branch
      ├── feat(test): full parity harness          ← phase 0
      ├── feat(astro): skeleton + Base layout      ← phase 1
      ├── feat(astro): Tailwind + tokens           ← phase 2
      ├── feat(astro): data layer + Zod schemas    ← phase 3
      ├── feat(astro): port simple pages (1/N)     ← phase 4 (multiple PRs)
      └── ...
```

Old build pipeline stays green on `main` until phase 10. `site-astro/` lives as a
subdir until then so both build paths coexist.

## Risk mitigation

- Visual baselines use byte-identical SHA-256. A migration will fail this. Plan:
  swap to a pixel-diff comparator (e.g., `pixelmatch` with 0.1 tolerance) before
  phase 4. Keep current strict comparator for incremental work.
- SEO fixture is strict JSON-equality — Astro must produce byte-identical
  `<head>` per page. Achievable with a thin `<Seo>` component that mirrors the
  current `seo.js` injector output.
- Content fixture is structural (counts, outlines). Tolerates HTML restructuring
  as long as IA stays the same.
- Perf baseline tolerates 30% drift by default (env: `PERF_TOLERANCE`). Tight
  enough to catch real regressions, loose enough to ignore measurement noise.

## Out of scope (don't touch this migration)

- Data sources: `data/*.json` shape stays the same.
- Enrichment scripts: `scripts/enrich-movies.js`, `scripts/sync-photos.js`,
  `scripts/spotify-*` keep working as standalone tools.
- GPX → routes pipeline: domain-specific, no off-shelf replacement.
- Admin dashboard: separate concern, can rewrite or kill later.
- Firebase + GitHub Pages deploy targets: Astro outputs to `dist/`, deploy stays.
