const commonScripts = ['js/theme.js', 'js/analytics.js'];
const collectionCore = ['js/grid-zoom.js', 'js/collection-ui.js', 'js/collection-runtime.js', 'js/data-fetch.js'];

const jsBundles = {
  'js/bundles/page-common.js': commonScripts,
  'js/bundles/page-home.js': ['js/sanitize.js', 'js/theme.js', 'js/home.js', 'js/newsletter.js', 'js/analytics.js'],
  'js/bundles/page-field-notes.js': ['js/theme.js', 'js/newsletter.js', 'js/analytics.js'],
  'js/bundles/page-search.js': ['js/collection-ui.js', 'js/data-fetch.js', 'js/sanitize.js', 'js/theme.js', 'js/search.js', 'js/analytics.js'],
  'js/bundles/page-videos.js': ['js/youtube.js', 'js/sanitize.js', 'js/theme.js', 'js/analytics.js'],
  'js/bundles/page-cool-shit.js': ['js/theme.js', 'js/analytics.js', 'js/cool-shit.js'],
  'js/bundles/page-important-or-not.js': ['js/theme.js', 'js/important-or-not.js', 'js/analytics.js'],
  'js/bundles/page-dateme.js': ['js/action-dispatcher.js', 'js/dateme.js', 'js/theme.js', 'js/analytics.js'],
  'js/bundles/page-adventures.js': ['js/action-dispatcher.js', 'js/adventures-runtime.js', 'js/adventures-ui.js', 'js/adventures-map.js', 'js/adventures.js', 'vendor/dompurify/purify.min.js', 'js/sanitize.js', 'js/theme.js', 'js/analytics.js'],
  'js/bundles/page-books.js': [...collectionCore, 'js/books.js?v=7', 'js/sanitize.js', 'js/theme.js', 'js/analytics.js'],
  'js/bundles/page-movies.js': [...collectionCore, 'js/action-dispatcher.js', 'js/movie-stats.js', 'js/letterboxd.js', 'js/sanitize.js', 'js/theme.js', 'js/analytics.js'],
  'js/bundles/page-essays.js': ['vendor/dompurify/purify.min.js', 'js/sanitize.js', 'js/collection-ui.js', 'js/collection-runtime.js', 'js/data-fetch.js', 'js/action-dispatcher.js', 'js/essays-state.js', 'js/essays-filters.js', 'js/essays-view.js', 'js/essays.js', 'js/theme.js', 'js/analytics.js'],
  'js/bundles/page-people.js': ['js/theme.js', ...collectionCore, 'js/sanitize.js', 'js/action-dispatcher.js', 'js/people.js', 'js/analytics.js'],
  'js/bundles/page-podcasts.js': [...collectionCore, 'js/sanitize.js', 'js/action-dispatcher.js', 'js/podcasts.js', 'js/theme.js', 'js/analytics.js'],
  'js/bundles/page-projects.js': ['js/grid-zoom.js', 'js/collection-ui.js', 'js/collection-runtime.js', 'js/action-dispatcher.js', 'js/task-list.js', 'js/projects.js', 'js/theme.js', 'js/analytics.js'],
  'js/bundles/page-challenges.js': ['js/grid-zoom.js', 'js/collection-ui.js', 'js/collection-runtime.js', 'js/action-dispatcher.js', 'js/task-list.js', 'js/challenges.js', 'js/theme.js', 'js/analytics.js'],
  'js/bundles/page-products-resources.js': ['js/theme.js', 'js/grid-zoom.js', 'js/shelf.js', 'js/analytics.js'],
  'js/bundles/page-quotes.js': ['js/theme.js', 'js/collection-filters.js', 'js/analytics.js']
};

const pageBundleRoutes = {
  'index.html': 'js/bundles/page-home.js',
  'field-notes.html': 'js/bundles/page-field-notes.js',
  'search.html': 'js/bundles/page-search.js',
  'videos.html': 'js/bundles/page-videos.js',
  'cool-shit.html': 'js/bundles/page-cool-shit.js',
  'important-or-not.html': 'js/bundles/page-important-or-not.js',
  'dateme.html': 'js/bundles/page-dateme.js',
  'adventures.html': 'js/bundles/page-adventures.js',
  'books.html': 'js/bundles/page-books.js',
  'movies.html': 'js/bundles/page-movies.js',
  'essays.html': 'js/bundles/page-essays.js',
  'people.html': 'js/bundles/page-people.js',
  'podcasts.html': 'js/bundles/page-podcasts.js',
  'projects.html': 'js/bundles/page-projects.js',
  'challenges.html': 'js/bundles/page-challenges.js',
  'products.html': 'js/bundles/page-products-resources.js',
  'free-resources.html': 'js/bundles/page-products-resources.js',
  'quotes.html': 'js/bundles/page-quotes.js'
};

const commonPages = [
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
];
for (const page of commonPages) pageBundleRoutes[page] = 'js/bundles/page-common.js';

function canonicalScriptPath(value) {
  return String(value || '').split('?')[0].replace(/^\/+/, '');
}

function jsBundleForPage(file) {
  return pageBundleRoutes[file] || '';
}

function jsBundleScriptsForPage(file) {
  const bundle = jsBundleForPage(file);
  return bundle ? jsBundles[bundle] || [] : [];
}

function scriptTagForBundle(bundle) {
  return `<script src="${bundle}"></script>`;
}

function applyPageJsBundle(file, html) {
  const bundle = jsBundleForPage(file);
  if (!bundle) return html;

  const bundleScripts = new Set(jsBundleScriptsForPage(file).map(canonicalScriptPath));
  if (!bundleScripts.size) return html;

  const withoutBundledScripts = html.replace(/\n?\s*<script\s+src=["']([^"']+)["'][^>]*><\/script>/gi, (tag, src) => (
    bundleScripts.has(canonicalScriptPath(src)) ? '' : tag
  ));
  const bundleTag = scriptTagForBundle(bundle);
  if (withoutBundledScripts.includes(bundleTag)) return withoutBundledScripts;
  return withoutBundledScripts.replace(/\n?<\/body>/i, `\n    ${bundleTag}\n</body>`);
}

module.exports = {
  applyPageJsBundle,
  canonicalScriptPath,
  jsBundleForPage,
  jsBundleScriptsForPage,
  jsBundles
};
