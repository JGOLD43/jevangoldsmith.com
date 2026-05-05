# Astro Performance Plan — Orders-of-Magnitude Edition

Goal: get Astro to 2-4× faster than legacy on every metric without changing user-visible behavior. Five phases, each independently shippable, each with verification gates and a rollback path.

## Current state (after parity refactor)

- FCP: 158ms (Astro) vs 178ms (Legacy) — Astro 11% faster
- LCP: 338ms vs 330ms — tied
- Total transfer: 1094 KB vs 975 KB — Astro 12% bigger (image variants)
- CSS: 56 KB vs 187 KB — Astro 70% smaller (purge already done)
- Structural parity: 41/41 · Visual parity: 63/82 · Runtime: 100%

## Target state (after this plan)

- FCP: 40-70ms (3× faster than legacy)
- LCP: 120-180ms (2× faster)
- Total transfer: 350-500 KB (2× smaller)
- CSS: 8-12 KB per page (4× smaller, 95% smaller than legacy starting point)
- Initial JS: 5-15 KB per page (5-10× smaller on collection pages)
- TTFB: ~10ms globally (edge-rendered)

## Operating principles

1. **Behavior is sacred.** No user-visible change. Same look, same interactions, same URLs, same data.
2. **One feature → done → ship → next.** Each phase commits and deploys before the next starts. No big-bang rewrites.
3. **Verification is automatic.** Use the parity harness we already built (`check-parity`, `check-visual-parity`, `check-runtime`, `perf-compare`) on every commit. No commit lands until it passes all four.
4. **Rollback is one revert.** Each phase is its own branch off main, merge only when green. If perf or behavior regresses in production, revert.
5. **The legacy snapshot stays as the spec.** `dist-legacy-snap/` and the parity tools remain the regression guard until the day Astro ships to prod.

The pace is set by the verification loop, not by human schedules. Build + parity + visual + runtime + perf takes about 12 minutes per pass. Each component-level change is gated on a green pass before the next change starts. Phases finish when their verification gates are met, not on a calendar.

---

## Phase A — Tailwind utility migration

The 187 KB legacy-style.css → ~8 KB per page. This is the single biggest perf win and unblocks every later phase.

### Why it matters
- CSS-parse + paint dominates FCP under CPU throttle. Right now we ship 44 KB per page (post-purge); shrinking to 8 KB cuts FCP from ~150ms to ~50ms.
- Tailwind utilities are scoped per component, so unused utilities literally cease to exist (vs purge which is conservative).
- Sets up the visual baseline for Phase B (component rewrites).

### Approach
1. **Audit** every component / page for the CSS classes it actually uses. We have this data already from the purge step — average page uses ~280 unique classes.
2. **Create utility primitives** in Tailwind theme config: colors, spacing, typography, breakpoints all map to legacy CSS variables (`--primary-color`, `--secondary-color`, etc). Tailwind reads from `:root` automatically.
3. **Migrate component by component** (50 .astro files):
   - Replace class names with utility classes (`.navbar` → `flex items-center justify-between gap-4`, etc.)
   - For complex selectors that don't fit utilities (animations, pseudo-elements), keep as scoped CSS in the component
   - Per-component visual diff: build → screenshot → compare to legacy
4. **Drop the legacy stylesheet** when every component is migrated.
5. **Verify** zero regression: 41/41 structural, 63/82+ visual, 100% runtime, perf improved.

### Risk
- Spacing values in legacy CSS use exotic numbers (e.g. `1.875rem`, `0.4375rem`). Tailwind's default scale doesn't include them. Solution: extend Tailwind theme with the exact legacy values.
- A few legacy rules use `!important` to override theme cascades. Need to map to Tailwind's `!` prefix or refactor cascade order.
- Hover/focus pseudo-states need careful migration; visual diff catches them.

### Verification gate
- Visual parity ≥ 63/82 viewport-pairs at ≤2% diff (no regression)
- Structural parity 41/41 unchanged
- Runtime 100% unchanged
- Perf: FCP target ≤ 80ms, CSS transfer ≤ 12 KB/page

---

## Phase B — Astro islands for collection pages

Books / movies / people / podcasts / essays / projects / challenges still ship 60-90 KB of legacy JS that fetches data and renders cards client-side. Replace each with Astro components rendered at build time + tiny `client:visible` islands for interactivity.

### Why it matters
- Initial JS on books.html drops from 73 KB → ~10 KB. Same on movies/people/podcasts.
- Cards SSR'd at build time: instant LCP, no flash-of-empty-container.
- Search / filter logic loads only when user scrolls to or interacts with the sidebar. Islands hydrate lazily.

