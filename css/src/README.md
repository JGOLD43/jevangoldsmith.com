# CSS Source Layers

`css/style.css` and the `css/page-*.css` bundles are generated from this
directory by `npm run build`.

Current order:

1. `00-tokens.css` — shared design tokens and theme variables.
2. `01-base.css` — reset, base elements, and global containers.
3. `10-navigation.css` — nav, dropdowns, logo, and side navigation.
4. `11-footer.css` — shared footer.
5. `12-page-content.css` — page headers, content sections, and article/media primitives.
6. `13-modals-forms.css` — shared modal and form primitives.
7. `20-search.css` — public static search page.
8. `20-skill-detail.css` — generated skill detail pages.
9. `30-home.css` — homepage-specific sections and interactions.
10. `31-reading.css` — reading philosophy page.
11. `32-essays.css` — essays/sidebar collection shell shared by essays-style pages.
12. `33-meet.css` — meet/contact lead-capture page.
13. `34-books.css` — books library cards, sidebar, shelves, and filters.
14. `35-movies.css` — movie filters and sidebar.
15. `36-adventures.css` — adventures list, map, cards, overlays, and responsive states.
16. `37-dateme.css` — date-me funnel screens, conversion states, and controls.
17. `39-responsive.css` — cross-page responsive overrides that must run after page layers.
18. `40-nav-extras.css` — wisdom ticker, theme toggle, and contact dropdown.
19. `41-home-redesign.css` — homepage redesign sections that still need consolidation.
20. `42-dark-mode-overrides.css` — dark-theme overrides kept late in the cascade.
21. `43-mobile-overrides.css` — mobile navigation and late mobile layout overrides.
22. `legacy.css` — last-resort temporary override layer.

As page sections are cleaned up, move rules out of `legacy.css` into explicit
layers named by scope. Keep lower-numbered files for broader rules and
higher-numbered files for page-specific rules.

Production HTML in `dist/` uses page-scoped bundles. Keep shared dependencies in
the lower-numbered core layers, then add page-only rules to the matching
page layer so future bundles can stay small.
