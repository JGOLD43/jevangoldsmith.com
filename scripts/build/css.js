const fs = require('fs');
const path = require('path');

const cssLayerGroups = {
  core: [
    '00-tokens.css',
    '01-base.css',
    '02-fonts.css',
    '10-navigation.css',
    '11-footer.css',
    '12-page-content.css',
    '13-modals-forms.css',
    '39-responsive.css',
    '40-nav-extras.css',
    '42-dark-mode-overrides.css',
    '43-mobile-overrides.css',
    '50-grid-zoom.css',
    'legacy.css'
  ],
  search: ['20-search.css'],
  skillDetail: ['20-skill-detail.css'],
  home: ['30-home.css', '41-home-redesign.css'],
  archiveHome: ['47-archive-home.css', '48-field-notes.css'],
  fieldNotes: ['47-archive-home.css', '48-field-notes.css'],
  resourceDetail: ['47-archive-home.css', '50-resource-detail.css'],
  reading: ['31-reading.css'],
  essays: ['32-essays.css', '48-field-notes.css'],
  essaysCore: ['32-essays.css'],
  meet: ['33-meet.css'],
  books: ['34-books.css', '34-taste-sidebar.css'],
  movies: ['35-movies.css', '35-food.css', '34-taste-sidebar.css'],
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
  takes: ['51-takes.css'],
  tasteSidebar: ['34-taste-sidebar.css']
};

const cssBundles = {
  // page-default is the safety-net bundle for pages without an explicit route.
  // Keep it minimal (core only) — every real page should have a dedicated entry
  // below. If a page falls back to default and renders unstyled, add it here.
  'page-default.css': ['core'],
  'page-home.css': ['core', 'home'],
  'page-field-notes.css': ['core', 'fieldNotes'],
  'page-resource-detail.css': ['core', 'resourceDetail'],
  'page-search.css': ['core', 'search'],
  'page-skill.css': ['core', 'skillDetail'],
  'page-reading.css': ['core', 'reading'],
  'page-essays.css': ['core', 'essays'],
  'page-meet.css': ['core', 'meet'],
  'page-books.css': ['core', 'books'],
  'page-movies.css': ['core', 'movies', 'moviesExtras'],
  'page-people.css': ['core', 'movies', 'peopleExtras'],
  'page-podcasts.css': ['core', 'movies', 'podcastsExtras'],
  'page-adventures.css': ['core', 'adventures'],
  'page-adventure-detail.css': ['core', 'adventures', 'adventureDetail'],
  'page-dateme.css': ['core', 'dateme'],
  'page-products-resources.css': ['core', 'productsResources'],
  'page-projects.css': ['core', 'essaysCore', 'tasteSidebar', 'challenges', 'projects'],
  'page-quotes.css': ['core', 'quotes'],
  'page-about.css': ['core', 'about'],
  'page-challenges.css': ['core', 'essaysCore', 'tasteSidebar', 'challenges'],
  'page-cool-shit.css': ['core', 'coolShit'],
  'page-health.css': ['core', 'health'],
  'page-important-or-not.css': ['core', 'importantOrNot'],
  'page-lesson-logger.css': ['core', 'lessonLogger'],
  'page-north-star.css': ['core', 'northStar'],
  'page-notes.css': ['core', 'notes'],
  'page-videos.css': ['core', 'videos'],
  'page-contact.css': ['core'],
  'page-changed-my-mind.css': ['core'],
  'page-philosophy.css': ['core', 'reading'],
  'page-problems.css': ['core', 'essays', 'takes'],
  'page-takes.css': ['core', 'essays', 'takes']
};

function renderCssLayer(root, file) {
  const fullPath = path.join('css', 'src', file);
  return `/* ${fullPath} */\n${fs.readFileSync(path.join(root, fullPath), 'utf8').trim()}\n`;
}

function buildCss({ root, writeGenerated }) {
  const files = fs.readdirSync(path.join(root, 'css', 'src'))
    .filter((file) => file.endsWith('.css'))
    .sort();
  const css = files.map((file) => renderCssLayer(root, file)).join('\n');
  writeGenerated(path.join('css', 'style.css'), `${css}\n`);

  const cssBundleFiles = [];
  for (const [bundleFile, groups] of Object.entries(cssBundles)) {
    const bundleLayers = [];
    const seen = new Set();
    for (const layer of groups.flatMap((group) => cssLayerGroups[group] || [])) {
      if (seen.has(layer)) continue;
      seen.add(layer);
      bundleLayers.push(layer);
    }
    const bundleCss = bundleLayers.map((file) => renderCssLayer(root, file)).join('\n');
    const target = path.join('css', bundleFile);
    writeGenerated(target, `${bundleCss}\n`);
    cssBundleFiles.push(target);
  }

  return cssBundleFiles;
}

module.exports = {
  buildCss,
  cssBundles,
  cssLayerGroups
};
