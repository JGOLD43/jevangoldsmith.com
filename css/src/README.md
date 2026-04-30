# CSS Source Layers

`css/style.css` is generated from this directory by `npm run build`. Every
page in `dist/` references the single hashed bundle.

Layers, concatenated in alphabetical order to preserve cascade:

1. `01-tokens.css` — design tokens, base reset, web fonts.
2. `02-chrome.css` — side-nav, top nav, footer, page-content scaffolding, modal/form primitives.
3. `03-collection.css` — collection layout/sidebar/header/cards, SEO-related, rating modal, search, skill-detail.
4. `04-pages-feature.css` — home, reading, essays, meet, books, taste-sidebar, movies, adventures, dateme, products+resources.
5. `05-overrides.css` — responsive, nav extras, home redesign, dark-mode, mobile overrides.
6. `06-pages-misc.css` — projects, quotes, archive-home, field-notes, shelf, grid-zoom, resource-detail, takes.
7. `07-pages-leaf.css` — adventure-detail and per-page extras (about, challenges, cool-shit, health, etc.).

When adding new styles, append to the file whose responsibility most closely
matches. Keep ordering alphabetical so the build's `readdirSync().sort()` produces
the correct cascade.
