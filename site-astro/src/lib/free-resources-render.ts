// Mirrors scripts/legacy-build/build/cards.js renderResourceCard.
// Icons resolve via /sprite.svg (inlined per page by scripts/inline-sprite.js)
// instead of inlining each SVG body, so adding/changing an icon doesn't
// rebuild every per-page CSS slice.

import { escapeAttr, escapeHtml } from './html-escape';
import { getIcon } from './icons';

function iconSvg(name: string): string { return getIcon(name); }

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
    ? `<a href="${escapeAttr(href)}" class="resource-link">${escapeHtml(resource.ctaLabel || 'Download')}${iconSvg('arrow')}</a>`
    : `<a href="contact.html?subject=${escapeAttr(encodeURIComponent(`Resource interest: ${resource.title}`))}" class="resource-link">${escapeHtml(resource.ctaLabel === 'Coming Soon' ? 'Tell me you want this' : (resource.ctaLabel || 'Tell me you want this'))}${iconSvg('arrow')}</a>`;

  return `<article class="resource-card" id="${escapeAttr(resource.slug || resource.id)}">
                <div class="resource-icon">${iconSvg(category?.icon || 'file')}</div>
                <p class="resource-category">${escapeHtml(category?.title || resource.category || resource.type || '')}</p>
                <h3 class="resource-title">${escapeHtml(resource.title)}</h3>
                <p class="resource-description">${escapeHtml(resource.shortDescription || resource.description || '')}</p>
                ${cta}
            </article>`;
}
