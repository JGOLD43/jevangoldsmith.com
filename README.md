# Jevan Goldsmith Website

Static personal website for `jevangoldsmith.com`, hosted on Firebase Hosting.
The public experience is now organized as a living archive, with Field Notes as
the recurring audience thread.

The public runtime is framework-free: generated HTML, CSS, JavaScript, JSON,
images, and vendor assets are served from `dist/`. The source remains a
transitioning static-site system with root HTML pages, shared partials, source
CSS layers, content data, and build/check scripts.

## Start Here

Read [docs/START_HERE.md](docs/START_HERE.md) first. It links to the active
engineering, product, design, content, and release docs.

## Structure

```text
.
├── *.html                  # Public page source/output during migration
├── _src/layouts/           # Shared HTML layouts for migrated pages
├── _src/pages/             # Migrated page source
├── _src/partials/          # Shared source nav/footer chrome
├── admin/                  # Admin source, excluded from public Hosting deploys
├── css/src/                # CSS source layers
├── css/style.css           # Generated shared CSS bundle; do not hand-edit
├── css/page-*.css          # Generated per-page CSS bundles; do not hand-edit
├── data/                   # Static content plus site/deploy config
├── dist/                   # Generated Firebase Hosting output; ignored
├── docs/                   # Canonical project/product/design docs
├── images/                 # Static images and media
├── js/                     # Browser JavaScript
├── scripts/                # Build, validation, and sync scripts
├── vendor/                 # Self-hosted third-party runtime assets
├── firebase.json           # Firebase Hosting and Firestore config
└── firestore.rules         # Firestore access rules
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the current architecture and
recommended evolution path.

## Common Commands

Build generated output:

```bash
npm run build
```

Run all local checks:

```bash
npm run check
```

Verify live Firebase output (without requiring custom domain cutover):

```bash
npm run check:live:firebase
```

Sync repeated site-wide links from `data/site.json`:

```bash
npm run sync:site
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
