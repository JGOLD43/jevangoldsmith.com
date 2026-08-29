import type { Book } from '@/domain/models';
import type { KindleImportBook } from '@/services/kindle-import';

export function comparableBookTitle(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/&amp;/g, ' and ')
    .replace(/\b(?:kindle|ebook|e-book)\s+edition\b/g, ' ')
    .replace(/\([^)]*(?:kindle|ebook|e-book)[^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function comparableAuthor(value: string): string {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizedIsbn(value: string | undefined): string {
  return (value ?? '').replace(/[^0-9x]/gi, '').toLocaleLowerCase();
}

export function findBestKindleBookMatch(imported: KindleImportBook, books: Book[]): Book | undefined {
  const isbn = normalizedIsbn(imported.isbn);
  const titleKeys = new Set([imported.title, imported.sourceTitle ?? ''].map(comparableBookTitle).filter(Boolean));
  const author = comparableAuthor(imported.author ?? '');
  const candidates = books.filter((book) => {
    const bookIsbn = normalizedIsbn(book.isbn);
    if (isbn && bookIsbn === isbn) return true;
    if (!titleKeys.has(comparableBookTitle(book.title))) return false;
    const bookAuthor = comparableAuthor(book.author);
    return !author || !bookAuthor || author === bookAuthor;
  });
  return candidates.sort((left, right) => {
    const leftIsbn = isbn && normalizedIsbn(left.isbn) === isbn ? 1 : 0;
    const rightIsbn = isbn && normalizedIsbn(right.isbn) === isbn ? 1 : 0;
    if (leftIsbn !== rightIsbn) return rightIsbn - leftIsbn;
    const leftAttached = left.encryptedFileUri ? 1 : 0;
    const rightAttached = right.encryptedFileUri ? 1 : 0;
    return rightAttached - leftAttached;
  })[0];
}

export function isEpubCfi(locator: string): boolean {
  return /^epubcfi\(.+\)$/.test(locator.trim());
}
