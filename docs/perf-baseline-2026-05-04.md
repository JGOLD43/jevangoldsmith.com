# Lighthouse baseline — 2026-05-04

**Build**: `ed00b7f`
**Base URL**: `http://localhost:8765`
**Preset**: desktop, simulated throttling, performance category only

| Route | Score | LCP | CLS | TBT | FCP | SI | Total Bytes |
|---|---:|---:|---:|---:|---:|---:|---:|
| / | 96 | 648ms | 0.122 | 0ms | 504ms | 504ms | 569.7KB |
| /books.html | 98 | 1020ms | 0.066 | 0ms | 692ms | 692ms | 1416.2KB |
| /movies.html | 99 | 611ms | 0.062 | 0ms | 529ms | 529ms | 585.8KB |
| /people.html | 98 | 1003ms | 0.000 | 0ms | 556ms | 556ms | 2474.6KB |
| /adventures.html | 99 | 1010ms | 0.000 | 0ms | 448ms | 448ms | 891.0KB |
| /podcasts.html | 98 | 1050ms | 0.000 | 0ms | 509ms | 509ms | 753.3KB |
| /essays.html | 100 | 548ms | 0.000 | 0ms | 486ms | 486ms | 231.4KB |
| /search.html | 80 | 648ms | 0.461 | 0ms | 428ms | 428ms | 337.2KB |

Captured by `scripts/perf-lighthouse.js`. Re-run with `npm run perf:lighthouse`.
