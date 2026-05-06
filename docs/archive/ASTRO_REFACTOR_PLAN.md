# Astro Refactor — Full Plan

A clean, phase-by-phase plan with concrete acceptance criteria so we don't repeat the "many sessions, vague progress" pattern from prior sessions.

## Operating principles

1. **`main` is sacred.** Always-shippable legacy. Never merge to it until parity is real.
2. **Legacy snapshot is the spec.** `dist-legacy-snap/` is the source of truth. If Astro doesn't match it, Astro is wrong.
3. **One page → done → commit → next page.** No batch claims of "all fixed." Each page lands as its own commit.
4. **Visual side-by-side before saying done.** Open legacy and Astro at the same URL in two tabs. If they don't match, it's not done.
5. **Automate verification.** Build a parity diff so a human doesn't have to eyeball 40 pages.
6. **No speculation.** Every fix proven by inspecting the actual rendered output, not by reasoning about source.

---

## Phase 0 — Foundation & verification harness

The biggest reason past sessions went sideways: no automated way to know when a page was "done." Fix that first.

**0.1 Parity diff tool.** A new script `scripts/check-parity.js`:
- Builds Astro into a temp dir.
- For each route, fetches both the Astro and legacy HTML.
- Strips bundle hashes (`Base.<hash>.css` → `Base.HASH.css`), normalizes whitespace.
- Reports per-page: byte delta, missing classes, missing IDs, missing data attributes, structural drift.
- Prints a single number: "X / 41 pages within tolerance."
- Defines the tolerance (probably <5% byte delta + zero missing structural elements).

**0.2 Visual diff.** Playwright captures screenshots of every page on both builds at 1280×800 and 375×812. Perceptual diff (pixelmatch). Output: `tests/visual-diff/<page>-{desktop,mobile}.diff.png` for any page that fails.

**0.3 Image pipeline decision.** Astro currently consumes images that the legacy build generates. Pick one:
- **A:** Make the Astro build invoke `optimize-assets.js` itself.
- **B:** Use Astro's own `astro:assets` for new images, keep legacy outputs for old ones.
- Recommend **A** — same tooling, less complexity.

**0.4 Theme system.** Verify `js/theme.js` works on every Astro page: reads localStorage, falls back to system preference, persists toggle.

**0.5 Analytics verified firing.** Open devtools, click a tracked element, confirm the event fires with the right `data-cta-id` / `data-cta-location`.

**Done when:** `npm run check:parity` produces a single report. The number it prints is the project's progress meter from here on.

---

## Phase 1 — Lock down chrome

The shared bits across every page. These have to be byte-identical or near it before anything else matters.

- `Nav.astro` — logo, wisdom ticker, dropdowns (Explore, Content, Taste, Adventures, Ventures), theme toggle, hamburger, "Let's Chat" CTA.
- `Footer.astro` — copyright, footer links.
- Wisdom ticker rotates correctly with `js/theme.js`.
- Dark/light theme: identical CSS output to legacy in both modes.
- Mobile breakpoints: hamburger menu opens, nav-links slide in.

**Done when:** The chrome diff is <500 bytes per page across all 41 pages.

---

## Phase 2 — Static content pages

The lowest-hanging fruit. Correct HTML + matching CSS classes. No interactivity.

| Page | Difficulty | Notes |
|---|---|---|
| about | trivial | already mostly there |
| contact | trivial | form + social links |
| meet | trivial | noChrome layout, contact form |
| north-star | trivial | philosophy sections |
| living-manifesto | trivial | philosophy sections |
| reading-philosophy | trivial | |
| people-philosophy | trivial | |
| movie-philosophy | trivial | |
| health | trivial | |
| takes | trivial | |
| problems | trivial | |
| changed-my-mind | trivial | |
| notes | trivial | |
| videos | trivial | |
| weekly-review-template | trivial | |
| speeches | trivial | |
| field-notes | small | newsletter form |

For each page: open legacy at `/page.html`, open astro at `/page.html`, compare side by side, fix until parity. **One commit per page.**

**Done when:** Each page passes `check:parity` with <5% byte delta.

---

## Phase 3 — Collection list pages

Pages with cards + filters + search. The legacy interactivity has to be ported.

| Page | What needs porting |
|---|---|
| books | filter sidebar (rating / re-reads / category), search input, modal on click (cover + review), grid zoom on hover, ISBN cover fallback |
| movies | genre filter, year filter, deep-link `?movie=<title>`, runtime stats, Letterboxd sync |
| people | search, source filter (nonfiction / business / etc.), modal showing person + their books + Wikipedia link |
| podcasts | curated picks, host filter |
| essays | category/topic filter, date sort |
| quotes | category filter, search |
| projects | status filter, category filter |
| challenges | status / timeframe filter |
| products | category filter, zoom-to-detail interaction |
| free-resources | type filter, download CTAs |

