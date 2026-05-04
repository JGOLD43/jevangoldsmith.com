// Phase 1 slice 1.2: server-side renderer for movie cards. Mirrors
// `createMovieCardFromData` from src/scripts/letterboxd.js so SSR'd
// cards match runtime output. letterboxd.js detects an already-populated
// grid and skips its initial wipe-and-render.

import { escapeAttr as escapeHtml } from './html-escape';

interface Movie {
  title: string;
  date?: string | null;
  link?: string | null;
  rating?: string | null;
  starCount?: number | null;
  year?: string | number | null;
  poster?: string | null;
  genre?: string | null;
  timesWatched?: number | null;
  runtime?: number | null;
  review?: string | null;
  shortDescription?: string | null;
  tmdbId?: number | null;
  overview?: string | null;
}

const GENRE_ICONS: Record<string, string> = {
  Action: '💥', Adventure: '🗺️', Animation: '🎨', Comedy: '😂',
  Crime: '🔫', Documentary: '📹', Drama: '🎭', Fantasy: '🧙',
  Horror: '👻', Mystery: '🔍', Romance: '💕', 'Sci-Fi': '🚀',
  Thriller: '😱', Western: '🤠', Uncategorized: '🎬'
};

function formatRuntime(minutes: number): string {
  if (!minutes || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const r = minutes % 60;
  if (h === 0) return `${r} min`;
  if (r === 0) return `${h}h`;
  return `${h}h ${r}m`;
}

export function renderMovieCardHtml(movie: Movie): string {
  const title = movie.title ?? '';
  const date = movie.date ?? '';
  const link = movie.link ?? '';
  const rating = movie.rating ?? '';
  const starCount = movie.starCount ?? 0;
  const year = movie.year != null ? String(movie.year) : '';
  const poster = movie.poster ?? '';
  const genre = movie.genre ?? '';
  const timesWatched = Number(movie.timesWatched) || 1;
  const runtime = Number(movie.runtime) || 0;
  const review = movie.review ?? '';
  const shortDescription = movie.shortDescription ?? '';
  const hasReview = Boolean(review);

  const classes = ['movie-card', 'js-zoom-item'];
  if (hasReview) classes.push('has-review');

  const timesWatchedBadge = timesWatched > 1
    ? `<div class="times-read-badge movie-watch-badge">${timesWatched}x Watched</div>`
    : '';
  const genreIcon = (genre && GENRE_ICONS[genre]) || '🎬';
  const runtimeStr = runtime ? formatRuntime(runtime) : '';

  const detailHtml = hasReview
    ? `<div class="js-zoom-detail" aria-hidden="true">
            <p class="zoom-detail-kicker">${escapeHtml(genre || 'Film')}${year ? ' · ' + escapeHtml(year) : ''}</p>
            <p class="zoom-detail-title">${escapeHtml(title)}</p>
            ${rating ? `<p class="zoom-detail-lead">${escapeHtml(rating)}</p>` : ''}
            <p class="zoom-detail-line"><span>Review —</span> ${escapeHtml(review)}</p>
            ${date ? `<p class="zoom-detail-line"><span>Watched —</span> ${escapeHtml(date)}</p>` : ''}
            ${link && link !== '#' ? `<a class="zoom-detail-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">Letterboxd</a>` : ''}
        </div>`
    : '';

  const cursorStyle = hasReview ? ' style="cursor: pointer;"' : '';

  return `<div class="${classes.join(' ')}" data-movie-title="${escapeHtml(title)}" data-title="${escapeHtml(title)}" data-id="${escapeHtml(title)}"${cursorStyle}>
        ${timesWatchedBadge}
        <div class="movie-poster-wrapper">
            ${poster ? `<img src="${escapeHtml(poster)}" alt="${escapeHtml(title)}" class="movie-poster" loading="lazy" decoding="async">` : `<div class="movie-poster-placeholder">${escapeHtml(title)}</div>`}
        </div>
        <div class="movie-info">
            <div class="movie-title-row">
                <h3 class="movie-title">${escapeHtml(title)}</h3>
                ${year ? `<span class="movie-year">${escapeHtml(year)}</span>` : ''}
            </div>
            ${runtimeStr ? `<div class="movie-runtime">${escapeHtml(runtimeStr)}</div>` : ''}
            ${genre ? `<div class="movie-genre-badge">${genreIcon} ${escapeHtml(genre)}</div>` : ''}
            ${rating ? `<div class="movie-rating">${starCount ? `<span class="rating-number">${escapeHtml(String(starCount))}</span>` : ''}${escapeHtml(rating)}</div>` : ''}
            ${shortDescription ? `<p class="movie-description">${escapeHtml(shortDescription)}</p>` : ''}
            ${date ? `<p class="movie-date">Watched: ${escapeHtml(date)}</p>` : ''}
        </div>
        ${detailHtml}
    </div>`;
}
