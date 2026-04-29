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

const cssLayerGroups = {
  core: [
    '00-tokens.css',
    '01-base.css',
    '02-fonts.css',
    '10-navigation.css',
    '11-footer.css',
    '18-seo-related.css',
    '39-responsive.css',
    '40-nav-extras.css',
    '42-dark-mode-overrides.css',
    '43-mobile-overrides.css'
  ],
  pageContent: ['12-page-content.css'],
  forms: ['13-modals-forms.css'],
  gridZoom: ['50-grid-zoom.css'],
  sideNav: ['09-side-nav.css'],
  search: ['20-search.css'],
  skillDetail: ['20-skill-detail.css'],
  collectionLayout: ['14-collection-layout.css'],
  collectionSidebar: ['15-collection-sidebar.css'],
  collectionHeader: ['16-collection-header.css'],
  collectionTasteCards: ['17-collection-taste-cards.css'],
  ratingModal: ['19-rating-modal.css'],
  changedMyMind: ['52-page-changed-my-mind.css'],
  home: ['30-home.css', '41-home-redesign.css'],
  archiveHome: ['47-archive-home.css', '48-field-notes.css'],
  fieldNotes: ['47-archive-home.css', '48-field-notes.css'],
  resourceDetail: ['47-archive-home.css', '50-resource-detail.css'],
  reading: ['31-reading.css'],
  essays: ['32-essays.css', '48-field-notes.css'],
  essaysCore: ['32-essays.css'],
  meet: ['33-meet.css'],
  books: ['34-books.css'],
  tasteSidebar: ['34-taste-sidebar.css'],
  movies: ['35-movies.css'],
  adventures: ['36-adventures.css'],
  dateme: ['37-dateme.css'],
  productsResources: ['38-products-resources.css', '49-shelf.css'],
  projects: ['44-projects.css'],
  quotes: ['45-quotes.css'],
  adventureDetail: ['52-adventure-detail.css'],
  about: ['52-page-about.css'],
  challenges: ['52-page-challenges.css'],
  coolShit: ['52-page-cool-shit.css'],
  health: ['52-page-health.css'],
  importantOrNot: ['52-page-important-or-not.css'],
  lessonLogger: ['52-page-lesson-logger.css'],
  northStar: ['52-page-north-star.css'],
  notes: ['52-page-notes.css'],
  videos: ['52-page-videos.css'],
  moviesExtras: ['52-page-movies-extras.css'],
  peopleExtras: ['52-page-people-extras.css'],
  podcastsExtras: ['52-page-podcasts-extras.css'],
  takes: ['51-takes.css']
};

const cssBundles = {
  'page-default.css': ['core'],
  'page-home.css': ['core', 'sideNav', 'forms', 'home'],
  'page-field-notes.css': ['core', 'forms', 'fieldNotes'],
  'page-resource-detail.css': ['core', 'resourceDetail'],
  'page-search.css': ['core', 'search'],
  'page-skill.css': ['core', 'skillDetail'],
  'page-reading.css': ['core', 'pageContent', 'reading'],
  'page-essays.css': ['core', 'pageContent', 'collectionLayout', 'collectionSidebar', 'collectionHeader', 'essays'],
  'page-meet.css': ['core', 'forms', 'meet'],
  'page-books.css': ['core', 'gridZoom', 'collectionLayout', 'collectionSidebar', 'collectionHeader', 'collectionTasteCards', 'tasteSidebar', 'books', 'ratingModal'],
  'page-movies.css': ['core', 'gridZoom', 'collectionLayout', 'collectionSidebar', 'collectionHeader', 'collectionTasteCards', 'tasteSidebar', 'movies', 'moviesExtras', 'ratingModal'],
  'page-people.css': ['core', 'gridZoom', 'collectionLayout', 'collectionSidebar', 'collectionHeader', 'peopleExtras'],
  'page-podcasts.css': ['core', 'gridZoom', 'collectionLayout', 'collectionSidebar', 'collectionHeader', 'collectionTasteCards', 'tasteSidebar', 'podcastsExtras'],
  'page-adventures.css': ['core', 'adventures'],
  'page-adventure-detail.css': ['core', 'adventures', 'adventureDetail'],
  'page-dateme.css': ['core', 'dateme'],
  'page-products-resources.css': ['core', 'gridZoom', 'productsResources'],
  'page-projects.css': ['core', 'gridZoom', 'essaysCore', 'tasteSidebar', 'challenges', 'projects'],
  'page-quotes.css': ['core', 'quotes'],
  'page-about.css': ['core', 'about'],
  'page-challenges.css': ['core', 'gridZoom', 'essaysCore', 'tasteSidebar', 'challenges'],
  'page-cool-shit.css': ['core', 'coolShit'],
  'page-health.css': ['core', 'health'],
  'page-important-or-not.css': ['core', 'importantOrNot'],
  'page-lesson-logger.css': ['core', 'lessonLogger'],
  'page-north-star.css': ['core', 'northStar'],
  'page-notes.css': ['core', 'notes'],
  'page-videos.css': ['core', 'pageContent', 'videos'],
  'page-contact.css': ['core', 'pageContent', 'forms'],
  'page-changed-my-mind.css': ['core', 'changedMyMind'],
  'page-philosophy.css': ['core', 'pageContent', 'reading'],
  'page-problems.css': ['core', 'essays', 'takes'],
  'page-takes.css': ['core', 'essays', 'takes']
};

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
  cssBundles,
  cssLayerGroups,
  manifestCoversRoute,
  pageEngineFor,
  pageManifestFor,
  pageMetaFor
};
