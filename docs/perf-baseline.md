# Lighthouse baseline (canonical)

This is the committed perf budget. `npm run perf:check` re-runs Lighthouse
against the dist served on `http://localhost:8765` and compares each route
against the values below. Tolerances:

- LCP regression > 300ms fails (run-to-run noise on simulated throttling
  is typically ~200ms; 300ms catches real regressions).
- CLS regression > 0.05 fails
- Total Bytes regression > 25KB fails
- Performance score drop > 5 points fails

Update this file deliberately when shipping a perf-affecting change that
moves the baseline. Re-capture with
`npm run perf:lighthouse -- --out=docs/perf-baseline.md`.

**Build**: post Phase 1 + 2 of POST_TIER12_PLAN (people merge to build,
adventures countries + popular routes gated, movies CLS deterministic
fix via cron sync, podcasts LCP eager, preconnect hints, /_astro
immutable cache).
**Base URL**: `http://localhost:8765`
**Preset**: desktop, simulated throttling, median-of-3 runs

Notes:

- `/movies.html` CLS dropped from 0.380 to 0.000 after slice 1.3 cut
  the runtime allorigins.win RSS proxy fetch. `data/movies.json` is
  now refreshed daily by .github/workflows/letterboxd-sync.yml so the
  page is pure SSR.
- `/adventures.html` Total Bytes dropped from 3278.7KB to 1083.5KB
  after slice 1.2 gated the popular-routes chunks behind first user
  interaction (movestart / zoomstart / mousedown / touchstart) and
  the countries data behind the layer toggle.
- `/people.html` Total Bytes dropped from 2007.3KB to 1958.6KB after
  slice 1.1 moved the books/movies/profiles merge to build time.
  Native loading="lazy" still pre-fetches ~68/98 thumbnails inside
  Lighthouse's network-idle window — see slice 1.1 commit for the
  deviation note on why `< 700KB` is unreached.

| Route | Score | LCP | CLS | TBT | FCP | SI | Total Bytes |
|---|---:|---:|---:|---:|---:|---:|---:|
| / | 100 | 627ms | 0.000 | 0ms | 490ms | 490ms | 545.7KB |
| /books.html | 98 | 981ms | 0.060 | 0ms | 670ms | 670ms | 1392.3KB |
| /movies.html | 100 | 567ms | 0.000 | 0ms | 506ms | 506ms | 566.4KB |
| /people.html | 99 | 928ms | 0.001 | 0ms | 653ms | 653ms | 1958.6KB |
| /adventures.html | 94 | 1631ms | 0.000 | 0ms | 407ms | 686ms | 1082.7KB |
| /podcasts.html | 99 | 995ms | 0.000 | 0ms | 487ms | 487ms | 729.5KB |
| /essays.html | 100 | 605ms | 0.000 | 0ms | 504ms | 504ms | 231.6KB |
| /search.html | 100 | 645ms | 0.007 | 0ms | 426ms | 426ms | 313.8KB |

Captured by `scripts/perf-lighthouse.js`. Re-run with `npm run perf:lighthouse`.
