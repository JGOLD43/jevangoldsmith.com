# Lighthouse baseline — 2026-08-24

**Build**: `834c33f`
**Base URL**: `http://localhost:8765`
**Preset**: desktop, simulated throttling, performance category only

| Route | Score | LCP | CLS | TBT | FCP | SI | Total Bytes |
|---|---:|---:|---:|---:|---:|---:|---:|
| / | 100 | 647ms | 0.000 | 0ms | 427ms | 427ms | 534.5KB |
| /books.html | 96 | 1336ms | 0.011 | 0ms | 714ms | 714ms | 1769.3KB |
| /movies.html | 95 | 1443ms | 0.000 | 0ms | 547ms | 547ms | 2332.9KB |
| /people.html | 97 | 1324ms | 0.000 | 0ms | 513ms | 513ms | 1701.4KB |
| /adventures.html | 84 | 2776ms | 0.000 | 0ms | 678ms | 759ms | 2194.6KB |
| /podcasts.html | 98 | 1157ms | 0.002 | 0ms | 450ms | 450ms | 876.8KB |
| /essays.html | 100 | 605ms | 0.009 | 0ms | 465ms | 465ms | 357.1KB |
| /search.html | 100 | 612ms | 0.017 | 0ms | 348ms | 348ms | 375.9KB |

Captured by `scripts/perf-lighthouse.js`. Re-run with `npm run perf:lighthouse`.
