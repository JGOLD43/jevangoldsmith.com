# Jevan Goldsmith Website

Static personal website for `jevangoldsmith.com`, hosted on Firebase Hosting.
The public experience is organized as a living archive, with Field Notes as the
recurring audience thread.

As of the Astro migration (May 2026), the build is **Astro 6 + Tailwind v4**.
`npm run build` invokes Astro under the hood and writes generated HTML / CSS /
JS to `dist/`, which Firebase Hosting serves. The legacy hand-rolled SSG is
preserved at `scripts/legacy-build/` for emergency rollback (`npm run
build:legacy`); Phase 11 cleanup will retire it once parity is fully verified.

## Start Here

Read [docs/START_HERE.md](docs/START_HERE.md) first. It links to the active
engineering, product, design, content, and release docs. The migration plan
lives at [docs/MIGRATION-ASTRO.md](docs/MIGRATION-ASTRO.md).

## Structure

```text
.
├── site-astro/             # Astro project (current build target)
│   ├── src/
│   │   ├── layouts/        # Base.astro
│   │   ├── components/     # Nav, Footer, Card components, JsonLd, AdventureMap
│   │   ├── pages/          # Astro pages → dist/<route>.html
│   │   ├── styles/         # Tailwind + tokens + transitional chrome-legacy.css
│   │   └── content.config.ts  # Zod schemas for ../data/*.json
│   ├── public/             # Static passthrough (images symlinked, fonts symlinked)
│   └── astro.config.mjs    # Site URL, output → ../dist/, integrations
├── data/                   # Source-of-truth JSON for every collection
├── images/                 # Source + generated images (symlinked into site-astro/public/)
├── fonts/                  # Self-hosted Chivo (symlinked into site-astro/public/)
├── tests/                  # Parity harness fixtures + Playwright tests
├── scripts/
│   ├── check/              # Parity harness (SEO, content, perf, visual)
│   ├── legacy-build/       # Archived hand-rolled SSG (rollback only)
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

See [docs/MIGRATION-ASTRO.md](docs/MIGRATION-ASTRO.md) for the migration plan.

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

The canonical generated-file policy lives in
[docs/SOURCE_OF_TRUTH.md](docs/SOURCE_OF_TRUTH.md). In short: author source in
`_src/`, `css/src/`, `data/*.json` except generated indexes, root legacy HTML
while still source, `js/`, `scripts/`, `docs/`, `tests/`, and `vendor/`.
Generated bundles, indexes, deploy output, and test artifacts stay ignored.
Route ownership is tracked in `data/source-ownership.json`; structure cleanup
is enforced by `npm run check:source` and `npm run check:structure`.

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

The site currently uses a hybrid content model:

- many pages are still hand-authored root HTML files
- migrated pages live in `_src/pages/`
- root route ownership is classified in `data/source-ownership.json`
- shared nav/footer source lives in `_src/partials/`
- collections live in `data/*.json` where migrated
- primary commercial actions live in `data/ctas.json`
- Field Notes configuration lives in `data/newsletter.json`
- topic taxonomy starts in `data/topics.json`
- books live in `data/books.json` and are rendered by `js/books.js`
- admin tools are present, but not all content types persist through a backend

The next major structural improvement is to continue migrating root HTML pages
into `_src/pages/`, then generate the same public HTML output through templates.

## Static Agent API

Agents and crawlers should start with `llms.txt` or the static JSON API at
`/api/v1/index.json`. These endpoints are generated files in `dist/`, not live
server functions, so ingestion does not create Cloud Function or database-read
costs. Collection endpoints such as `/api/v1/skills.json`,
`/api/v1/adventures.json`, and `/api/v1/products.json` expose shareable records
with canonical URLs for citation and future commerce/resource surfaces. Agents
can use `/api/v1/search-index.json` as the cheapest discovery map before
fetching larger content payloads.

See [docs/STATIC_AGENT_API.md](docs/STATIC_AGENT_API.md).

## Analytics

Analytics events are privacy-friendly and configured through
`data/site.config.json`. See [docs/ANALYTICS.md](docs/ANALYTICS.md) for what is
tracked, what is intentionally not tracked, and how to debug local events.

## Security Notes

Firestore only allows the configured admin email to read/write `/admin/**` and
denies everything else. The admin source also performs client-side 2FA checks,
but client-side 2FA should not be treated as a backend authorization boundary,
so `admin/**` is not deployed publicly.

If admin writes become production-critical, move them behind Cloud Functions or
another server-side API that verifies Firebase ID tokens and second-factor state
before writing data.
