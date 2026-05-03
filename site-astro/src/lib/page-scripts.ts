// Per-page script lists ported from scripts/legacy-build/build/js-manifest.js.
// Returns the list of /js/*.js paths a given page should load. The legacy
// build concatenates these into a single bundle (page-X.HASH.js); for Astro
// we ship them as individual <script src> tags (cacheable, no bundle step).

const collectionCore = [
  '/js/grid-zoom.js',
  '/js/collection-ui.js',
  '/js/collection-runtime.js',
  '/js/collection-helpers.js',
  '/js/data-fetch.js'
];

const PAGE_SCRIPTS: Record<string, string[]> = {
  'index.html': ['/js/sanitize.js', '/js/theme.js', '/js/home.js', '/js/newsletter.js', '/js/analytics.js'],
  'field-notes.html': ['/js/theme.js', '/js/newsletter.js', '/js/analytics.js'],
  'search.html': ['/js/collection-ui.js', '/js/data-fetch.js', '/js/sanitize.js', '/js/theme.js', '/js/search-astro.js', '/js/analytics.js'],
  'videos.html': ['/js/youtube.js', '/js/sanitize.js', '/js/theme.js', '/js/analytics.js'],
  'cool-shit.html': ['/js/theme.js', '/js/analytics.js', '/js/cool-shit.js'],
  'important-or-not.html': ['/js/theme.js', '/js/important-or-not.js', '/js/analytics.js'],
  'dateme.html': ['/js/action-dispatcher.js', '/js/dateme.js', '/js/theme.js', '/js/analytics.js'],
  'adventures.html': ['/js/action-dispatcher.js', '/js/adventures-runtime.js', '/js/adventures-ui.js', '/js/adventures-map.js', '/js/adventures.js', '/vendor/dompurify/purify.min.js', '/js/sanitize.js', '/js/theme.js', '/js/analytics.js'],
  'books.html': [...collectionCore, '/js/books.js', '/js/sanitize.js', '/js/theme.js', '/js/analytics.js'],
  'movies.html': [...collectionCore, '/js/action-dispatcher.js', '/js/movie-stats.js', '/js/letterboxd.js', '/js/sanitize.js', '/js/theme.js', '/js/analytics.js'],
  'essays.html': ['/vendor/dompurify/purify.min.js', '/js/sanitize.js', '/js/collection-ui.js', '/js/collection-runtime.js', '/js/data-fetch.js', '/js/action-dispatcher.js', '/js/essays.js', '/js/theme.js', '/js/analytics.js'],
  'people.html': ['/js/theme.js', ...collectionCore, '/js/sanitize.js', '/js/action-dispatcher.js', '/js/people.js', '/js/analytics.js'],
  'podcasts.html': [...collectionCore, '/js/sanitize.js', '/js/action-dispatcher.js', '/js/podcasts.js', '/js/theme.js', '/js/analytics.js'],
  'projects.html': ['/js/grid-zoom.js', '/js/collection-ui.js', '/js/collection-runtime.js', '/js/action-dispatcher.js', '/js/task-list.js', '/js/projects.js', '/js/theme.js', '/js/analytics.js'],
  'challenges.html': ['/js/grid-zoom.js', '/js/collection-ui.js', '/js/collection-runtime.js', '/js/action-dispatcher.js', '/js/task-list.js', '/js/challenges.js', '/js/theme.js', '/js/analytics.js'],
  'products.html': ['/js/theme.js', '/js/grid-zoom.js', '/js/shelf.js', '/js/analytics.js'],
  'free-resources.html': ['/js/theme.js', '/js/grid-zoom.js', '/js/shelf.js', '/js/analytics.js'],
  'quotes.html': ['/js/theme.js', '/js/collection-filters.js', '/js/analytics.js']
};

const COMMON = ['/js/theme.js', '/js/analytics.js'];
const COMMON_PAGES = new Set([
  'about.html',
  'changed-my-mind.html',
  'contact.html',
  'health.html',
  'lesson-logger.html',
  'meet.html',
  'movie-philosophy.html',
  'north-star.html',
  'notes.html',
  'people-philosophy.html',
  'problems.html',
  'takes.html',
  'weekly-review-template.html'
]);

// Adventure detail pages (adventure-<slug>.html) ship the adventure-detail
// runtime + lightbox handling alongside the standard analytics + theme.
const ADVENTURE_DETAIL_SCRIPTS = [
  '/js/action-dispatcher.js',
  '/js/adventure-detail.js',
  '/js/sanitize.js',
  '/js/theme.js',
  '/js/analytics.js'
];

export function pageScriptsFor(currentPage: string): string[] {
  if (PAGE_SCRIPTS[currentPage]) return PAGE_SCRIPTS[currentPage];
  if (COMMON_PAGES.has(currentPage)) return COMMON;
  if (currentPage.startsWith('adventure-') && currentPage.endsWith('.html')) return ADVENTURE_DETAIL_SCRIPTS;
  // people/<slug>.html and topics/<slug>.html: ship common + sanitize + analytics
  if (currentPage.startsWith('people/') || currentPage.startsWith('topics/')) return COMMON;
  return COMMON;
}
