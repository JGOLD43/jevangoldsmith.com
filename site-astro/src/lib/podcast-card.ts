// Phase B: build-time-rendered curated-podcast card.
// Mirrors buildCuratedPodcastCard() in js/podcasts.js so renderCuratedPodcasts
// adopts the SSR'd cards on first call instead of wiping them.

interface PodcastData {
  title?: string;
  host?: string | null;
  description?: string | null;
  category?: string | null;
  badge?: string | null;
  image?: string | null;
  searchText?: string | null;
}

function escape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderPodcastCardHtml(podcast: PodcastData): string {
  const title = String(podcast.title ?? '');
  const host = String(podcast.host ?? '');
  const desc = String(podcast.description ?? '');
  const category = podcast.category ? String(podcast.category) : 'all';
  const search = String(podcast.searchText ?? '');
  const image = String(podcast.image ?? '');
  const badge = podcast.badge ? String(podcast.badge) : '';
  const cardClass = `movie-card podcast-card js-zoom-item${badge ? ' has-review' : ''}`;
  return [
    `<div class="${cardClass}" data-category="${escape(category)}" data-search="${escape(search)}">`,
    badge ? `<div class="times-read-badge movie-watch-badge">${escape(badge)}</div>` : '',
    `<div class="movie-poster-wrapper">`,
    `<img src="${escape(image)}" alt="${escape(host || title)}" class="podcast-cover" width="150" height="150" loading="lazy" decoding="async">`,
    `</div>`,
    `<div class="movie-info">`,
    `<div class="movie-title-row"><h3 class="movie-title">${escape(title)}</h3></div>`,
    `<div class="podcast-category-badge">${escape(host)}</div>`,
    `<p class="movie-description">${escape(desc)}</p>`,
    `</div></div>`
  ].join('');
}
