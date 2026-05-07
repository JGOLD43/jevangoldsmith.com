// Server-side renderer for curated podcast cards. podcasts page binds
// behavior to these SSR'd cards.
import { escapeAttr } from './html-escape';
import { lcpAttrs } from './lcp-attrs';

interface PodcastData {
  title?: string;
  host?: string | null;
  description?: string | null;
  category?: string | null;
  badge?: string | null;
  image?: string | null;
  searchText?: string | null;
}

// First 6 cards above-fold get loading="eager"; cards beyond stay lazy.
export function renderPodcastCardHtml(podcast: PodcastData, index = Number.MAX_SAFE_INTEGER): string {
  const title = String(podcast.title ?? '');
  const host = String(podcast.host ?? '');
  const desc = String(podcast.description ?? '');
  const category = podcast.category ? String(podcast.category) : 'all';
  const search = String(podcast.searchText ?? '');
  const image = String(podcast.image ?? '');
  const badge = podcast.badge ? String(podcast.badge) : '';
  const cardClass = `movie-card podcast-card js-zoom-item${badge ? ' has-review' : ''}`;
  return [
    `<div class="${cardClass}" data-category="${escapeAttr(category)}" data-search="${escapeAttr(search)}">`,
    badge ? `<div class="times-read-badge movie-watch-badge">${escapeAttr(badge)}</div>` : '',
    `<div class="movie-poster-wrapper">`,
    `<img src="${escapeAttr(image)}" alt="${escapeAttr(host || title)}" class="podcast-cover" width="150" height="150" ${lcpAttrs(index, 6)} decoding="async">`,
    `</div>`,
    `<div class="movie-info">`,
    `<div class="movie-title-row"><h3 class="movie-title">${escapeAttr(title)}</h3></div>`,
    `<div class="podcast-category-badge">${escapeAttr(host)}</div>`,
    `<p class="movie-description">${escapeAttr(desc)}</p>`,
    `</div></div>`
  ].join('');
}
