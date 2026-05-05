// Phase B: build-time-rendered curated-podcast card.
// Mirrors buildCuratedPodcastCard() in js/podcasts.js so renderCuratedPodcasts
// adopts the SSR'd cards on first call instead of wiping them.
import { escapeAttr as escape } from './html-escape';

interface PodcastData {
  title?: string;
  host?: string | null;
  description?: string | null;
  category?: string | null;
  badge?: string | null;
  image?: string | null;
  searchText?: string | null;
}

// Phase 1.4: index-aware loading. The first card is the LCP candidate
// — give it loading="eager" + fetchpriority="high". Cards 6+ stay
// native loading="lazy" so they never block paint.
export function renderPodcastCardHtml(podcast: PodcastData, index = Number.MAX_SAFE_INTEGER): string {
  const title = String(podcast.title ?? '');
  const host = String(podcast.host ?? '');
  const desc = String(podcast.description ?? '');
  const category = podcast.category ? String(podcast.category) : 'all';
  const search = String(podcast.searchText ?? '');
  const image = String(podcast.image ?? '');
  const badge = podcast.badge ? String(podcast.badge) : '';
  const cardClass = `movie-card podcast-card js-zoom-item${badge ? ' has-review' : ''}`;
  const eager = index < 6;
  const loadingAttr = eager ? 'eager' : 'lazy';
  const priorityAttr = index === 0 ? ' fetchpriority="high"' : '';
  return [
    `<div class="${cardClass}" data-category="${escape(category)}" data-search="${escape(search)}">`,
    badge ? `<div class="times-read-badge movie-watch-badge">${escape(badge)}</div>` : '',
    `<div class="movie-poster-wrapper">`,
    `<img src="${escape(image)}" alt="${escape(host || title)}" class="podcast-cover" width="150" height="150" loading="${loadingAttr}" decoding="async"${priorityAttr}>`,
    `</div>`,
    `<div class="movie-info">`,
    `<div class="movie-title-row"><h3 class="movie-title">${escape(title)}</h3></div>`,
    `<div class="podcast-category-badge">${escape(host)}</div>`,
    `<p class="movie-description">${escape(desc)}</p>`,
    `</div></div>`
  ].join('');
}
