# Release Runbook

Status: `canonical`
Audience: `engineering`, `agents`
Purpose: `define the safe local and deploy workflow`

## Local Verification

```bash
npm run build
npm run check
```

`npm run check` currently runs:

- build verification
- JS syntax check
- content validation
- generated local link validation
- Firebase deploy-surface validation
- performance budget validation
- documentation spine validation

## Local Smoke Test

For behavior-sensitive changes, serve generated output:

```bash
npm run build:fast
npm run serve
```

Smoke test at least:

- `/`
- `/books.html`
- `/adventures.html`
- one `adventure-*.html`
- one mobile viewport page when layout is touched

## Deploy Surface

Firebase Hosting serves `dist/`.

Do not deploy source-only folders:

- `admin/`
- `functions/`
- `site-astro/src/`
- `scripts/`
- `css/src/`

## Live Verification

After deploy, verify the public domain is serving the generated Firebase output:

```bash
npm run check:live
```

The live check validates production `robots.txt`, `sitemap.xml`, `llms.txt`,
static API JSON, security headers, and high-value pages. If it reports GitHub
Pages, stale robots content, or missing `/api/v1/` JSON, DNS or deploy output is
not aligned with this repo.

If custom-domain routing is intentionally not switched yet, verify the Firebase
default URL directly:

```bash
npm run check:live:firebase
```

To verify the Firebase default URL before the custom domain points at Firebase:

```bash
LIVE_BASE_URL=https://jevan-goldsmith-website.web.app \
LIVE_CANONICAL_BASE_URL=https://jevangoldsmith.com \
npm run check:live
```

## Rollback

The safest rollback is reverting the source change, rebuilding, and redeploying
the previous generated output. Do not patch `dist/` directly.

## When To Update Docs

Update docs when changing:

- source ownership
- build or deploy behavior
- page templates
- components
- content schemas
- performance budgets
- interaction behavior
- security/CSP rules