### Approach (per page)

#### B.1 Books
1. Replace `books.js` (38 KB minified) with:
   - `<BookCard book={...}/>` Astro component (server-rendered)
   - `<BooksFilterIsland books={...} client:visible/>` for search + category filter (~3 KB Preact island)
   - `<BookModal client:idle/>` for the review modal — only loads when first card is clicked
2. The Astro page calls `getCollection('books')` at build time and renders all 122 cards.
3. Search/filter island reads from server-rendered DOM, toggles `hidden` class.
4. Modal island registers a single delegated click listener; lazy-imports the modal markup on demand.

#### B.2 Movies (mirror books)
1. Movie cards SSR'd at build time.
2. Genre/year/rating filter as Preact island.
3. Letterboxd modal lazy-loaded.
4. Stats panel computed at build time (no client JS).

#### B.3-B.7 People / Podcasts / Essays / Projects / Challenges
- Same pattern.

### Risk
- Per-card data attributes need to match exactly so existing JS-based listeners still work for any leftover global handlers.
- The legacy JS uses `JGAction` dispatcher pattern — replacing with Astro events needs careful audit.
- Modal lazy-load timing: first click might feel slow if user clicks before island hydrates. Mitigate with prefetch on hover.

### Verification gate
- All cards render at build time (count matches legacy at runtime)
- All interactions (filter, search, modal, pagination) work identically to legacy
- Visual parity unchanged or improved
- Perf: books LCP ≤ 200ms, initial JS ≤ 20 KB per page

---

## Phase C — Image pipeline overhaul

Replace the broad post-build `<picture>` wrapping with Astro's native `<Image>` component. Per-image format selection based on browser hint, not three siblings every time.

### Why it matters
- Currently every gallery image emits avif + webp + jpg `<source>` tags. Browser fetches one, 12-15% wasted HTML per page on collection pages.
- Astro's `<Image>` only emits the variants the page actually needs, with explicit dimensions for zero CLS.
- Picture-source bandwidth waste: people.html ships 95 KB of `<source>` URLs that no one fetches.

### Approach
1. Audit every `<img>` use across components. Replace with `<Image>` from `astro:assets`.
2. For data-driven images (book covers, gallery photos), create a thin wrapper component that calls `getImage()` from `astro:assets` at build time.
3. Drop the post-build `optimizeLocalImageReferences` step from `normalize-astro-html.js`.
4. Lazy-load below-fold images already (already done via `loading="lazy"`).

### Risk
- Astro `<Image>` requires the source to be importable. Remote URLs (Unsplash) need to go through `getImage()` with `inferSize: true`.
- Some legacy code-paths read `data-image` from card attributes; need to make sure they keep getting valid paths.

### Verification gate
- All images render with same visible dimensions
- Visual parity unchanged
- HTML transfer ≤ 25 KB/page on collection pages (was 31 KB)
- Total transfer ≤ 700 KB on collection pages (was 1094 KB)

---

## Phase D — Edge SSR + smart caching

Switch from static-site to edge-rendered. Per-request HTML generation at the edge (Cloudflare Workers / Vercel Edge / Firebase App Hosting), with smart cache layers.

### Why it matters
- TTFB drops from ~10ms (whatever the static-host RTT is) to ~5ms globally.
- Enables conditional content (e.g. dark mode preference baked into the first byte, no flash).
- Enables HTTP/2 server push and 103 Early Hints for the critical CSS / JS bundle.
- Enables on-demand revalidation: edit a page, push, edge cache invalidates in < 5 seconds.

### Approach
1. Switch `astro.config.mjs` `output: 'static'` → `output: 'hybrid'`.
2. Add an edge adapter (Cloudflare Pages or Vercel Edge — both work).
3. Configure cache headers: pages are `s-maxage=3600` (1h edge cache) with stale-while-revalidate.
4. Static assets (CSS, JS, images) cached `max-age=31536000` (1yr immutable, hash-named).
5. Add `<link rel="preload">` for critical CSS / JS bundle as 103 Early Hints.

### Risk
- Build pipeline changes from "build once → upload static" to "deploy as serverless functions". Slightly more complex CD.
- Edge functions have 1MB request limit and ~50ms cold-start. Mitigate by keeping per-page bundle small (Phase A + B already does this).
- Cost: edge-rendered requests cost ~$0.50 per 1M requests. For a personal site at low traffic, basically free.

