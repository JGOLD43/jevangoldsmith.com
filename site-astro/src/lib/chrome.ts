// Build-time renderer for the legacy nav + footer partials.
//
// Mirrors scripts/legacy-build/build/chrome.js so the Astro output is
// byte-identical to the legacy output for the shared chrome. Reading the
// partials directly from /_src/partials means we never have to maintain a
// hand-ported copy in this repo.

// nav + footer source live as TS template-literal modules
// so we can drop the src/legacy/ folder and the Vite ?raw plugin step.
import { NAV_TEMPLATE as NAV_TEMPLATE_RAW } from './nav-template';
import { FOOTER_TEMPLATE as FOOTER_TEMPLATE_RAW } from './footer-template';
import pages from '../../../data/pages.json';
import ctas from '../../../data/ctas.json';
import quotes from '../../public/data/quotes.json';
import { escapeAttr as escapeHtmlAttr, escapeHtml } from './html-escape';

// Build-time wisdom ticker. The runtime fetch + shuffle in theme.ts has
// been hoisted here: pick 5 random quotes once per build, repeat the
// first to satisfy the seamless-loop CSS animation (6 positions).
function renderWisdomTickerHtml(): string {
  const list = (quotes as { tickerQuotes?: string[] }).tickerQuotes ?? [];
  if (list.length < 5) return '';
  const shuffled = [...list].sort(() => Math.random() - 0.5).slice(0, 5);
  shuffled.push(shuffled[0]);
  return shuffled.map((phrase) => `<a href="quotes.html" class="wisdom-item">${escapeHtml(phrase)}</a>`).join('');
}

const TICKER_TRACK_INNER = renderWisdomTickerHtml();
const NAV_TEMPLATE_BASE = NAV_TEMPLATE_RAW.trim();

// Replace the placeholder ticker block in the nav template once at module
// load with the build-time-shuffled set so renderNav doesn't redo work.
const NAV_TEMPLATE = TICKER_TRACK_INNER
  ? NAV_TEMPLATE_BASE.replace(
      /<div class="wisdom-ticker-track">[\s\S]*?<\/div>/,
      `<div class="wisdom-ticker-track">${TICKER_TRACK_INNER}</div>`
    )
  : NAV_TEMPLATE_BASE;
const FOOTER_TEMPLATE = FOOTER_TEMPLATE_RAW.trim();

const SECTION_BY_FILE = new Map<string, string>(
  ((pages as Array<{ path?: string; section?: string }>) ?? [])
    .filter((p) => p.path)
    .map((p) => [p.path!, p.section ?? ''])
);

const CTA_BY_HREF = new Map<string, { id: string; href: string }>(
  ((ctas as { ctas?: Array<{ id: string; href: string }> }).ctas ?? []).map((c) => [c.href, c])
);

// Maps a section ID from data/pages.json to the dropdown-trigger label in
// nav.html. Only sections whose label matches a literal nav trigger are
// listed; "experience" was removed because the nav uses "Ventures" and
// the matcher never fired.
const TRIGGER_BY_SECTION: Record<string, string> = {
  explore: 'Explore',
  taste: 'Taste'
};

function ctaLocationFor(file: string): string {
  return file.replace(/\.html$/, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}

function decorateTrackedLinks(file: string, html: string): string {
  const location = ctaLocationFor(file);
  return html.replace(/<a\b([^>]*?)href=(["'])([^"']+)\2([^>]*)>/gi, (match, before, quote, href, after) => {
    if (/data-analytics=/.test(match)) return match;
    const cta = CTA_BY_HREF.get(href);
    if (cta) {
      return `<a${before}href=${quote}${href}${quote}${after} data-analytics="cta" data-cta-id="${escapeHtmlAttr(cta.id)}" data-cta-location="${escapeHtmlAttr(location)}">`;
    }
    if (/^mailto:/i.test(href) || href.includes('contact.html') || href.includes('meet.html')) {
      return `<a${before}href=${quote}${href}${quote}${after} data-analytics="contact" data-cta-location="${escapeHtmlAttr(location)}">`;
    }
    return match;
  });
}

export function renderNav(file: string): string {
  // Step 1: clear any leftover active markers.
  const cleared = NAV_TEMPLATE
    .replace(/\sclass="active"/g, '')
    .replace(/\sclass="dropdown-trigger active"/g, ' class="dropdown-trigger"');

  // Step 2: mark the leaf nav-link active for this page (adventure-* roll up
  // to adventures.html). Searches the <ul class="nav-links"> block so the
  // active marker doesn't leak into a footer link with the same href.
  const activeHref = file.startsWith('adventure-') ? 'adventures.html' : file;
  const navLinksStart = cleared.indexOf('<ul class="nav-links">');
  const literalActiveTag = `<a href="${activeHref}">`;
  let next = cleared;
  if (navLinksStart >= 0) {
    const idx = cleared.indexOf(literalActiveTag, navLinksStart);
    if (idx >= 0) {
      next = cleared.slice(0, idx) + `<a href="${activeHref}" class="active">` + cleared.slice(idx + literalActiveTag.length);
    }
  }

  // Step 3: mark the section's dropdown-trigger active.
  const section = SECTION_BY_FILE.get(file) ?? '';
  const triggerLabel = TRIGGER_BY_SECTION[section];
  if (triggerLabel) {
    next = next.replace(
      `class="dropdown-trigger">${triggerLabel}</a>`,
      `class="dropdown-trigger active">${triggerLabel}</a>`
    );
  }

  // Step 4: decorate tracked links (data-analytics + data-cta-location).
  return decorateTrackedLinks(file, next);
}

export function renderFooter(file: string): string {
  return decorateTrackedLinks(file, FOOTER_TEMPLATE);
}

// Body-class map ported from dist-legacy-snap. Pages not in this map get
// no body class. Layouts derive this automatically when the page doesn't
// pass an explicit bodyClass prop.
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
