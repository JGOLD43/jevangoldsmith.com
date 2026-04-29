const DEFAULT_PAGE_META = {
  id: 'default',
  cssBundle: 'css/page-default.css',
  section: 'page',
  engine: 'content'
};

const PAGE_MANIFEST = [
  { id: 'home', route: 'index.html', cssBundle: 'css/page-home.css', section: 'home', engine: 'content' },
  { id: 'field-notes', route: 'field-notes.html', cssBundle: 'css/page-field-notes.css', section: 'experience', engine: 'content' },
  { id: 'weekly-review-template', route: 'weekly-review-template.html', cssBundle: 'css/page-resource-detail.css', section: 'page', engine: 'content' },
  { id: 'topics', prefix: 'topics/', cssBundle: 'css/page-products-resources.css', section: 'topics', engine: 'collection', engineView: 'topic' },
  { id: 'search', route: 'search.html', cssBundle: 'css/page-search.css', section: 'page', engine: 'content' },
  { id: 'meet', route: 'meet.html', cssBundle: 'css/page-meet.css', section: 'page', engine: 'content' },
  { id: 'books', route: 'books.html', cssBundle: 'css/page-books.css', section: 'taste', engine: 'collection', engineView: 'books' },
  { id: 'movies', route: 'movies.html', cssBundle: 'css/page-movies.css', section: 'taste', engine: 'collection', engineView: 'movies' },
  { id: 'people', route: 'people.html', cssBundle: 'css/page-people.css', section: 'taste', engine: 'collection', engineView: 'people' },
  { id: 'podcasts', route: 'podcasts.html', cssBundle: 'css/page-podcasts.css', section: 'taste', engine: 'collection', engineView: 'podcasts' },
  { id: 'reading-philosophy', route: 'reading-philosophy.html', cssBundle: 'css/page-reading.css', section: 'taste', engine: 'content' },
  { id: 'dateme', route: 'dateme.html', cssBundle: 'css/page-dateme.css', section: 'explore', engine: 'content' },
  { id: 'essays', route: 'essays.html', cssBundle: 'css/page-essays.css', section: 'experience', engine: 'collection', engineView: 'essays' },
  { id: 'products', route: 'products.html', cssBundle: 'css/page-products-resources.css', section: 'taste', engine: 'collection', engineView: 'products' },
  { id: 'free-resources', route: 'free-resources.html', cssBundle: 'css/page-products-resources.css', section: 'taste', engine: 'collection', engineView: 'resources' },
  { id: 'projects', route: 'projects.html', cssBundle: 'css/page-projects.css', section: 'experience', engine: 'collection', engineView: 'projects' },
  { id: 'quotes', route: 'quotes.html', cssBundle: 'css/page-quotes.css', section: 'taste', engine: 'collection', engineView: 'quotes' },
  { id: 'adventures', route: 'adventures.html', cssBundle: 'css/page-adventures.css', section: 'adventures', engine: 'content' },
  { id: 'adventure-detail', prefix: 'adventure-', cssBundle: 'css/page-adventure-detail.css', section: 'adventures', engine: 'detail', engineView: 'adventure' },
  { id: 'skill-detail', prefix: 'skill-', cssBundle: 'css/page-skill.css', section: 'page', engine: 'detail', engineView: 'skill' },
  { id: 'about', route: 'about.html', cssBundle: 'css/page-about.css', section: 'explore', engine: 'content' },
  { id: 'challenges', route: 'challenges.html', cssBundle: 'css/page-challenges.css', section: 'experience', engine: 'collection', engineView: 'challenges' },
  { id: 'cool-shit', route: 'cool-shit.html', cssBundle: 'css/page-cool-shit.css', section: 'taste', engine: 'content' },
  { id: 'health', route: 'health.html', cssBundle: 'css/page-health.css', section: 'explore', engine: 'content' },
  { id: 'important-or-not', route: 'important-or-not.html', cssBundle: 'css/page-important-or-not.css', section: 'experience', engine: 'content' },
  { id: 'lesson-logger', route: 'lesson-logger.html', cssBundle: 'css/page-lesson-logger.css', section: 'experience', engine: 'content' },
  { id: 'north-star', route: 'north-star.html', cssBundle: 'css/page-north-star.css', section: 'explore', engine: 'content' },
  { id: 'notes', route: 'notes.html', cssBundle: 'css/page-notes.css', section: 'page', engine: 'content' },
  { id: 'videos', route: 'videos.html', cssBundle: 'css/page-videos.css', section: 'page', engine: 'content' },
  { id: 'contact', route: 'contact.html', cssBundle: 'css/page-contact.css', section: 'page', engine: 'content' },
  { id: 'changed-my-mind', route: 'changed-my-mind.html', cssBundle: 'css/page-changed-my-mind.css', section: 'experience', engine: 'content' },
  { id: 'movie-philosophy', route: 'movie-philosophy.html', cssBundle: 'css/page-philosophy.css', section: 'page', engine: 'content' },
  { id: 'people-philosophy', route: 'people-philosophy.html', cssBundle: 'css/page-philosophy.css', section: 'page', engine: 'content' },
  { id: 'problems', route: 'problems.html', cssBundle: 'css/page-problems.css', section: 'page', engine: 'content' },
  { id: 'takes', route: 'takes.html', cssBundle: 'css/page-takes.css', section: 'page', engine: 'content' },
  { id: 'living-manifesto', route: 'living-manifesto.html', cssBundle: 'css/page-reading.css', section: 'explore', engine: 'content' },
  { id: 'speeches', route: 'speeches.html', cssBundle: 'css/page-reading.css', section: 'explore', engine: 'content' }
];

function matchesRoute(entry, file) {
  if (entry.route) return file === entry.route;
  if (entry.prefix) return file.startsWith(entry.prefix);
  if (entry.oneOf) return entry.oneOf.includes(file);
  return false;
}

function pageManifestFor(file) {
  return PAGE_MANIFEST.find((entry) => matchesRoute(entry, file)) || null;
}

function pageMetaFor(file) {
  const entry = pageManifestFor(file);
  return entry
    ? { cssBundle: entry.cssBundle, section: entry.section, engine: entry.engine, engineView: entry.engineView || '' }
    : DEFAULT_PAGE_META;
}

function manifestCoversRoute(file) {
  return Boolean(pageManifestFor(file));
}

function pageEngineFor(file) {
  return pageMetaFor(file).engine || DEFAULT_PAGE_META.engine;
}

module.exports = {
  DEFAULT_PAGE_META,
  PAGE_MANIFEST,
  manifestCoversRoute,
  pageEngineFor,
  pageManifestFor,
  pageMetaFor
};
