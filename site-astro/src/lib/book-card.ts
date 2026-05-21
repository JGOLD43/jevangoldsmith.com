// Server-side renderer for book cards. books.ts binds behavior to these SSR'd
// cards and filters by toggling visibility.

import type { Book } from '../content.config';
import remoteAssets from '../../../data/remote-assets.generated.json';
import { cardFrame, topBadge } from './card';
import { escapeAttr, escapeHtml } from './html-escape';
import { lcpAttrs } from './lcp-attrs';
import { slugify } from './slug';

// Card renderers accept a Partial<Book> shape — all fields optional so legacy
// records with missing fields still render gracefully.
type BookData = Partial<Book>;

type RemoteEntry = { formats: Record<string, { avif?: string; jpg?: string }> };
const REMOTE = remoteAssets as Record<string, RemoteEntry>;

// Localize an OpenLibrary cover URL to the locally-generated jpg
// (build-time download from optimize-assets.js → images/generated/remote/).
// Fall back to the remote URL when the manifest doesn't have it (first
// build before optimize-assets has run, or a non-OpenLibrary cover).
//
// Card covers display ~150px wide so 360 (2x DPR) is ideal; carousel
// thumbs display ~64px so 240 paints faster without visible quality
// loss. Caller picks via `size`. Phase 12 consolidated the duplicate
// localizer that lived in books.astro into this single source of truth.
const COVER_WIDTHS = { medium: ['240', '360', '480'], large: ['360', '480', '240'] } as const;
function localize(url: string, size: 'medium' | 'large' = 'large'): string {
  if (!url) return '';
  const lookupKey = url.replace(/-M\.jpg(\?.*)?$/, '-L.jpg');
  const entry = REMOTE[lookupKey] || REMOTE[url];
  if (!entry) return url;
  for (const width of COVER_WIDTHS[size]) {
    const jpg = entry.formats[width]?.jpg;
    if (jpg) return `/${jpg}`;
  }
  return url;
}

export function bookCoverUrl(book: BookData, size: 'medium' | 'large' = 'large'): string {
  if (book.coverImage) return localize(book.coverImage, size);
  const cleanIsbn = String(book.isbn ?? '').replace(/[^0-9X]/g, '');
  if (!cleanIsbn) return '';
  return localize(`https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`, size);
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
  const ratingValue = Number(book.rating ?? 0);
  const reReads = Number(book.reReads ?? 0);
  const isUnread = book.read === false;
  const hasRating = !isUnread && ratingValue > 0;
  const timesRead = reReads + 1;

  const stars = hasRating
    ? '★'.repeat(ratingValue) + '☆'.repeat(5 - ratingValue)
    : '';

  // detailBody is empty when no real review/shortDescription exists. The
  // dead `${title} by ${author}` fallback was a duplicate of zoom-detail-
  // title + zoom-detail-kicker — pure bytes for nothing.
  const detailBody = review || shortDescription;
  const detailLabel = review ? 'Review' : 'Notes';

  const coverUrl = bookCoverUrl(book);

  const badgeHtml = isUnread
    ? '<div class="to-read-badge">📚 To Read</div>'
    : topBadge(timesRead > 1 ? `📖 ${timesRead}x Read` : null);

  let zoomLead = `<p class="zoom-detail-lead">${stars}</p>`;
  if (isUnread) zoomLead = '<p class="zoom-detail-lead zoom-detail-unread">To Read</p>';
  else if (!hasRating) zoomLead = '<p class="zoom-detail-lead zoom-detail-unread">Read</p>';

  let ratingBlock: string;
  if (isUnread) ratingBlock = '<div class="book-rating book-rating-unread">Not yet read</div>';
  else if (!hasRating) ratingBlock = '<div class="book-rating book-rating-unrated">Read</div>';
  else ratingBlock = `<div class="book-rating"><span class="rating-number">${ratingValue}</span> ${stars}</div>`;

  // view-transition-name pairs this cover with /books/{slug}.html's
  // hero so the browser morphs them during cross-doc navigation.
  const vtSlug = isbn || slugify(`${title}-${author}`);
  const vtStyle = vtSlug ? ` style="view-transition-name: book-cover-${vtSlug}"` : '';
  const coverImg = coverUrl
    ? `<img src="${escapeAttr(coverUrl)}" alt="${escapeAttr(title)}" class="book-cover" width="150" height="230" ${lcpAttrs(eager ? 0 : 1, 1)} decoding="async" data-book-cover-fallback="true"${vtStyle}>`
    : '';
  const yearSpan = yearStr ? `<span class="book-year">${escapeHtml(yearStr)}</span>` : '';
  const reviewBlock = review ? `<p class="book-description">${escapeHtml(shortDescription)}</p>` : '';
  const detailLine = detailBody
    ? `<p class="zoom-detail-line"><span>${detailLabel} —</span> ${escapeHtml(detailBody)}</p>`
    : '';

  // data-isbn is the canonical key; data-title fallback for the 7 books
  // missing an ISBN (read at books.ts:158).
  const body = `${badgeHtml}<div class="book-cover-wrapper">${coverImg}<div class="js-zoom-detail" aria-hidden="true"><p class="zoom-detail-kicker">${escapeHtml(author)}${yearStr ? ` · ${escapeHtml(yearStr)}` : ''}</p><p class="zoom-detail-title">${escapeHtml(title)}</p>${zoomLead}${detailLine}</div></div><div class="book-info"><div class="book-title-row"><h3 class="book-title">${escapeHtml(title)}</h3>${yearSpan}</div><p class="book-author">by ${escapeHtml(author)}</p>${ratingBlock}${reviewBlock}</div>`;

  const classes = ['book-card', 'card-link'];
  if (isUnread) classes.push('is-unread');
  if (review) classes.push('has-review');
  const slug = isbn || slugify(`${title}-${author}`);
  const href = slug ? `/books/${slug}.html` : '#';
  // Anchor card so middle-click / ctrl-click still works. The click
  // handler in grid-zoom runs the shelf-style zoom animation, then
  // navigates to /books/{slug}.html once it completes.
  return cardFrame({
    tag: 'a',
    href,
    classes,
    data: { isbn, ...(isbn ? {} : { title }) },
    body
  });
}
