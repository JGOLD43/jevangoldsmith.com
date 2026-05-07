// Server-side renderer for people-grid cards. people.ts binds behavior to the
// SSR'd cards instead of creating duplicate runtime markup.

import type { Person as PersonRecord } from '../content.config';
import { escapeAttr, escapeHtml } from './html-escape';
import { lcpAttrs } from './lcp-attrs';

// Card renderer needs `name` always (used as text + alt) but everything else
// optional. PeopleProfile augments PersonRecord with sourceType — Pick what we
// actually read instead of dragging the full schema.
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

// index-aware loading. Mobile (360px) fits ~4–6 person cards above the
// fold; desktop fits 6–8. Cards beyond that paint via the lazy-loading
// IntersectionObserver and don't compete for connection bandwidth on
// first paint. Was 16; dropped to 6 to stop crowding the LCP candidate.
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

  // Source-native <picture> with avif source — eliminates the post-build
  // wrap that scripts/normalize-astro-html.js used to perform on every card.
  // Grid sizes="220px" desktop / 42vw mobile (= ~150px on a 360px phone).
  // At any normal DPR the browser picks 200w or 400w; 800w only fires at
  // DPR ≥ 4 (real-world hit rate < 1%). Drop -800 from the grid srcset so
  // we don't ship 100B per card × 98 cards on people.html. Detail page
  // hero generates its own srcset with 800w (sizes=360px there).
  const gridSrcset = srcset ? srcset.replace(/,?\s*[^,]+-800\.jpg 800w/g, '') : '';
  const avifSrcset = gridSrcset ? gridSrcset.replace(/\.jpg\b/g, '.avif') : '';
  const avifSource = avifSrcset
    ? `<source type="image/avif" srcset="${escapeAttr(avifSrcset)}" sizes="(max-width: 768px) 42vw, 220px">`
    : '';

  return `<article class="person-card" data-category="${escapeAttr(category)}" data-person-id="${escapeAttr(personId)}" data-search="${escapeAttr(searchText)}" data-source-type="${escapeAttr(sourceType)}" role="button" tabindex="0">
        <div class="person-image-container">
            <picture>${avifSource}<img src="${escapeAttr(image)}" alt="${escapeAttr(name)}" class="person-image" srcset="${escapeAttr(gridSrcset)}" sizes="(max-width: 768px) 42vw, 220px" width="400" height="400" ${lcp} decoding="async"></picture>
        </div>
        <div class="person-info">
            <h3 class="person-name">${escapeHtml(name)}</h3>
            <p class="person-source-type">${escapeHtml(sourceLabel)}</p>
            <p class="person-title">${escapeHtml(title)}</p>
            <p class="person-lesson">${escapeHtml(lesson)}</p>
        </div>
    </article>`;
}
