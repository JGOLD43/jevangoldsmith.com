# Lighthouse baseline — 2026-05-04

**Build**: `7850365`
**Base URL**: `http://localhost:8765`
**Preset**: desktop, simulated throttling, performance category only

| Route | Score | LCP | CLS | TBT | FCP | SI | Total Bytes |
|---|---:|---:|---:|---:|---:|---:|---:|
| / | 100 | 628ms | 0.000 | 0ms | 487ms | 487ms | 545.7KB |
| /books.html | 99 | 916ms | 0.052 | 0ms | 658ms | 658ms | 1392.3KB |
| /movies.html | 91 | 568ms | 0.221 | 0ms | 506ms | 506ms | 567.7KB |
| /people.html | 99 | 932ms | 0.000 | 0ms | 508ms | 508ms | 2007.3KB |
| /adventures.html | 100 | 866ms | 0.000 | 0ms | 425ms | 425ms | 867.2KB |
| /podcasts.html | 98 | 1067ms | 0.000 | 0ms | 487ms | 487ms | 729.4KB |
| /essays.html | 100 | 575ms | 0.000 | 0ms | 504ms | 504ms | 231.6KB |
| /search.html | 100 | 643ms | 0.007 | 0ms | 423ms | 423ms | 313.8KB |

Captured by `scripts/perf-lighthouse.js`. Re-run with `npm run perf:lighthouse`.