Per page: define an Astro client island that owns the page's interactive state. Static cards are server-rendered. The island wires up filtering, search, modal.

**Pattern to standardize:** every collection page gets a `<PageNameIsland client:load>` that:
1. Reads `data-*` attributes from server-rendered cards.
2. Reads filter / search input changes.
3. Toggles `hidden` on cards based on state.
4. Updates URL search params so filters are shareable.
5. Persists scroll position on modal close.

**Done when:** Every filter, search, and modal in legacy works identically in Astro.

---

## Phase 4 — Special pages

Pages with bespoke UI that doesn't fit the collection pattern.

### 4.1 Homepage
- Hero: headline, welcome, CTA card, profile picture (responsive `<picture>`)
- **Snapshot toggle:** "ABOUT ME" floating button → animated card with bio details
- **Side-nav dots:** right-edge scrollspy navigation between sections
- Credibility bar (live counts from collections)
- Newsletter CTA
- Featured carousel: essays / books / adventures with chevron + dot pagination
- Value-prop section (3 philosophy cards)
- Current-focus section
- Final CTA

### 4.2 Adventures
- Sidebar with adventure list + count
- Leaflet map with markers
- **GPX route polylines** (legacy reads from `data/routes.generated.json`)
- **Places-of-interest layer** (`data/placeofinterest.json`)
- Region filter pills (Europe / Asia / Australia / Americas / Other) — affects map + list
- Mobile list/map toggle button
- "Adventures" header with trip count

### 4.3 Cool-shit
- Timeline scrollspy (sticky left sidebar with month markers)
- Tag rail filter (right column)
- Category counts in rail
- Expand/collapse months
- "Field Archive · Cool Shit" eyebrow + count

### 4.4 Products / The Shelf
- Category filter buttons that actually filter
- `.shelf-item` cards with photo + name + verdict
- **Zoom interaction:** click an item → grid pulls back, item enlarges, detail panel slides in
- Disclosure footer

### 4.5 Search
- Search input + URL `?q=` persistence
- Type filter pills (all / books / essays / people / etc.)
- Results card list with type badge

### 4.6 Dateme
- Multi-step funnel state machine
- Step transitions, validation, summary screen
- Form submit to formsubmit.co

### 4.7 Important-or-not
- Filter pills with live counts
- Card animations on filter change

### 4.8 Lesson-logger
- Real lesson data from `data/`
- Date sort, search
- "Learned from: [book/adventure]" cross-links

**Done when:** Each special page's interactions match legacy exactly.

---

## Phase 5 — Detail routes

- `adventure-[slug]`: hero image, story body, highlights tags, location/date metadata, photo gallery, "Back to Adventures" link
- `people/[slug]`: bio, thesis, life timeline, books they wrote/recommended, resources/links, Wikipedia external link

**Done when:** Each detail page has all the legacy elements + works for every slug.

---

## Phase 6 — Polish & ship

- `npm run check:parity` reports 41/41 within tolerance.
- `npm run check:visual` reports 0 perceptual diffs >2%.
- All existing checks pass: `check:seo`, `check:content`, `check:links`, `check:smoke`, `check:page-baselines`.
- Per-page JSON-LD validates in Google Rich Results test.
- Performance budgets in `data/site.config.json` met.
- Playwright `test:browser` passes.
- Production canary: deploy `refactor/astro` to Firebase preview channel, verify production behavior, then merge to main.

**Done when:** `main` builds with `npm run build:astro` and the production site is the Astro build, with `dist-legacy-snap/` retained as a rollback artifact for ~1 month.

---

## Risk register

| Risk | Mitigation |
|---|---|
| Tailwind 4 CSS purge bites again | Keep legacy CSS as static asset. Don't migrate to Tailwind utilities until Astro reaches parity. |
| Image pipeline drift | Phase 0.3 — Astro build owns image generation. |
| Scrollspy / carousel / modal complexity | Reuse legacy JS verbatim where possible. Don't rewrite — port. |
| "Done" claim without verification | Phase 0 harness is non-negotiable. No commit lands without `check:parity` reporting that page passes. |
| Scope creep | Strict rule: Astro must match legacy first. Improvements only after parity ships. |

## What this plan is NOT

- Not a Tailwind utility migration. That's a separate project after parity.
- Not a redesign. Identical to legacy or it's a regression.
- Not a Phase-11 SSR migration. Static output stays.
