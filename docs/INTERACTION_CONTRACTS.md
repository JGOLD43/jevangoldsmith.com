# Interaction Contracts

Status: `canonical`
Audience: `engineering`, `qa`, `agents`
Purpose: `preserve current behavior while refactoring JavaScript and markup`

## Global Interactions

| Interaction | Contract |
|---|---|
| Theme toggle | Clicking the nav theme button switches light/dark mode and persists preference. |
| Mobile nav | Mobile menu button opens/closes nav links; dropdown triggers expand on mobile. |
| Nav dropdowns | Desktop dropdowns remain hover/click accessible through existing nav behavior. |
| Logo video | Animated logo source is lazy-loaded and plays on hover where supported. |
| Wisdom ticker | Quotes render from `data/quotes.json` with fallback quotes. |

## Homepage

| Interaction | Contract |
|---|---|
| Quick snapshot | About-me snapshot toggles open/closed from the hero image area. |
| Carousel arrows | Adventure carousel scrolls in both directions. |
| Side nav dots | Dots scroll to sections and active state follows scroll position. |

## Collections

| Page | Contract |
|---|---|
| Books | Search, star/category filters, list/grid view, modal, category modal, and sidebar collapse continue working. |
| Movies | Genre filters, modal, clear filters, sidebar collapse continue working. |
| Essays | Search/category filters and sidebar/list controls continue working. |
| Skills | Category pages and skill detail initialization continue working. |
| People | Category filtering and sidebar collapse continue working. |
| Search | Query input, type filters, result counts, and result links use the static search index. |

## Adventures

| Interaction | Contract |
|---|---|
| World map | Loads with self-hosted Leaflet and renders adventure markers. |
| Mobile list/map toggle | Switches between list and map views. |
| Region filters | Filter pills update cards and active state. |
| Detail overlay | Selecting an adventure opens detail panel. |
| Lightbox | Gallery opens/closes, next/previous works, Escape closes. |
| Detail maps | Adventure detail map displays photo locations where coordinates exist. |

## Refactor Rule

When replacing inline handlers with delegated JS, keep the same DOM affordances
and user-visible behavior first. Change internal event wiring only.
