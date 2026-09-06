# Website performance, dead-code and SEO review

Reviewed 5 September 2026. Baseline: `3091f64`; changes prepared in an isolated checkout so the existing unfinished bookshelf work is preserved.

## Scope and result

Reviewed all 247 generated HTML files (including detail pages and redirects), shared layout and asset hints, page naming, canonical URLs, sitemap eligibility, internal page links, browser entry points and unused modules. All existing URLs, navigation labels, layouts, filters, modals, profile controls, themes and work/personal modes are retained. Four broken relative links now resolve to their intended root pages.

## Changes

- Removed global image preloads for the Now map and both portrait formats. They were downloaded on pages that did not display them. Relevant page images still load normally, and existing navigation prefetch remains in place.
- Removed unused YouTube connection hints for the retired video page.
- Improved 22 page titles, kept social preview titles consistent through the shared layout, and synchronized the page catalog/search index. Existing descriptive titles on other static and generated detail pages were retained. URL renaming was deliberately avoided to preserve links and app navigation.
- Removed redirect-only adventure/Field Notes URLs and the intentionally unindexed Speeches page from the sitemap. Standardized the homepage sitemap URL to match its canonical slash.
- Corrected project links to Home/Newsletter and archived Now links to Books/Contact, which previously resolved beneath `/projects/` or `/now/`.
- Deleted seven unreachable modules: `lib/card.ts`, `lib/dom.ts`, `lib/lcp-attrs.ts`, `scripts/actions-registry.ts`, `scripts/adventure-detail.ts`, `scripts/collection-state.ts`, `scripts/youtube.ts`. Checked imports, repository references and dynamic loading before removal. These files were already absent from the delivered bundles; this is a maintenance improvement.
- Deleted unused homepage statistics animation, styles for removed sections, and commented-out markup. Active profile, carousel and navigation code remains.

## Performance evidence

One Lighthouse desktop simulated-throttling run per route before and after, on a local production build. Some after runs overlapped browser verification; score and timing differences are not statistically reliable. The reduced downloads are the clearest measured improvement. These are lab observations, not real-user Core Web Vitals.

| Page | Before transfer | After transfer | Saved | Before/after score |
|---|---:|---:|---:|---:|
| Home | 532.1 KB | 514.5 KB | 17.6 KB | 100 / 100 |
| Books | 1822.4 KB | 1755.5 KB | 66.9 KB | 96 / 95 |
| Movies | 2570.0 KB | 2503.2 KB | 66.8 KB | 97 / 98 |
| People | 1696.5 KB | 1629.8 KB | 66.7 KB | 98 / 96 |
| Adventures | 2192.6 KB | 2125.7 KB | 66.9 KB | 84 / 84 |
| Podcasts | 875.0 KB | 808.1 KB | 66.9 KB | 98 / 98 |
| Essays | 355.4 KB | 288.5 KB | 66.9 KB | 100 / 100 |
| Search | 373.5 KB | 306.4 KB | 67.1 KB | 100 / 100 |

Homepage viewport screenshots were pixel-identical before/after at 1400×900 and 390×900 in both light and dark themes. The Profile panel opened in all four combinations. This is a targeted visual comparison, not an assertion that every state on every page was visually tested.

## Further opportunities

- Adventures remains the slowest lab route (84; about 2.8 seconds LCP after changes). Its visible map and external tile loading deserve a separate, repeated mobile/desktop profile before changing loading order. Preserve immediate map access and the Now-to-map transition.
- Movies and Books remain the largest initial downloads. Further image-loading changes should be tested against first-row rendering and collection switching; no images or features were removed in this pass.
- The large legacy stylesheet still includes dynamically used selectors. Retain the existing per-page purge and budgets; a broader CSS rewrite needs wider visual coverage than this behavior-preserving cleanup.
- Three older browser suites are already excluded by the repository configuration (legacy adventure detail/map tests and old visual baselines). The active suite covers current adventures interactions, but comprehensive cross-browser/device coverage remains future work.

## Search naming

