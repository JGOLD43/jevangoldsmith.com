# Lighthouse baseline — 2026-05-21

**Build**: `7d724f0`
**Base URL**: `http://localhost:8765`
**Preset**: desktop, simulated throttling, performance category only

| Route | Score | LCP | CLS | TBT | FCP | SI | Total Bytes |
|---|---:|---:|---:|---:|---:|---:|---:|
| / | 100 | 752ms | 0.000 | 0ms | 532ms | 532ms | 714.5KB |
| /books.html | 96 | 1347ms | 0.009 | 0ms | 711ms | 711ms | 1642.3KB |
| /movies.html | 96 | 1377ms | 0.000 | 0ms | 585ms | 585ms | 1220.0KB |
| /people.html | 99 | 966ms | 0.000 | 0ms | 622ms | 622ms | 1464.8KB |
| /adventures.html | 89 | 2240ms | 0.002 | 0ms | 569ms | 778ms | 746.1KB |
| /podcasts.html | 98 | 1093ms | 0.001 | 0ms | 549ms | 549ms | 794.5KB |
| /essays.html | 100 | 657ms | 0.007 | 0ms | 557ms | 557ms | 290.1KB |
| /search.html | 100 | 638ms | 0.007 | 0ms | 518ms | 518ms | 323.3KB |

Captured by `scripts/perf-lighthouse.js`. Re-run with `npm run perf:lighthouse`.