### Verification gate
- Production canary deploy: 1% of traffic on edge, 99% on static. Measure FCP/LCP at edge for the canary window.
- Real-user monitoring: 75th percentile FCP ≤ 70ms, LCP ≤ 200ms.
- Cost stays within plan (Cloudflare Pages free tier or Vercel hobby).

---

## Phase E — Service worker for repeat visits

Cache chrome (nav + footer + per-page CSS + bundle JS) so repeat visits are near-instant.

### Why it matters
- First visit: today's perf (Phase A-D wins apply).
- Second visit: chrome + most assets served from local SW cache. FCP drops to ~5ms because nothing waits on network.
- Third+ visits: same as second.
- Even on slow networks (3G, throttled wifi) the user gets near-instant subsequent navigations.

### Approach
1. Create `service-worker.ts` that:
   - Precaches chrome CSS, font files, and the most-visited 5 pages
   - Runtime-caches per-page CSS / JS bundles with stale-while-revalidate
   - Runtime-caches images with cache-first
2. Register the service worker from Base.astro on first visit (`navigator.serviceWorker.register`).
3. Versioning via build-time hash injection so cache invalidates correctly when content changes.

### Risk
- Service worker can serve stale content if the cache invalidation logic has bugs. Mitigate with conservative `stale-while-revalidate` (always check network in background).
- Some users have weird browser configs that block SW. Fail gracefully (no SW = same as today).
- Adds ~3 KB JS to first-visit. Marginal.

### Verification gate
- First visit perf unchanged (or better)
- Second visit FCP ≤ 20ms (was 158ms)
- No SW errors in console
- Lighthouse PWA audit ≥ 90

---

## Phase F — Polish & ship

Final audit + production rollout.

### Tasks
1. **Lighthouse audit** every page; fix any metric below the green threshold.
2. **Real-user monitoring** (web-vitals lib + analytics endpoint) to verify field perf matches lab.
3. **A/B test** in production: 50% legacy, 50% new Astro. Measure bounce rate, time-on-page, conversion proxies. Run until statistically significant.
4. **Cutover** when A/B shows no regression on UX metrics.
5. **Retire legacy** — move `dist-legacy-snap/` to `archive/` and drop the `npm run build` (legacy) script.
6. **Update docs** — `README.md`, `ARCHITECTURE.md`, deploy runbook reflect the new pipeline.

### Verification gate
- A/B test green (no UX regression at p < 0.05)
- All Lighthouse scores ≥ 90 (perf / a11y / best-practices / SEO / PWA)
- Real-user 75th percentile FCP ≤ 70ms, LCP ≤ 200ms
- Zero regression alerts during the canary window

---

## Risk register

| Risk | Mitigation |
|---|---|
| Tailwind migration introduces visual regressions | Component-by-component visual diff; rollback per component if any drift |
| Component rewrites break legacy JS that other pages depend on | Phase B is page-by-page; each page is independently testable + revertable |
| Edge SSR cold-start perf | Bundle size kept small via Phase A + B; cache hit ratio target ≥ 95% |
| Service worker bugs (stale content) | Conservative SWR; fail gracefully if SW errors; per-deploy cache version |
| Behavior change slips through parity check | The check tools cover structure + visual + runtime + perf, but can't catch race conditions or subtle UX shifts. Mitigation: A/B test in Phase F. |

## Sequencing rationale

**Why Tailwind first?** It's foundational — once CSS is utility-based, every later phase has fewer moving parts. Doing it after component rewrites means re-doing the styling work for each component twice.

**Why components after Tailwind?** Component rewrites need to know how the styling system works. With Tailwind in place, every new component naturally produces minimal CSS.

**Why image pipeline after components?** Components define how images are referenced; native `<Image>` integrates with the component model.

**Why edge last?** Static + edge-rendered are deploy targets. We can ship to static throughout and only flip to edge when everything else is ready.

## What this plan is NOT

- Not a redesign. Visual output stays identical.
- Not a content rewrite. Words and pages stay the same.
- Not a feature freeze. New pages can ship into the new pipeline as you build them.

## What you get

- 2-4× faster FCP / LCP on every page
- 60-80% smaller transfer on every page
- Same look, same interactions, same SEO
- Cleaner code, faster future iteration
- Production parity tools to catch regressions for years

## Day 1 of execution

The very first thing on `go`:

1. Branch off main: `git checkout -b perf/phase-a-tailwind`
2. Set up Tailwind v4 config with all legacy CSS variable mappings
3. Migrate the simplest component first: `Footer.astro` (just text + 4 links)
4. Run all 4 parity checks. If any fail, fix before moving to next component.
5. Move to next component.

Each component lands as its own commit. Phase A ships when all 50 components are green. Then Phase B starts.
