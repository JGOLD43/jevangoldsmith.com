// Mirrors scripts/legacy-build/build/cards.js renderResourceCard.

const ICON_SVGS: Record<string, string> = {
  book: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  calendar: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  dollar: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  question: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  brain: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a8 8 0 0 0-8 8c0 3.5 2 6 4 8l1 4h6l1-4c2-2 4-4.5 4-8a8 8 0 0 0-8-8z"/><line x1="12" y1="2" x2="12" y2="8"/><line x1="8" y1="8" x2="16" y2="8"/></svg>',
  star: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  edit: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>',
  clock: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  graduation: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
  flask: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3h6v6l3 9H6l3-9V3z"/><line x1="6" y1="21" x2="18" y2="21"/><circle cx="12" cy="15" r="1"/></svg>',
  arrow: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
  file: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>'
};

import { escapeAttr as escapeHTML, escapeAttr as escapeHtmlAttr } from './html-escape';
function iconSvg(name: string): string { return ICON_SVGS[name] ?? ICON_SVGS.file; }

interface Resource {
  id: string;
  slug?: string;
  title: string;
  category?: string;
  type?: string;
  shortDescription?: string;
  description?: string;
  ctaLabel?: string;
  downloadUrl?: string;
  checkoutUrl?: string;
}

interface ResourceCategory {
  id: string;
  title: string;
  icon?: string;
}

export function renderResourceCard(resource: Resource, categories: ResourceCategory[]): string {
  const category = categories.find((c) => c.id === resource.category);
  const href = resource.downloadUrl || resource.checkoutUrl || '';
  const cta = href
    ? `<a href="${escapeHtmlAttr(href)}" class="resource-link" data-analytics="resource" data-resource-id="${escapeHtmlAttr(resource.id)}" data-cta-location="resource-card">${escapeHTML(resource.ctaLabel || 'Download')}${iconSvg('arrow')}</a>`
    : `<a href="contact.html?subject=${escapeHtmlAttr(encodeURIComponent(`Resource interest: ${resource.title}`))}" class="resource-link" data-analytics="cta" data-cta-id="contact" data-cta-location="resource-card">${escapeHTML(resource.ctaLabel === 'Coming Soon' ? 'Tell me you want this' : (resource.ctaLabel || 'Tell me you want this'))}${iconSvg('arrow')}</a>`;

  return `<article class="resource-card" id="${escapeHtmlAttr(resource.slug || resource.id)}">
                <div class="resource-icon">${iconSvg(category?.icon || 'file')}</div>
                <p class="resource-category">${escapeHTML(category?.title || resource.category || resource.type || '')}</p>
                <h3 class="resource-title">${escapeHTML(resource.title)}</h3>
                <p class="resource-description">${escapeHTML(resource.shortDescription || resource.description || '')}</p>
                ${cta}
            </article>`;
}
