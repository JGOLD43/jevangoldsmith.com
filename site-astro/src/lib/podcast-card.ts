// Server-side renderer for curated podcast cards. podcasts page binds
// behavior to these SSR'd cards.
import { cardFrame, topBadge } from './card';
import { escapeAttr } from './html-escape';
import { lcpAttrs } from './lcp-attrs';
import { slugify } from './slug';

interface PodcastData {
  id?: string;
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
  const slug = String(podcast.id || slugify(title));
  const href = slug ? `/podcasts/${slug}.html` : '#';
  const body = `${topBadge(badge || null, 'movie-watch-badge')}<div class="movie-poster-wrapper"><img src="${escapeAttr(image)}" alt="${escapeAttr(host || title)}" class="podcast-cover" width="150" height="150" ${lcpAttrs(index, 6)} decoding="async"></div><div class="movie-info"><div class="movie-title-row"><h3 class="movie-title">${escapeAttr(title)}</h3></div><div class="podcast-category-badge">${escapeAttr(host)}</div><p class="movie-description">${escapeAttr(desc)}</p></div>`;
  const classes = ['movie-card', 'podcast-card', 'card-link'];
  if (badge) classes.push('has-review');
  return cardFrame({ tag: 'a', href, classes, data: { category, search }, body });
}
