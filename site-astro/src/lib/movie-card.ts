// Server-side renderer for movie cards. letterboxd.ts binds behavior to these
// SSR'd cards and filters by toggling visibility.

import type { Movie as MovieRecord } from '../content.config';
import { cardFrame, topBadge } from './card';
import { formatRuntime } from './dates';
import { escapeAttr, escapeHtml } from './html-escape';


type Movie = Partial<MovieRecord>;

const GENRE_ICONS: Record<string, string> = {
  Action: '💥', Adventure: '🗺️', Animation: '🎨', Comedy: '😂',
  Crime: '🔫', Documentary: '📹', Drama: '🎭', Fantasy: '🧙',
  Horror: '👻', Mystery: '🔍', Romance: '💕', 'Sci-Fi': '🚀',
  Thriller: '😱', Western: '🤠', Uncategorized: '🎬'
};

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
  const genreIcon = (genre && GENRE_ICONS[genre]) || '🎬';
  const runtimeStr = runtime ? formatRuntime(runtime) : '';

  const reviewLine = review ? `<p class="zoom-detail-line"><span>Review —</span> ${escapeHtml(review)}</p>` : '';
  const detailHtml = `<div class="js-zoom-detail" aria-hidden="true">
            <p class="zoom-detail-kicker">${escapeHtml(genre || 'Film')}${year ? ' · ' + escapeHtml(year) : ''}</p>
            <p class="zoom-detail-title">${escapeHtml(title)}</p>
            ${rating ? `<p class="zoom-detail-lead">${escapeHtml(rating)}</p>` : ''}
            ${reviewLine}
            ${date ? `<p class="zoom-detail-line"><span>Watched —</span> ${escapeHtml(date)}</p>` : ''}
            ${link && link !== '#' ? `<a class="zoom-detail-link" href="${escapeAttr(link)}" target="_blank" rel="noopener noreferrer">Letterboxd</a>` : ''}
        </div>`;

  const body = `
        ${topBadge(timesWatched > 1 ? `${timesWatched}x Watched` : null, 'movie-watch-badge')}
        <div class="movie-poster-wrapper">
            ${poster ? `<img src="${escapeAttr(poster)}" alt="${escapeAttr(title)}" class="movie-poster" width="150" height="230" loading="lazy" decoding="async">` : `<div class="movie-poster-placeholder">${escapeHtml(title)}</div>`}
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
    `;

  const classes = ['movie-card', 'card-link'];
  if (hasReview) classes.push('has-review');
  // Card is a div + role="button" — shelf-style zoom in place. The
  // detail page remains reachable via Letterboxd link in zoom-detail
  // and direct URLs.
  return cardFrame({
    tag: 'div',
    classes,
    role: 'button',
    tabindex: 0,
    data: { 'movie-title': title },
    body
  });
}
