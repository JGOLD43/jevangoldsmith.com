# Lighthouse baseline — 2026-05-04

**Build**: `ed00b7f`
**Base URL**: `http://localhost:8765`
**Preset**: desktop, simulated throttling, performance category only

| Route | Score | LCP | CLS | TBT | FCP | SI | Total Bytes |
|---|---:|---:|---:|---:|---:|---:|---:|
| / | 100 | 628ms | 0.000 | 0ms | 487ms | 487ms | 545.7KB |
| /books.html | 99 | 777ms | 0.057 | 0ms | 650ms | 650ms | 1392.3KB |
| /movies.html | 99 | 573ms | 0.062 | 0ms | 509ms | 509ms | 567.7KB |
| /people.html | 99 | 987ms | 0.000 | 0ms | 519ms | 519ms | 2007.3KB |
| /adventures.html | 100 | 684ms | 0.000 | 0ms | 406ms | 406ms | 867.2KB |
| /podcasts.html | 98 | 1052ms | 0.000 | 0ms | 491ms | 491ms | 729.4KB |
| /essays.html | 100 | 608ms | 0.000 | 0ms | 506ms | 506ms | 231.6KB |
| /search.html | 80 | 646ms | 0.460 | 0ms | 426ms | 426ms | 313.2KB |

Captured by `scripts/perf-lighthouse.js`. Re-run with `npm run perf:lighthouse`.
