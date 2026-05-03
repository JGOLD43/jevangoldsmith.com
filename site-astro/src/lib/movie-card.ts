// Phase B: build-time-rendered movie card HTML.
//
// Mirrors createMovieCardFromData() in js/letterboxd.js so a card pre-
// rendered here is byte-identical to one letterboxd.js produces at
// runtime. letterboxd.js detects an already-populated container on first
// display and skips the wipe-and-reappend step.

interface MovieData {
  title?: string;
  date?: string | null;
  link?: string | null;
  rating?: string | null;
  starCount?: number | null;
  year?: string | number | null;
  poster?: string | null;
  genre?: string | null;
  timesWatched?: number | null;
  runtime?: number | null;
  tmdbGenres?: string[] | null;
  overview?: string | null;
  review?: string | null;
  shortDescription?: string | null;
}

const GENRE_ICONS: Record<string, string> = {
  Action: '💥', Adventure: '🗺️', Animation: '🎨', Comedy: '😂',
  Crime: '🔫', Documentary: '📹', Drama: '🎭', Fantasy: '🧙',
  Horror: '👻', Mystery: '🔍', Romance: '💕', 'Sci-Fi': '🚀',
  Thriller: '😱', Western: '🤠', Uncategorized: '🎬'
};

function formatRuntime(minutes: number | null | undefined): string {
  const total = Number(minutes ?? 0);
  if (total <= 0) return '';
  const h = Math.floor(total / 60);
  const r = total % 60;
  if (h === 0) return `${r} min`;
  if (r === 0) return `${h}h`;
  return `${h}h ${r}m`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

export function renderMovieCardHtml(movie: MovieData): string {
  const title = String(movie.title ?? '');
  const review = String(movie.review ?? '').trim();
  const hasReview = review.length > 0;
  const cardClass = `movie-card js-zoom-item${hasReview ? ' has-review' : ''}`;
  const styleAttr = hasReview ? ' style="cursor: pointer"' : '';

  const timesWatched = Number(movie.timesWatched ?? 0);
  const timesWatchedBadge = timesWatched > 1
    ? `<div class="times-read-badge movie-watch-badge">${timesWatched}x Watched</div>`
    : '';

  const genreIcon = GENRE_ICONS[String(movie.genre ?? '')] || '🎬';
  const ratingNumber = movie.starCount ? String(movie.starCount) : '';
  const yearStr = movie.year != null && movie.year !== '' ? String(movie.year) : '';
  const dateStr = movie.date ? String(movie.date) : '';
  const ratingStr = movie.rating ? String(movie.rating) : '';
  const genreStr = movie.genre ? String(movie.genre) : '';
  const runtimeStr = formatRuntime(movie.runtime ?? null);
  const shortDesc = String(movie.shortDescription ?? '');
  const linkStr = movie.link && movie.link !== '#' ? String(movie.link) : '';

  const posterImg = movie.poster
    ? `<img src="${escapeAttr(String(movie.poster))}" alt="${escapeAttr(title)}" class="movie-poster" loading="lazy" decoding="async">`
    : `<div class="movie-poster-placeholder">${escapeHtml(title)}</div>`;

  const detailHtml = hasReview ? [
    `<div class="js-zoom-detail" aria-hidden="true">`,
    `<p class="zoom-detail-kicker">${escapeHtml(genreStr || 'Film')}${yearStr ? ` · ${escapeHtml(yearStr)}` : ''}</p>`,
    `<p class="zoom-detail-title">${escapeHtml(title)}</p>`,
    ratingStr ? `<p class="zoom-detail-lead">${escapeHtml(ratingStr)}</p>` : '',
    `<p class="zoom-detail-line"><span>Review —</span> ${escapeHtml(review)}</p>`,
    dateStr ? `<p class="zoom-detail-line"><span>Watched —</span> ${escapeHtml(dateStr)}</p>` : '',
    linkStr ? `<a class="zoom-detail-link" href="${escapeAttr(linkStr)}" target="_blank" rel="noopener noreferrer">Letterboxd</a>` : '',
    `</div>`
  ].join('') : '';

  return [
    `<div class="${cardClass}" data-movie-title="${escapeAttr(title)}" data-title="${escapeAttr(title)}" data-id="${escapeAttr(title)}"${styleAttr}>`,
    timesWatchedBadge,
    `<div class="movie-poster-wrapper">${posterImg}</div>`,
    `<div class="movie-info">`,
    `<div class="movie-title-row"><h3 class="movie-title">${escapeHtml(title)}</h3>${yearStr ? `<span class="movie-year">${escapeHtml(yearStr)}</span>` : ''}</div>`,
    runtimeStr ? `<div class="movie-runtime">${escapeHtml(runtimeStr)}</div>` : '',
    genreStr ? `<div class="movie-genre-badge">${genreIcon} ${escapeHtml(genreStr)}</div>` : '',
    ratingStr ? `<div class="movie-rating">${ratingNumber ? `<span class="rating-number">${escapeHtml(ratingNumber)}</span>` : ''}${escapeHtml(ratingStr)}</div>` : '',
    shortDesc ? `<p class="movie-description">${escapeHtml(shortDesc)}</p>` : '',
    dateStr ? `<p class="movie-date">Watched: ${escapeHtml(dateStr)}</p>` : '',
    `</div>`,
    detailHtml,
    `</div>`
  ].join('');
}
