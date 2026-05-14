# Lighthouse baseline — 2026-05-09

**Build**: `449067d`
**Base URL**: `http://localhost:8765`
**Preset**: desktop, simulated throttling, performance category only

| Route | Score | LCP | CLS | TBT | FCP | SI | Total Bytes |
|---|---:|---:|---:|---:|---:|---:|---:|
| / | 100 | 683ms | 0.000 | 0ms | 483ms | 483ms | 668.1KB |
| /books.html | 94 | 1369ms | 0.088 | 0ms | 652ms | 652ms | 1572.8KB |
| /movies.html | 100 | 654ms | 0.023 | 0ms | 487ms | 487ms | 577.8KB |
| /people.html | 97 | 1222ms | 0.000 | 0ms | 578ms | 578ms | 1323.9KB |
| /adventures.html | 94 | 1616ms | 0.000 | 0ms | 528ms | 747ms | 1618.5KB |
| /podcasts.html | 98 | 1056ms | 0.000 | 0ms | 489ms | 489ms | 745.4KB |
| /essays.html | 96 | 586ms | 0.128 | 0ms | 486ms | 486ms | 233.4KB |
| /search.html | 100 | 576ms | 0.007 | 0ms | 432ms | 432ms | 280.1KB |

Captured by `scripts/perf-lighthouse.js`. Re-run with `npm run perf:lighthouse`.
