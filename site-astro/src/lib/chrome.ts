// Build-time renderer for the legacy nav + footer partials.
//
// Mirrors scripts/legacy-build/build/chrome.js so the Astro output is
// byte-identical to the legacy output for the shared chrome. Reading the
// partials directly from /_src/partials means we never have to maintain a
// hand-ported copy in this repo.

// Vite ?raw imports inline the file contents at build time, so we don't
// need filesystem access from the bundled module.
import navTemplateRaw from '../../../_src/partials/nav.html?raw';
import footerTemplateRaw from '../../../_src/partials/footer.html?raw';
import pages from '../../../data/pages.json';
import ctas from '../../../data/ctas.json';

const NAV_TEMPLATE = navTemplateRaw.trim();
const FOOTER_TEMPLATE = footerTemplateRaw.trim();

interface PageMeta {
  path?: string;
  section?: string;
}

interface Cta {
  id: string;
  href: string;
}

const SECTION_BY_FILE = new Map<string, string>(
  (pages as PageMeta[]).filter((p) => p.path).map((p) => [p.path!, p.section ?? ''])
);

const CTA_BY_HREF = new Map<string, Cta>(
  ((ctas as { ctas?: Cta[] }).ctas ?? []).map((c) => [c.href, c])
);

const TRIGGER_BY_SECTION: Record<string, string> = {
  explore: 'Explore',
  taste: 'Taste',
  experience: 'Experience' // legacy quirk: nav uses "Ventures" so this won't match
};

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function ctaLocationFor(file: string): string {
  return file.replace(/\.html$/, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

export function sectionFor(file: string): string {
  return SECTION_BY_FILE.get(file) ?? '';
}

export function renderNav(file: string): string {
  // Step 1: clear any leftover active markers.
  const cleared = NAV_TEMPLATE
    .replace(/\sclass="active"/g, '')
    .replace(/\sclass="dropdown-trigger active"/g, ' class="dropdown-trigger"');

  // Step 2: mark the leaf nav-link active for this page (adventure-* roll up to adventures.html).
  const activeHref = file.startsWith('adventure-') ? 'adventures.html' : file;
  const navLinksStart = cleared.indexOf('<ul class="nav-links">');
  let next = cleared;
  if (navLinksStart >= 0) {
    const before = cleared.slice(0, navLinksStart);
    const navBlock = cleared
      .slice(navLinksStart)
      .replace(new RegExp(`<a href="${escapeRegExp(activeHref)}">`), `<a href="${activeHref}" class="active">`);
    next = before + navBlock;
  }

  // Step 3: mark the section's dropdown-trigger active (Explore / Taste only — see TRIGGER_BY_SECTION note).
  const section = sectionFor(file);
  const triggerLabel = TRIGGER_BY_SECTION[section];
  if (triggerLabel) {
    next = next.replace(
      `class="dropdown-trigger">${triggerLabel}</a>`,
      `class="dropdown-trigger active">${triggerLabel}</a>`
    );
  }

  // Step 4: decorate tracked links (data-analytics + data-cta-location).
  next = decorateTrackedLinks(file, next);

  return next;
}

export function renderFooter(file: string): string {
  return decorateTrackedLinks(file, FOOTER_TEMPLATE);
}

export function currentPageFromUrl(pathname: string): string {
  // Astro pathname examples: '/', '/about.html', '/people/foo.html', '/adventure-japan-adventure.html'
  const stripped = pathname.replace(/^\/+/, '');
  if (stripped === '' || stripped === 'index.html') return 'index.html';
  // Don't append .html if it's already there.
  return stripped.endsWith('.html') ? stripped : `${stripped}.html`;
}
