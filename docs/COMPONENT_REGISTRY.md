# Component Registry

Status: `canonical`
Audience: `engineering`, `design`, `agents`
Purpose: `inventory reusable website components and their ownership`

## Shared Components

| Component | Source | Behavior | Used By |
|---|---|---|---|
| Navbar | `_src/partials/nav.html` | Active state, dropdowns, mobile menu via `js/theme.js`. | All public pages except `meet.html`. |
| Footer | `_src/partials/footer.html` | Static footer links/copyright. | Most public pages. |
| Theme toggle | `js/theme.js` | Persists light/dark preference in local storage. | Shared nav pages. |
| Wisdom ticker | `js/theme.js`, `data/quotes.json` | Renders rotating quotes. | Shared nav pages. |
| Logo video hover | `js/theme.js` | Lazy-loads animated logo video. | Shared nav pages. |
| Sidebar filters | page HTML plus page JS | Category/filter state. | Books, essays, movies, skills, people. |
| Lightbox | page HTML plus page JS | Opens gallery images, keyboard navigation. | Adventures and detail pages. |
| Map | `vendor/leaflet`, `js/adventures.js`, detail inline JS | Interactive location display. | Adventures pages. |
| Cards | HTML/CSS | Repeated list/grid items. | Most collection pages. |
| Modals | page HTML plus page JS | Detail overlays. | Books, movies, adventures. |

## Ownership Rules

- Shared component markup should move toward `_src/components/`.
- Shared behavior should move toward module-style files in `js/`.
- Shared styles should move out of `css/src/legacy.css` into
  `css/src/30-components/`.
- Component changes must name affected pages in the PR/summary.

## High-Value Component Extractions

1. Filter sidebar.
2. Collection card.
3. Modal/lightbox.
4. Page hero/header.
5. Adventure map/gallery.
