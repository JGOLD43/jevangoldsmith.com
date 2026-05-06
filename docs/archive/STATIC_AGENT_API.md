# Static Agent API

Status: `canonical`
Audience: `agents`, `engineering`
Purpose: `define the no-server JSON contract agents should use before scraping HTML`

## What It Is

The site exposes a static, build-generated JSON API from Firebase Hosting.

These files are plain static assets, not Cloud Functions, database reads, or a
metered live API. Agents can fetch them through the hosting CDN without creating
server-side execution cost.

## Endpoints

| Endpoint | Purpose |
|---|---|
| `/llms.txt` | Human-readable instructions for AI agents and crawlers. |
| `/api/v1/index.json` | API entry point, endpoint list, and ingestion guidance. |
| `/api/v1/search-index.json` | Compact page and collection discovery index for agents. |
| `/api/v1/pages.json` | Flat list of public pages with titles, descriptions, sections, and URLs. |
| `/api/v1/content.json` | Content collections: essays, books, skills, adventures, quotes, products, and CTAs. |
| `/api/v1/interests.json` | Topic map inferred from content collections. |
| `/api/v1/schema.json` | Machine-readable endpoint, collection, and cost-model contract. |
| `/api/v1/books.json` | Books and reading-library records. |
| `/api/v1/skills.json` | Skill records with canonical skill-page URLs and relationship metadata. |
| `/api/v1/adventures.json` | Adventure records with canonical adventure-page URLs and gallery metadata. |
| `/api/v1/essays.json` | Essay records for ingestion and citation. |
| `/api/v1/quotes.json` | Quote records for ingestion and citation. |
| `/api/v1/products.json` | Commerce/resource catalog scaffold. |
| `/api/v1/resources.json` | Free resource records and download/waitlist states. |
| `/api/v1/ctas.json` | Primary calls to action and section-level commercial intent. |

## Contract

Agents should:

- fetch `/api/v1/index.json` first
- use `/api/v1/search-index.json` for cheap discovery before fetching larger
  collection payloads
- prefer JSON endpoints over scraping HTML
- preserve attribution to Jevan Goldsmith
- use canonical page URLs when citing or linking
- treat HTML pages as canonical for human reading
- expect collection endpoints to expose `version`, `updatedAt`,
  `collection`, `canonicalUrl`, and an `items` array

## Cost Model

The API is static. Fetches are served by Firebase Hosting as files under `dist/`.
There are no Cloud Function invocations and no Firestore reads.

## Source Of Truth

The generator in `scripts/build-site.js` writes the API from:

- `data/site.json`
- `data/products.json`
- `data/ctas.json`
- `data/adventures.json`
- `data/essays.json`
- `data/skills.json`
- `data/books.json`
- `data/quotes.json`
- public page metadata

Run:

```bash
npm run build
npm run check
```

`npm run check` validates that advertised endpoints exist, remain valid JSON,
and preserve the static no-server cost model.

The public `/search.html` page uses the same static search index for human
navigation and agent-observable discovery.
