# Website Start Here

Status: `canonical`
Audience: `engineering`, `product`, `agents`
Purpose: `single entry point for understanding and safely changing this website`

## What This Project Is

This repository is the static personal website for `jevangoldsmith.com`.

The public runtime is intentionally simple: Firebase Hosting serves generated
HTML, CSS, JavaScript, JSON, images, and vendor assets from `dist/`. There is no
active server-side API surface.

The source model is currently transitional:

- root-level `.html` files are the current authored page source for unmigrated pages
- `_src/pages/` owns migrated template-driven page source
- `_src/partials/` owns shared nav/footer chrome
- `css/src/` owns source CSS layers
- `data/` owns static content and site/deploy configuration
- `scripts/` owns build, validation, and sync tools
- `dist/` is generated deploy output and must not be hand-edited

## Read In This Order

1. [How We Build](HOW_WE_BUILD.md)
2. [Source Of Truth](SOURCE_OF_TRUTH.md)
3. [Architecture](../ARCHITECTURE.md)
4. [Design System](DESIGN_SYSTEM.md)
5. [Information Architecture](INFORMATION_ARCHITECTURE.md)
6. [Content Model](CONTENT_MODEL.md)
7. [Component Registry](COMPONENT_REGISTRY.md)
8. [Interaction Contracts](INTERACTION_CONTRACTS.md)
9. [Performance Budgets](PERFORMANCE_BUDGETS.md)
10. [Release Runbook](RELEASE_RUNBOOK.md)
11. [Static Agent API](STATIC_AGENT_API.md)

## Default Local Loop

```bash
npm run build
npm run check
```

Use `npm run check` as the default health gate before considering work done.

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

1. Continue moving root HTML source into `_src/pages/` one page type at a time.
2. Replace inline `onclick` handlers with delegated module JS page-by-page, starting with books/essays/adventures.
3. Expand browser smoke coverage to include at least one topic route and one content-heavy mobile route.
4. Add visual regression snapshots for the key page types.
5. Ratchet performance budgets down after each safe cleanup.
6. Keep API contract, search-index, and page-baseline checks green as content grows.
