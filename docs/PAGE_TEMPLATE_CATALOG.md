# Page Template Catalog

Status: `canonical`
Audience: `engineering`, `design`, `agents`
Purpose: `define reusable page shapes so new pages do not copy full HTML shells`

## Target Template Types

| Template | Purpose | Current Examples | Migration Notes |
|---|---|---|---|
| `base` | Shared head, nav, footer, scripts. | Most pages | Should own shared shell. |
| `home` | Homepage-specific hero, snapshot, newsletter, carousels. | `index.html` | Preserve side-nav and snapshot behavior. |
| `editorial` | Long-form static page with sections. | `about.html`, `north-star.html` | Move inline CSS to page/component layers first. |
| `collection-sidebar` | Sidebar/category/filter layout. | `books.html`, `movies.html`, `essays.html`, `skills.html` | Needs interaction contracts before JS cleanup. |
| `map-gallery` | Interactive map plus cards/gallery/lightbox. | `adventures.html` | Leaflet is self-hosted. Keep map behavior. |
| `detail-adventure` | Adventure story/detail page. | `adventure-*.html` | Strong candidate for data-driven generation. |
| `detail-skill` | Skill detail page. | `skill-*.html` | Strong candidate for data-driven generation. |
| `utility` | Contact/meeting/simple CTA flows. | `contact.html`, `meet.html` | Keep lightweight. |

## Active Template Sources

| Source | Owns | Current Generated Page |
|---|---|---|
| `_src/layouts/base.html` | Shared standard page shell. | `reading-philosophy.html` |
| `_src/pages/reading-philosophy.html` | Reading philosophy page metadata and body content. | `reading-philosophy.html` |

## Migration Rule

When migrating a page to a template:

1. Preserve generated HTML structure unless a change is explicitly approved.
2. Move only one page type at a time.
3. Run `npm run check`.
4. Browser-smoke the migrated page.
5. Ratchet a budget only after the output is stable.
