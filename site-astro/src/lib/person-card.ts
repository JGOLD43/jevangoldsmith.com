// Server-side renderer for people-grid cards. people.ts binds behavior to the
// SSR'd cards instead of creating duplicate runtime markup.

import type { Person as PersonRecord } from '../content.config';
import { cardFrame } from './card';
import { escapeAttr, escapeHtml } from './html-escape';
import { lcpAttrs } from './lcp-attrs';

type Person = Partial<PersonRecord> & { name: string; sourceType?: string | null };

// Slug-form normalization. Must match people.js
// normalizePersonName + scripts/merge-people.js so SSR'd
// data-person-id values line up with the runtime peopleById map.
function normalizePersonName(name: string): string {
  return String(name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sourceTypeFor(person: Person): string {
  return person.sourceType || (person.title?.toLowerCase().includes('fictional') ? 'fiction' : 'nonfiction');
}

const EAGER_ABOVE_FOLD = 6;

export function renderPersonCardHtml(person: Person, index = Number.MAX_SAFE_INTEGER): string {
  const name = person.name ?? '';
  const title = person.title ?? '';
  const lesson = person.lesson ?? '';
  const image = person.image ?? '';
  const srcset = person.srcset ?? '';
  const category = person.category ?? '';
  const searchText = person.searchText || `${name} ${title} ${lesson}`;
  const sourceType = sourceTypeFor(person);
  const personId = normalizePersonName(name);
  const sourceLabel = sourceType === 'fiction' ? 'Fiction' : 'Non-fiction';
  const lcp = lcpAttrs(index, EAGER_ABOVE_FOLD);
  const gridSrcset = srcset ? srcset.replace(/,?\s*[^,]+-800\.jpg 800w/g, '') : '';
  const avifSrcset = gridSrcset ? gridSrcset.replace(/\.jpg\b/g, '.avif') : '';
  const avifSource = avifSrcset
    ? `<source type="image/avif" srcset="${escapeAttr(avifSrcset)}" sizes="(max-width: 768px) 42vw, 220px">`
    : '';

  const body = `<div class="person-image-container"><picture>${avifSource}<img src="${escapeAttr(image)}" alt="${escapeAttr(name)}" class="person-image" srcset="${escapeAttr(gridSrcset)}" sizes="(max-width: 768px) 42vw, 220px" width="400" height="400" ${lcp} decoding="async"></picture></div><div class="person-info"><h3 class="person-name">${escapeHtml(name)}</h3><p class="person-source-type">${escapeHtml(sourceLabel)}</p><p class="person-title">${escapeHtml(title)}</p><p class="person-lesson">${escapeHtml(lesson)}</p></div>`;
  return cardFrame({
    tag: 'article',
    classes: ['person-card'],
    data: { category, 'person-id': personId, search: searchText, 'source-type': sourceType },
    role: 'button', tabindex: 0, body
  });
}
