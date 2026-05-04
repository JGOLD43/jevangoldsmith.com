// Phase 6 (slice 2): server-side renderer for the people-grid card. Mirrors
// the runtime createPersonCard from src/scripts/people.js byte-for-byte so
// pre-rendered cards match the runtime output. people.js detects an already-
// populated grid and skips its initial wipe-and-render.

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

function normalizePersonName(name: string): string {
  return String(name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function sourceTypeFor(person: Person): string {
  return person.sourceType || (person.title?.toLowerCase().includes('fictional') ? 'fiction' : 'nonfiction');
}

export function renderPersonCardHtml(person: Person): string {
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

  return `<article class="person-card" data-category="${escapeHtml(category)}" data-person-id="${escapeHtml(personId)}" data-search="${escapeHtml(searchText)}" data-source-type="${escapeHtml(sourceType)}" role="button" tabindex="0">
        <div class="person-image-container">
            <img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" class="person-image" srcset="${escapeHtml(srcset)}" sizes="(max-width: 768px) 42vw, 220px" width="400" height="400" loading="lazy" decoding="async">
        </div>
        <div class="person-info">
            <h3 class="person-name">${escapeHtml(name)}</h3>
            <p class="person-source-type">${escapeHtml(sourceLabel)}</p>
            <p class="person-title">${escapeHtml(title)}</p>
            <p class="person-lesson">${escapeHtml(lesson)}</p>
        </div>
    </article>`;
}
