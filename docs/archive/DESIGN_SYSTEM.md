# Website Design System

Status: `canonical`
Audience: `design`, `engineering`, `agents`
Purpose: `preserve the current visual style while allowing safer implementation work`

## Design Intent

The site should feel personal, editorial, polished, and exploratory. It is a
digital home rather than a SaaS dashboard. The design should preserve a sense of
curiosity and taste while keeping pages readable and calm.

## Visual Preservation Rule

Infrastructure work must not change:

- typography hierarchy
- color palette
- nav/dropdown appearance
- page spacing rhythm
- card shape and density
- modal/lightbox behavior
- map/gallery presentation
- mobile layout behavior

Any intentional visual change should be named separately from a refactor.

## Typography

Primary font: Chivo from Google Fonts.

Current usage patterns:

- Large, high-confidence page headings.
- Compact uppercase labels for categories and metadata.
- Comfortable body copy with generous line height.
- Strong contrast between editorial headings and muted supporting text.

Do not replace the font family or type hierarchy during infrastructure work.

## Color And Tone

The site uses a restrained personal-brand palette with warm accent treatment,
dark/light theme support, muted text, and image-heavy editorial sections.

Design changes should avoid:

- one-note gradient-heavy palettes
- generic SaaS-blue styling
- decorative background blobs
- unrelated rounded cards inside cards
- adding visual noise to dense content pages

## Layout Patterns

Current recurring patterns:

- global navbar with dropdowns and contact affordance
- simple footer
- editorial hero sections
- sidebar plus content layouts for collections
- cards for repeated items
- lightbox overlays for galleries
- map plus list split layout for adventures
- filter pills and category sidebars

## Component Shape Rules

- Preserve existing border radii and shadows unless changing a component
  intentionally.
- Preserve existing card density on collection pages.
- Do not add explanatory UI text for obvious controls.
- Keep mobile controls stable in size and avoid layout shift.
- Keep image aspect ratios stable.

## Visual QA Baseline Pages

Use these pages as style regression canaries:

- `index.html`
- `about.html`
- `books.html`
- `movies.html`
- `adventures.html`
- one `adventure-*.html` detail page
- `people.html`
- `products.html`

Future visual regression automation should screenshot these at desktop and
mobile widths.
