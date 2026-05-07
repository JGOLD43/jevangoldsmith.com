// Server-side renderer for people-grid cards. people.ts binds behavior to the
// SSR'd cards instead of creating duplicate runtime markup.

import { escapeAttr as escapeHtml } from './html-escape';

interface Person {
  id?: string;
  name: string;
  title?: string | null;
  lesson?: string | null;
  category?: string | null;
  image?: string | null;
  srcset?: string | null;
  searchText?: string | null;
  sourceType?: string | null;
}

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
  const eager = index < EAGER_ABOVE_FOLD;
  const loadingAttr = eager ? 'eager' : 'lazy';
  const priorityAttr = eager ? ' fetchpriority="high"' : '';

  // Source-native <picture> with avif source — eliminates the post-build
  // wrap that scripts/normalize-astro-html.js used to perform on every card.
  const avifSrcset = srcset ? srcset.replace(/\.jpg\b/g, '.avif') : '';
  const avifSource = avifSrcset
    ? `<source type="image/avif" srcset="${escapeHtml(avifSrcset)}" sizes="(max-width: 768px) 42vw, 220px">`
    : '';

  return `<article class="person-card" data-category="${escapeHtml(category)}" data-person-id="${escapeHtml(personId)}" data-search="${escapeHtml(searchText)}" data-source-type="${escapeHtml(sourceType)}" role="button" tabindex="0">
        <div class="person-image-container">
            <picture>${avifSource}<img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" class="person-image" srcset="${escapeHtml(srcset)}" sizes="(max-width: 768px) 42vw, 220px" width="400" height="400" loading="${loadingAttr}" decoding="async"${priorityAttr}></picture>
        </div>
        <div class="person-info">
            <h3 class="person-name">${escapeHtml(name)}</h3>
            <p class="person-source-type">${escapeHtml(sourceLabel)}</p>
            <p class="person-title">${escapeHtml(title)}</p>
            <p class="person-lesson">${escapeHtml(lesson)}</p>
        </div>
    </article>`;
}
