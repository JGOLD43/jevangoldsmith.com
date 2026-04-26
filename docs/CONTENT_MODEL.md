# Content Model

Status: `canonical`
Audience: `content`, `engineering`, `agents`
Purpose: `define current and target content ownership`

## Current Content Sources

| Content Type | Current Source | Rendered By |
|---|---|---|
| Site identity/social/assets | `data/site.json` | Build scripts, shared nav, pages |
| Deploy/security/budgets | `data/site.config.json` | Build/check/deploy scripts |
| Pages metadata | generated `data/pages.json` | Sitemap/checks |
| Books | `data/books.json` | `js/books.js`, `books.html` |
| Adventures | `data/adventures.json` plus detail HTML | `js/adventures.js`, `adventures.html`, `adventure-*.html` |
| Essays | `data/essays.json` plus page HTML | `js/essays.js`, `essays.html` |
| Skills | `data/skills.json` plus skill pages | `js/skills.js`, skill pages |
| Quotes | `data/quotes.json` | `js/theme.js` |
| People/products/projects/music/etc. | mostly page HTML | individual pages |

## Target Content Shape

Move repeatable content to explicit data files or Markdown/frontmatter under
`_src/content/`:

```text
_src/content/
  pages/
  adventures/
  essays/
  skills/
  projects/
  people/
  products/
```

## Content Schema Rules

Every collection should eventually define:

- required fields
- optional fields
- slug/path rule
- image requirements
- sort rule
- filter/category vocabulary
- rendering template
- validation script coverage

## Update Rule

If a content type has a JSON source, update the JSON first and let page JS or the
build render it. Do not duplicate the same content in HTML unless the migration
has not reached that content type yet.
