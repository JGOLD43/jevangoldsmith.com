// Chrome helpers shared by Base.astro and the Nav/Footer components.
// Phase 12 inlined the nav + footer markup into native Astro components,
// so the regex-based active-marker dance and the wisdom-ticker shuffle
// that lived here moved into Nav.astro. Only the body-class map and the
// pathname-to-file helper still need a shared home.

// Body-class map. Pages not in this map get no body class. Layouts derive
// this automatically when the page doesn't pass an explicit bodyClass prop.
const BODY_CLASS_BY_FILE: Record<string, string> = {
  'adventures.html': 'nav-compact',
  'books.html': 'nav-compact',
  'challenges.html': 'nav-compact',
  'changed-my-mind.html': 'changed-mind-page',
  'cool-shit.html': 'nav-compact',
  'essays.html': 'nav-compact',
  'field-notes.html': 'field-notes-page',
  'health.html': 'nav-compact',
  'meet.html': 'meet-page',
  'movies.html': 'nav-compact',
  'people.html': 'nav-compact',
  'podcasts.html': 'nav-compact',
  'problems.html': 'problems-page',
  'products.html': 'shelf-experience nav-compact',
  'projects.html': 'nav-compact',
  'reading-philosophy.html': 'nav-compact',
  'takes.html': 'takes-page',
  'weekly-review-template.html': 'resource-detail-page'
};

export function bodyClassFor(file: string): string {
  if (file.startsWith('adventure-')) return 'nav-compact';
  return BODY_CLASS_BY_FILE[file] ?? '';
}

export function currentPageFromUrl(pathname: string): string {
  // Astro pathname examples: '/', '/about.html', '/people/foo.html', '/adventure-japan-adventure.html'
  const stripped = pathname.replace(/^\/+/, '');
  if (stripped === '' || stripped === 'index.html') return 'index.html';
  return stripped.endsWith('.html') ? stripped : `${stripped}.html`;
}
