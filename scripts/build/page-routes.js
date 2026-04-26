function cssBundleForPage(file) {
  if (file === 'index.html') return 'css/page-home.css';
  if (file === 'field-notes.html') return 'css/page-field-notes.css';
  if (file === 'weekly-review-template.html') return 'css/page-resource-detail.css';
  if (file.startsWith('topics/')) return 'css/page-products-resources.css';
  if (file === 'search.html') return 'css/page-search.css';
  if (file === 'meet.html') return 'css/page-meet.css';
  if (file === 'books.html') return 'css/page-books.css';
  if (file === 'movies.html' || file === 'food.html') return 'css/page-movies.css';
  if (file === 'people.html') return 'css/page-people.css';
  if (file === 'podcasts.html') return 'css/page-podcasts.css';
  if (file === 'reading-philosophy.html') return 'css/page-reading.css';
  if (file === 'dateme.html') return 'css/page-dateme.css';
  if (file === 'essays.html') return 'css/page-essays.css';
  if (file === 'products.html' || file === 'free-resources.html') return 'css/page-products-resources.css';
  if (file === 'projects.html') return 'css/page-projects.css';
  if (file === 'quotes.html') return 'css/page-quotes.css';
  if (file === 'adventures.html') return 'css/page-adventures.css';
  if (file.startsWith('adventure-')) return 'css/page-adventure-detail.css';
  if (file.startsWith('skill-')) return 'css/page-skill.css';
  if (file === 'about.html') return 'css/page-about.css';
  if (file === 'challenges.html') return 'css/page-challenges.css';
  if (file === 'cool-shit.html') return 'css/page-cool-shit.css';
  if (file === 'health.html') return 'css/page-health.css';
  if (file === 'important-or-not.html') return 'css/page-important-or-not.css';
  if (file === 'lesson-logger.html') return 'css/page-lesson-logger.css';
  if (file === 'north-star.html') return 'css/page-north-star.css';
  if (file === 'notes.html') return 'css/page-notes.css';
  if (file === 'videos.html') return 'css/page-videos.css';
  if (file === 'contact.html') return 'css/page-contact.css';
  if (file === 'changed-my-mind.html') return 'css/page-changed-my-mind.css';
  if (file === 'movie-philosophy.html' || file === 'people-philosophy.html') return 'css/page-philosophy.css';
  if (file === 'problems.html') return 'css/page-problems.css';
  if (file === 'takes.html') return 'css/page-takes.css';
  return 'css/page-default.css';
}

function applyPageCssBundle(file, html) {
  const bundle = cssBundleForPage(file);
  return html.replace(/(["'])css\/style\.css(?:\?v=\d+)?\1/g, `$1${bundle}$1`);
}

module.exports = {
  applyPageCssBundle,
  cssBundleForPage
};
