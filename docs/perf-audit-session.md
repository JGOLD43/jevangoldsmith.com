# Per-route weight + fetch timing

Source: http://localhost:8765, fresh prod build

| route | status | ttfb (ms) | html (KB) | css (KB) | js (KB) | img (KB) | total (KB) |
|---|---|---|---|---|---|---|---|
| `/index.html` | 200 | 449 | 50.2 | 63.9 | 7.4 | 586.2 | 707.6 |
| `/about.html` | 200 | 7 | 43.2 | 37.6 | 4.7 | 189.4 | 274.9 |
| `/adventures.html` | 200 | 2 | 46.4 | 66.1 | 181.9 | 189.4 | 483.7 |
| `/books.html` | 200 | 48 | 204.5 | 67.1 | 100.4 | 3021.7 | 3393.7 |
| `/movies.html` | 200 | 5 | 57.1 | 63.3 | 11.9 | 189.4 | 321.7 |
| `/people.html` | 200 | 3 | 143.6 | 57.5 | 10.7 | 189.4 | 401.2 |
| `/podcasts.html` | 200 | 3 | 48.0 | 56.4 | 8.6 | 189.4 | 302.4 |
| `/essays.html` | 200 | 4 | 47.7 | 55.5 | 11.3 | 189.4 | 303.9 |
| `/field-notes.html` | 200 | 3 | 39.3 | 42.2 | 5.7 | 189.4 | 276.6 |
| `/people/andrew-huberman.html` | 200 | 2 | 39.3 | 37.6 | 4.7 | 203.0 | 284.6 |
| `/quotes.html` | 200 | 2 | 47.6 | 37.6 | 4.7 | 189.4 | 279.3 |
| `/contact.html` | 200 | 1 | 36.6 | 37.6 | 4.7 | 189.4 | 268.3 |
| `/products.html` | 200 | 2 | 44.4 | 45.9 | 4.8 | 189.4 | 284.5 |
| `/cool-shit.html` | 200 | 3 | 43.0 | 42.8 | 8.1 | 189.4 | 283.3 |
| `/reading-philosophy.html` | 200 | 2 | 37.4 | 42.0 | 4.7 | 189.4 | 273.5 |
| `/important-or-not.html` | 200 | 4 | 45.2 | 42.6 | 4.7 | 189.4 | 281.9 |