Google recommends concise, descriptive titles and consistent canonical signals. Titles can take time to be recrawled, and Google may select different search-result wording. References: [Google title guidance](https://developers.google.com/search/docs/appearance/title-link), [canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).

| URL | Previous title | New title |
|---|---|---|
| `/adventures.html` | Adventures, Travel Notes & Places Worth Remembering | Travel Adventures, Maps & Notes — Jevan Goldsmith |
| `/books-by-rating.html` | Books by Tier — Jevan Goldsmith | Books Ranked by Star Rating — Jevan Goldsmith |
| `/books.html` | Books I Recommend & Notes From My Reading System | Book Recommendations & Reading Notes — Jevan Goldsmith |
| `/challenges-philosophy.html` | How I Challenge Myself: A Practical Challenge Philosophy — Jevan Goldsmith | How I Set Personal Challenges — Jevan Goldsmith |
| `/challenges.html` | Challenges, Constraints & Personal Experiments | Personal Challenges & Experiments — Jevan Goldsmith |
| `/cool-shit.html` | Cool Shit: Objects, Ideas & Useful Finds — Jevan Goldsmith | Interesting Finds, Objects & Ideas — Jevan Goldsmith |
| `/essays.html` | Essays on Thinking, Business, Culture & Personal Systems | Essays on Thinking, Business & Culture — Jevan Goldsmith |
| `/free-resources.html` | Useful Resources for Thinking, Building & Learning | Free Templates & Learning Resources — Jevan Goldsmith |
| `/index.html` | Jevan Goldsmith - Finance, Real Estate Development, Writing & Tech | Jevan Goldsmith — Projects, Writing & Real Estate |
| `/lesson-logger.html` | Lesson Log: Capture Lessons Before They Vanish — Jevan Goldsmith | Lesson Log: Capture & Review Lessons — Jevan Goldsmith |
| `/movie-philosophy.html` | How I Choose What to Watch: A Film Philosophy — Jevan Goldsmith | How I Choose Films: My Film Philosophy — Jevan Goldsmith |
| `/movies-by-rating.html` | Movies by Tier — Jevan Goldsmith | Movies Ranked by Star Rating — Jevan Goldsmith |
| `/movies.html` | Movie Reviews, Watchlist & Taste Notes | Movie Reviews, Ratings & Watchlist — Jevan Goldsmith |
| `/newsletter.html` | Newsletter — Jevan Goldsmith | Monthly Newsletter & Ideas — Jevan Goldsmith |
| `/now.html` | Now — What Jevan Goldsmith is up to | Now: Current Work, Reading & Life — Jevan Goldsmith |
| `/now/archive.html` | Now archive — every past update | Now Archive: Past Life & Work Updates — Jevan Goldsmith |
| `/people-philosophy.html` | How I Approach People: A Relationship Philosophy — Jevan Goldsmith | My Philosophy on People & Relationships — Jevan Goldsmith |
| `/people.html` | People of History | Historical Figures & Influential People — Jevan Goldsmith |
| `/podcasts.html` | Podcasts, Conversations & Audio Notes | Podcast Recommendations & Notes — Jevan Goldsmith |
| `/products.html` | The Shelf: Tools, Objects & Gear That Earned Their Place — Jevan Goldsmith | Recommended Tools, Gear & Objects — Jevan Goldsmith |
| `/projects.html` | Projects Jevan Goldsmith Is Building & Exploring | Projects & Build Logs — Jevan Goldsmith |
| `/weekly-review-template.html` | Weekly Review Template for Reflection, Planning & Better Decisions — Jevan Goldsmith | Weekly Review Template — Jevan Goldsmith |

## Verification

- Type check: zero errors/warnings (one existing advisory hint).
- Lint and all 66 unit tests passed.
- Production build, asset integrity, CSS validation, search audit and performance budgets passed.
- 16/16 served-build smoke checks passed.
- 40 browser tests passed; one existing test skipped. New regression coverage validates all generated public titles, descriptions, social titles, canonical URLs, sitemap exclusions and accidental cross-page image preloads, plus nested-page links.
- Four homepage screenshot comparisons were pixel-identical; Profile opened on desktop/mobile in both themes.
- Release must pass the GitHub test and deploy-pages workflows and be verified on the custom domain; release status is reported in the task conversation.
