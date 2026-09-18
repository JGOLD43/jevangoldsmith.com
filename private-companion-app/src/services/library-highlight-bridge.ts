import { highlightCountFor, type HighlightCountRecord } from '../domain/book-highlight-counts.ts';

export function isLibraryUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.origin === 'https://jevangoldsmith.com' && /^\/books(?:\.html)?\/?$/.test(url.pathname);
  } catch { return false; }
}

export function libraryCountResponse(request: unknown, counts: HighlightCountRecord[]): HighlightCountRecord[] {
  if (!Array.isArray(request) || request.length > 500) return [];
  return request.flatMap((book) => {
    if (!book || !['id', 'title', 'author'].every((key) => typeof book[key] === 'string' && book[key].length <= 500)) return [];
    const count = highlightCountFor(book, counts);
    return count === null ? [] : [{ publicId: book.id, isbn: '', title: book.title, author: book.author, highlightCount: count }];
  });
}

export function libraryCountScript(records: HighlightCountRecord[]): string {
  // JSON is data, never executable markup. Keep the response transient, and
  // check the destination again in case navigation finished during the query.
  const data = JSON.stringify(records).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return `if(location.origin==='https://jevangoldsmith.com'&&/^\\/books(?:\\.html)?\\/?$/.test(location.pathname)){window.dispatchEvent(new CustomEvent('jgold-library-counts',{detail:${data}}));}true;`;
}
