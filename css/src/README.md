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
7. `14-collection-layout.css` — shared layout shell for collection-style pages.
8. `15-collection-sidebar.css` — shared sidebar, dropdown, and search primitives for collection pages.
9. `16-collection-header.css` — shared collection-page header and counter treatment.
10. `17-collection-taste-cards.css` — shared card/grid shell for books, movies, and podcasts.
11. `20-search.css` — public static search page.
12. `20-skill-detail.css` — generated skill detail pages.
13. `30-home.css` — homepage-specific sections and interactions.
14. `31-reading.css` — reading philosophy page.
15. `32-essays.css` — essays-specific layout, navigation, and article chrome beyond the shared collection shell.
16. `33-meet.css` — meet/contact lead-capture page.
17. `34-books.css` — books-only cards, shelves, and bookshelf interactions.
18. `34-taste-sidebar.css` — taste-browser filter and link behavior layered on top of shared collection sidebar primitives.
19. `35-movies.css` — movie-only filters and genre treatment.
20. `36-adventures.css` — adventures list, map, cards, overlays, and responsive states.
21. `37-dateme.css` — date-me funnel screens, conversion states, and controls.
22. `39-responsive.css` — cross-page responsive overrides that must run after page layers.
23. `40-nav-extras.css` — wisdom ticker, theme toggle, and contact dropdown.
24. `41-home-redesign.css` — homepage redesign sections that still need consolidation.
25. `42-dark-mode-overrides.css` — dark-theme overrides kept late in the cascade.
26. `43-mobile-overrides.css` — mobile navigation and late mobile layout overrides.
27. `legacy.css` — last-resort temporary override layer.

As page sections are cleaned up, move rules out of `legacy.css` into explicit
layers named by scope. Keep lower-numbered files for broader rules and
higher-numbered files for page-specific rules.

Production HTML in `dist/` uses page-scoped bundles. Keep shared dependencies in
the lower-numbered core and collection layers, then add page-only rules to the
matching page layer so future bundles can stay small.
