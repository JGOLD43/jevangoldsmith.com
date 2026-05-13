# Website Start Here

Status: `canonical`
Audience: `engineering`, `product`, `agents`
Purpose: `single entry point for understanding and safely changing this website`

## What This Project Is

This repository is the static personal website for `jevangoldsmith.com`.

The public runtime is intentionally simple: Firebase Hosting serves generated
HTML, CSS, JavaScript, JSON, images, and vendor assets from `dist/`. There is no
active server-side API surface.

The source model is now steady-state:

- `site-astro/src/pages/` owns authored template-driven public page source
- `site-astro/src/partials/` owns shared nav/footer chrome
- `css/src/` owns source CSS layers
- `data/` owns static content and site/deploy configuration
- `scripts/` owns build, validation, and sync tools
- `dist/` is generated deploy output and must not be hand-edited

## Read In This Order

1. [Architecture](../ARCHITECTURE.md)
2. [Release Runbook](RELEASE_RUNBOOK.md)
3. [Document Index](DOC_INDEX.md)

## Default Local Loop

```bash
npm run build
npm run check
npm run test:browser
```

Use `npm run check` as the default health gate before considering work done.
Use `npm run test:browser` when changing interaction-heavy pages.

If Playwright is running locally on macOS, the repo now prefers the installed
Google Chrome channel automatically when available, which avoids the headless
shell launch issue seen in some sandboxed environments.

## Non-Negotiables

- Preserve current visual style unless the user explicitly asks for a design
  change.
- Preserve current behavior unless the user explicitly asks for product behavior
  to change.
- Do not hand-edit `dist/`.
- Do not deploy `admin/` publicly until admin writes move behind a
  server-enforced API.
- Prefer templates, data, and reusable components over repeated page edits.
- Any refactor touching HTML/CSS/JS structure must keep `npm run check` green.

## Current Highest-Leverage Next Refactors

1. Replace remaining inline handler patterns with delegated page JS where practical.
2. Expand browser smoke coverage to include at least one topic route and one content-heavy mobile route.
3. Add visual regression snapshots for the key page types.
4. Ratchet performance budgets down after each safe cleanup.
5. Keep API contract, search-index, and page-baseline checks green as content grows.
