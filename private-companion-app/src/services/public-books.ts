import type { Book, NewBook, PublicBookFields } from '@/domain/models';

const SITE_BASE_URL = 'https://jevangoldsmith.com';

function absoluteSiteUrl(value: unknown): string | null {
  const path = typeof value === 'string' ? value : '';
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_BASE_URL}/${path.replace(/^\//, '')}`;
}

type ApiBook = Record<string, unknown>;
type ApiBooks = { items?: ApiBook[] };

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function number(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function publicBookId(raw: ApiBook): string {
  const isbn = text(raw.isbn).replace(/[^0-9X]/gi, '');
  if (isbn) return `isbn:${isbn}`;
  return `title:${text(raw.title).toLowerCase().replace(/[^a-z0-9]+/g, '-')}:${text(raw.author).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

export function normalizePublicBook(raw: ApiBook): NewBook {
  return {
    publicId: publicBookId(raw),
    title: text(raw.title),
    author: text(raw.author),
    isbn: text(raw.isbn),
    year: text(raw.year),
    rating: number(raw.rating),
    reReads: number(raw.reReads),
    category: text(raw.category),
    summary: text(raw.summary) || text(raw.shortDescription),
    review: text(raw.review),
    // Library cards are roughly 150 logical pixels wide. The website's 360px
    // cover stays crisp at common Android densities without loading originals.
    coverUri: absoluteSiteUrl(raw.coverImage || raw.coverImageMedium),
    format: 'metadata',
    readingStatus: raw.read === true ? 'finished' : 'unread',
    isPublic: true,
  };
}

export async function loadPublicBooks(): Promise<NewBook[]> {
  const response = await fetch(`${SITE_BASE_URL}/api/v1/books.json?fresh=${Date.now()}`, {
    headers: { 'Cache-Control': 'no-cache' },
  });
  if (!response.ok) throw new Error(`Could not load website books (${response.status}).`);
  const payload = (await response.json()) as ApiBooks;
  return (payload.items ?? []).map(normalizePublicBook).filter((book) => book.title);
}

export function toPublicBookFields(book: Book): PublicBookFields {
  return {
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    year: book.year,
    rating: book.rating,
    reReads: book.reReads,
    category: book.category,
    summary: book.summary,
    review: book.review,
    read: book.readingStatus === 'finished',
  };
}
