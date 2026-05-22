# Jevan Goldsmith Website

Static personal website for `jevangoldsmith.com`, hosted on Firebase Hosting.
The public experience is organized as a living archive, with Field Notes as the
recurring audience thread.

As of the Astro migration (May 2026), the build is **Astro 6 + per-page legacy
CSS purge**. `npm run build` invokes Astro under the hood and writes generated
HTML / CSS / JS to `dist/`, which Firebase Hosting serves.

## Start Here

Read [docs/START_HERE.md](docs/START_HERE.md) first. It links to the active
engineering and release docs. Historical plans live under `docs/archive/`.

## Structure

```text
.
├── site-astro/             # Astro project (current build target)
│   ├── src/
│   │   ├── layouts/        # Base.astro
│   │   ├── components/     # Footer, collection/task components, JsonLd, helpers
│   │   ├── pages/          # Astro pages → dist/<route>.html
│   │   └── content.config.ts  # Zod schemas for ../data/*.json
│   ├── public/             # Static passthrough (CSS, images symlinked, fonts symlinked)
│   └── astro.config.mjs    # Site URL, output → ../dist/, integrations
├── data/                   # Source-of-truth JSON for every collection
├── images/                 # Source + generated images (symlinked into site-astro/public/)
├── fonts/                  # Self-hosted Chivo (symlinked into site-astro/public/)
├── scripts/
│   ├── sync/               # External sync helpers
│   └── *.js                # Enrichment + sync scripts (Letterboxd, Spotify, TMDB)
├── admin/                  # Admin source, excluded from public Hosting deploys
├── dist/                   # Generated Firebase Hosting output; ignored
├── firebase.json           # Firebase Hosting and Firestore config
└── firestore.rules         # Firestore access rules
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the current architecture.

## Common Commands

Build generated output:

```bash
npm run build
```

Run all local checks:

```bash
npm run check
```

Capture every parity baseline (SEO, content, visual, perf) — used to lock
current behavior during the in-progress Astro migration:

```bash
npm run check:parity:capture
```

Historical migration notes live under `docs/archive/`.

Verify live Firebase output (without requiring custom domain cutover):

```bash
npm run check:live:firebase
```

Enrich `data/movies.json` with TMDB metadata (runtime, genres, overview,
backdrop). Idempotent — only fetches entries missing `runtime`/`tmdbId`. Reads
`TMDB_API_KEY` from environment or `.env.local` (gitignored). Get a free key at
<https://www.themoviedb.org/settings/api>.

```bash
TMDB_API_KEY=xxxxx npm run enrich:movies
# or, with .env.local:
npm run enrich:movies
# Force re-fetch all entries:
node scripts/enrich-movies.js --force
# Enrich a single title:
node scripts/enrich-movies.js --only="Lawrence of Arabia"
```

Re-run after each Letterboxd sync. Watch stats panel on `movies.html` reads
`runtime` × `timesWatched` to compute total hours, hours-by-genre, decade
breakdown, rating histogram, and most-rewatched.

## Generated Files Policy

In short: author source in `site-astro/src/`, `data/*.json`, `scripts/`,
`docs/`, and `vendor/`. Generated bundles, indexes, deploy output, and test
artifacts stay ignored.

## Deployment

Firebase Hosting serves `dist/`, not the repository root. The previous
placeholder `/api/**` Cloud Function rewrite has been removed until there is a
real server-side API to expose.

`admin/**` is excluded from Hosting until admin writes are server-enforced.

Relevant files:

- `firebase.json`
- `data/site.config.json`
- `dist/`
- `firestore.rules`
- `.firebaserc`
- `CNAME`

## Content Model

The site currently uses an Astro content model:

- pages live in `site-astro/src/pages/`
- shared nav/footer source lives in `site-astro/src/components/`
- collections live in `data/*.json` where migrated
- primary commercial actions live in `data/ctas.json`
- Field Notes configuration lives in `data/newsletter.json`
- topic taxonomy starts in `data/topics.json`
- books live in `data/books.json` and are rendered by Astro
- admin tools are present, but not all content types persist through a backend

## Static Agent API

Agents and crawlers should start with `llms.txt` or the static JSON API at
`/api/v1/index.json`. These endpoints are generated files in `dist/`, not live
server functions, so ingestion does not create Cloud Function or database-read
costs. Collection endpoints such as `/api/v1/skills.json`,
`/api/v1/adventures.json`, and `/api/v1/products.json` expose shareable records
with canonical URLs for citation and future commerce/resource surfaces. Agents
can use `/api/v1/search-index.json` as the cheapest discovery map before
fetching larger content payloads.

Historical static-agent API notes live under `docs/archive/`.

## Analytics

Analytics events are privacy-friendly and configured through
`data/site.config.json`.

## Security Notes

Firestore only allows the configured admin email to read/write `/admin/**` and
denies everything else. The admin source also performs client-side 2FA checks,
but client-side 2FA should not be treated as a backend authorization boundary,
so `admin/**` is not deployed publicly.

If admin writes become production-critical, move them behind Cloud Functions or
another server-side API that verifies Firebase ID tokens and second-factor state
before writing data.
