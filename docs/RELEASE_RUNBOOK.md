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
- GitHub Pages deploy-surface validation
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

GitHub Pages serves `dist/` through `.github/workflows/deploy-pages.yml`.

Do not deploy source-only folders:

- `admin/`
- `functions/`
- `site-astro/src/`
- `scripts/`
- `css/src/`

## Live Verification

After deploy, verify the public domain is serving the generated GitHub Pages output:

```bash
npm run check:live
```

The live check validates production `robots.txt`, `sitemap.xml`, `llms.txt`,
static API JSON, and high-value pages on `jevangoldsmith.com`.

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
