# Lighthouse baseline — 2026-05-04

**Build**: `7850365`
**Base URL**: `http://localhost:8765`
**Preset**: desktop, simulated throttling, performance category only

| Route | Score | LCP | CLS | TBT | FCP | SI | Total Bytes |
|---|---:|---:|---:|---:|---:|---:|---:|
| / | 100 | 629ms | 0.000 | 0ms | 487ms | 487ms | 545.7KB |
| /books.html | 99 | 881ms | 0.059 | 0ms | 660ms | 660ms | 1392.3KB |
| /movies.html | 91 | 566ms | 0.221 | 0ms | 505ms | 505ms | 567.7KB |
| /people.html | 99 | 925ms | 0.000 | 0ms | 509ms | 509ms | 2007.3KB |
| /adventures.html | 95 | 1488ms | 0.000 | 11ms | 405ms | 679ms | 3278.7KB |
| /podcasts.html | 99 | 934ms | 0.000 | 0ms | 488ms | 488ms | 729.4KB |
| /essays.html | 100 | 584ms | 0.000 | 0ms | 503ms | 503ms | 231.6KB |
| /search.html | 100 | 643ms | 0.007 | 0ms | 423ms | 423ms | 313.8KB |

Captured by `scripts/perf-lighthouse.js`. Re-run with `npm run perf:lighthouse`.
