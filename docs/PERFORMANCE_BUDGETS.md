# Performance Budgets

Status: `canonical`
Audience: `engineering`, `agents`
Purpose: `explain current performance gates and target ratchets`

## Current Gate

Performance budgets live in `data/site.config.json` and are checked by
`scripts/check-performance-budget.js`.

Current budgets intentionally match the transition state of the site. They are a
guardrail first, not the final goal.

## Current Bottlenecks

- Public pages now use page-scoped CSS bundles generated from the source layers.
- The full `css/style.css` bundle remains as a local fallback and migration aid.
- Local logo, profile, nature, and people imagery now use generated responsive
  assets from `scripts/optimize-assets.js`.
- The nav logo ships `1x/2x/3x/4x` AVIF/WebP/PNG variants so high-DPI and 4K+
  displays stay sharp without loading the original 1 MB master.
- The animated logo ships density-aware WebM/MP4 variants and is loaded only on
  hover/touch, not during initial page load.
- The homepage flag and public DOMPurify runtime are self-hosted so the public
  path no longer depends on flagcdn or jsDelivr.
- The dist build copies only remote image variants that are referenced by the
  generated site, which keeps unused remote JPG fallbacks out of deploy output.
- Base, navigation, footer, page-content, modals/forms, homepage, reading,
  essays/sidebar, meet, books, movies, adventures, date-me funnel, responsive
  overrides, nav extras, dark-mode overrides, mobile overrides, search, and
  skill-detail styles now live outside `legacy.css`.
- Several pages still include inline style blocks.
- Many interactions still use inline `onclick` handlers.
- Several content-heavy pages are 30-40 KB of HTML.
- Remote images remain an LCP and reliability risk.
- Movie poster and book cover fetches still rely on external runtime services
  where live content would otherwise change behavior.

## Target Ratchet

| Budget | Current Transition Target | Long-Term Target |
|---|---:|---:|
| Page CSS | <= 90 KB | <= 40 KB common plus narrow page CSS |
| Per-page HTML | <= 90 KB | <= 30 KB for most pages |
| Per-page JS | <= 50 KB, vendor excluded | <= 25 KB for most pages |
| Nav logo | generated density variants, no raw master refs | <= 25 KB common case |
| Logo video | generated density variants, hover-loaded only | no initial-load video transfer |
| Inline scripts | <= 16 | 0 public inline scripts |
| Inline handlers | <= 116 | 0 inline handlers |
| Inline style blocks | <= 33 | 0 page-level style blocks |

## Ratchet Rule

Only lower a budget after the relevant refactor lands and browser smoke testing
confirms the page still looks and behaves the same.

## Performance-Preserving Refactors

1. Continue moving page styles from inline blocks to CSS source layers.
2. Keep ratcheting each page bundle by moving rules into the narrowest layer.
3. Replace inline handlers with delegated module JS.
4. Keep vendor libraries self-hosted and loaded only where needed.
5. Keep master imagery in `images/source/` and production references in
   `images/generated/`.
6. Do not reference `images/logo.png`, `images/profile.jpg`,
   `images/zen-nature.jpg`, `images/logo-animated.mp4`, or `images/source/`
   from public HTML.
7. Keep `images/logo-animated.mp4` and `images/source/logo-animated.mp4`
   protected as source/master assets; production pages should use generated
   density variants.
