const DEFAULT_PAGE_META = {
  id: 'default',
  section: 'page',
  engine: 'content'
};

const PAGE_MANIFEST = [
  { id: 'home', route: 'index.html', section: 'home', engine: 'content' },
  { id: 'field-notes', route: 'field-notes.html', section: 'experience', engine: 'content' },
  { id: 'weekly-review-template', route: 'weekly-review-template.html', section: 'page', engine: 'content' },
  { id: 'topics', prefix: 'topics/', section: 'topics', engine: 'collection', engineView: 'topic' },
  { id: 'search', route: 'search.html', section: 'page', engine: 'content' },
  { id: 'meet', route: 'meet.html', section: 'page', engine: 'content' },
  { id: 'books', route: 'books.html', section: 'taste', engine: 'collection', engineView: 'books' },
  { id: 'movies', route: 'movies.html', section: 'taste', engine: 'collection', engineView: 'movies' },
  { id: 'people', route: 'people.html', section: 'taste', engine: 'collection', engineView: 'people' },
  { id: 'person-detail', prefix: 'people/', section: 'taste', engine: 'detail', engineView: 'person' },
  { id: 'podcasts', route: 'podcasts.html', section: 'taste', engine: 'collection', engineView: 'podcasts' },
  { id: 'reading-philosophy', route: 'reading-philosophy.html', section: 'taste', engine: 'content' },
  { id: 'dateme', route: 'dateme.html', section: 'explore', engine: 'content' },
  { id: 'essays', route: 'essays.html', section: 'experience', engine: 'collection', engineView: 'essays' },
  { id: 'products', route: 'products.html', section: 'taste', engine: 'collection', engineView: 'products' },
  { id: 'free-resources', route: 'free-resources.html', section: 'taste', engine: 'collection', engineView: 'resources' },
  { id: 'projects', route: 'projects.html', section: 'experience', engine: 'collection', engineView: 'projects' },
  { id: 'quotes', route: 'quotes.html', section: 'taste', engine: 'collection', engineView: 'quotes' },
  { id: 'adventures', route: 'adventures.html', section: 'adventures', engine: 'content' },
  { id: 'adventure-detail', prefix: 'adventure-', section: 'adventures', engine: 'detail', engineView: 'adventure' },
  { id: 'skill-detail', prefix: 'skill-', section: 'page', engine: 'detail', engineView: 'skill' },
  { id: 'about', route: 'about.html', section: 'explore', engine: 'content' },
  { id: 'challenges', route: 'challenges.html', section: 'experience', engine: 'collection', engineView: 'challenges' },
  { id: 'cool-shit', route: 'cool-shit.html', section: 'taste', engine: 'content' },
  { id: 'health', route: 'health.html', section: 'explore', engine: 'content' },
  { id: 'important-or-not', route: 'important-or-not.html', section: 'experience', engine: 'content' },
  { id: 'lesson-logger', route: 'lesson-logger.html', section: 'experience', engine: 'content' },
  { id: 'north-star', route: 'north-star.html', section: 'explore', engine: 'content' },
  { id: 'notes', route: 'notes.html', section: 'page', engine: 'content' },
  { id: 'videos', route: 'videos.html', section: 'page', engine: 'content' },
  { id: 'contact', route: 'contact.html', section: 'page', engine: 'content' },
  { id: 'changed-my-mind', route: 'changed-my-mind.html', section: 'experience', engine: 'content' },
  { id: 'movie-philosophy', route: 'movie-philosophy.html', section: 'page', engine: 'content' },
  { id: 'people-philosophy', route: 'people-philosophy.html', section: 'page', engine: 'content' },
  { id: 'problems', route: 'problems.html', section: 'page', engine: 'content' },
  { id: 'takes', route: 'takes.html', section: 'page', engine: 'content' },
  { id: 'living-manifesto', route: 'living-manifesto.html', section: 'explore', engine: 'content' },
  { id: 'speeches', route: 'speeches.html', section: 'explore', engine: 'content' }
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
    ? { section: entry.section, engine: entry.engine, engineView: entry.engineView || '' }
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
