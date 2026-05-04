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

**Build**: post Tier 1+2 plan (search CLS fix + adventures map test +
adventures map cross-module fixes).
**Base URL**: `http://localhost:8765`
**Preset**: desktop, simulated throttling, median-of-3 runs

Notes:

- `/adventures.html` LCP went from 684ms → 1578ms because the previous
  baseline measured a silently-broken map (`WEB_MERCATOR_MAX_LAT is not
  defined` halted bootstrap). The Tier 1+2 fix exposes cross-module
  constants on globalThis so the map actually mounts + renders 540+
  markers + tiles. The new number is the cost of working software.
- `/movies.html` CLS varies between runs because the Letterboxd RSS
  fetch sometimes resolves during the LH run and sometimes doesn't.
  `npm run movies:sync` populating `data/movies.json` with the full
  history fixes this; the proxy was 520-ing during baseline capture.
- `/search.html` Lighthouse 80 → 100 after Phase 2.1 (min-height fix
  on the results container kills the empty-to-261-card CLS).

| Route | Score | LCP | CLS | TBT | FCP | SI | Total Bytes |
|---|---:|---:|---:|---:|---:|---:|---:|
| / | 100 | 627ms | 0.000 | 0ms | 486ms | 486ms | 545.7KB |
| /books.html | 97 | 1052ms | 0.064 | 0ms | 667ms | 667ms | 1392.3KB |
| /movies.html | 82 | 566ms | 0.380 | 0ms | 485ms | 485ms | 567.7KB |
| /people.html | 99 | 959ms | 0.000 | 0ms | 510ms | 510ms | 2007.3KB |
| /adventures.html | 95 | 1578ms | 0.000 | 14ms | 446ms | 700ms | 3278.7KB |
| /podcasts.html | 98 | 1087ms | 0.000 | 0ms | 487ms | 487ms | 729.4KB |
| /essays.html | 100 | 605ms | 0.000 | 0ms | 504ms | 504ms | 231.6KB |
| /search.html | 100 | 643ms | 0.007 | 0ms | 423ms | 423ms | 313.8KB |

Captured by `scripts/perf-lighthouse.js`. Re-run with `npm run perf:lighthouse`.
