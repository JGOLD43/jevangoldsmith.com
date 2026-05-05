// build-time-rendered book card HTML.
//
// Mirrors the createBookCard() string in js/books.js so a card pre-rendered
// here is byte-identical to one books.js would produce at runtime. That
// lets us SSR all 122 cards into the static HTML — the page paints with
// content immediately, and books.js still binds its zoom + modal handlers
// to the same DOM shape.
//
// books.js no longer needs to render the initial card list; on load it
// detects an already-populated container and skips the wipe-and-reappend
// step (see js/books.js → renderBooks).

interface BookData {
  title?: string;
  author?: string;
  isbn?: string | null;
  year?: string | number | null;
  rating?: number | null;
  reReads?: number | null;
  category?: string | null;
  shortDescription?: string | null;
  review?: string | null;
  read?: boolean | null;
  coverImage?: string | null;
}

import { escapeHtml, escapeAttr } from './html-escape';
import remoteAssets from '../../../data/remote-assets.generated.json';

type RemoteEntry = { source: string; widths: number[]; formats: Record<string, { avif?: string; jpg?: string }> };
const REMOTE = remoteAssets as Record<string, RemoteEntry>;

// Localize an OpenLibrary cover URL to the locally-generated jpg
// (build-time download from optimize-assets.js → images/generated/remote/).
// Fall back to the remote URL when the manifest doesn't have it (first
// build before optimize-assets has run, or a non-OpenLibrary cover).
function localize(url: string): string {
  if (!url) return '';
  const lookupKey = url.replace(/-M\.jpg(\?.*)?$/, '-L.jpg');
  const entry = REMOTE[lookupKey] || REMOTE[url];
  if (!entry) return url;
  // 360 is the visible width for a card cover (~150px display, 2x DPR).
  const jpg = entry.formats['360']?.jpg || entry.formats['480']?.jpg;
  return jpg ? `/${jpg}` : url;
}

export function bookCoverUrl(book: BookData): string {
  if (book.coverImage) return localize(book.coverImage);
  const cleanIsbn = String(book.isbn ?? '').replace(/[^0-9X]/g, '');
  if (!cleanIsbn) return '';
  return localize(`https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`);
}

// `eager` flips the cover from lazy/auto to eager/high — used for the
// first row of cards that sit above the fold so the LCP candidate paints
// without waiting for the lazy-loading observer.
export function renderBookCardHtml(book: BookData, eager = false): string {
  const title = String(book.title ?? '');
  const author = String(book.author ?? '');
  const yearStr = book.year != null && book.year !== '' ? String(book.year) : '';
  const isbn = String(book.isbn ?? '');
  const review = String(book.review ?? '').trim();
  const shortDescription = String(book.shortDescription ?? '');
  const category = String(book.category ?? '');
  const ratingValue = Number(book.rating ?? 0);
  const reReads = Number(book.reReads ?? 0);
  const isUnread = book.read === false;
  const hasRating = !isUnread && ratingValue > 0;
  const timesRead = reReads + 1;

  const stars = hasRating
    ? '★'.repeat(ratingValue) + '☆'.repeat(5 - ratingValue)
    : '';

  const detailBody = review || shortDescription || `${title} by ${author}`;
  const detailLabel = review ? 'Review' : 'Notes';

  const coverUrl = bookCoverUrl(book);

  let topBadge = '';
  if (isUnread) topBadge = '<div class="to-read-badge">📚 To Read</div>';
  else if (timesRead > 1) topBadge = `<div class="times-read-badge">📖 ${timesRead}x Read</div>`;

  let zoomLead = `<p class="zoom-detail-lead">${stars}</p>`;
  if (isUnread) zoomLead = '<p class="zoom-detail-lead zoom-detail-unread">To Read</p>';
  else if (!hasRating) zoomLead = '<p class="zoom-detail-lead zoom-detail-unread">Read</p>';

  let ratingBlock: string;
  if (isUnread) ratingBlock = '<div class="book-rating book-rating-unread">Not yet read</div>';
  else if (!hasRating) ratingBlock = '<div class="book-rating book-rating-unrated">Read</div>';
  else ratingBlock = `<div class="book-rating"><span class="rating-number">${ratingValue}</span> ${stars}</div>`;

  const cardClass = `book-card js-zoom-item${isUnread ? ' is-unread' : ''}${review ? ' has-review' : ''}`;
  const dataId = isbn || title;

  const loading = eager ? 'eager' : 'lazy';
  const fp = eager ? ' fetchpriority="high"' : '';
  const coverImg = coverUrl
    ? `<img src="${escapeAttr(coverUrl)}" alt="${escapeAttr(title)}" class="book-cover" loading="${loading}"${fp} decoding="async" data-book-cover-fallback="true">`
    : '';

  const yearSpan = yearStr ? `<span class="book-year">${escapeHtml(yearStr)}</span>` : '';
  const reviewBlock = review
    ? `<p class="book-description">${escapeHtml(shortDescription)}</p>`
    : '';

  return [
    `<div class="${cardClass}" data-isbn="${escapeAttr(isbn)}" data-id="${escapeAttr(dataId)}" data-title="${escapeAttr(title)}" data-rating="${ratingValue}" data-rereads="${reReads}" data-category="${escapeAttr(category)}" role="button" tabindex="0" style="cursor: pointer">`,
    topBadge,
    `<div class="book-cover-wrapper" data-title="${escapeAttr(title)}">`,
    coverImg,
    `<div class="js-zoom-detail" aria-hidden="true">`,
    `<p class="zoom-detail-kicker">${escapeHtml(author)}${yearStr ? ` · ${escapeHtml(yearStr)}` : ''}</p>`,
    `<p class="zoom-detail-title">${escapeHtml(title)}</p>`,
    zoomLead,
    `<p class="zoom-detail-line"><span>${detailLabel} —</span> ${escapeHtml(detailBody)}</p>`,
    `</div></div>`,
    `<div class="book-info">`,
    `<div class="book-title-row"><h3 class="book-title">${escapeHtml(title)}</h3>${yearSpan}</div>`,
    `<p class="book-author">by ${escapeHtml(author)}</p>`,
    ratingBlock,
    reviewBlock,
    `</div></div>`
  ].join('');
}
