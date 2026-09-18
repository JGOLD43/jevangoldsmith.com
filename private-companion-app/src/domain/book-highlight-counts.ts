export interface HighlightCountRecord {
  publicId?: string | null;
  isbn: string;
  title: string;
  author: string;
  highlightCount: number;
}

export function bookTitleKey(value: string): string {
  const key = value.split(/[:(]/)[0].normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const editions: Record<string, string> = {
    'influence new and expanded': 'influence',
    'the one sentence persuasion course 27 words to make the world do your bidding': 'the one sentence persuasion course',
    'mind of napoleon': 'the mind of napoleon',
  };
  return editions[key] || key;
}

function sameAuthor(left: string, right: string): boolean {
  const tokens = (value: string) => bookTitleKey(value).split(' ').filter((token) => token.length > 1 && !['and', 'ed', 'phd'].includes(token));
  const a = tokens(left); const b = tokens(right);
  return a.length > 0 && b.length > 0 && (a.every((token) => b.includes(token)) || b.every((token) => a.includes(token)));
}

export function highlightCountFor(book: { id: string; title: string; author: string }, records: HighlightCountRecord[]): number | null {
  const valid = records.filter((record) => Number.isSafeInteger(record.highlightCount) && record.highlightCount >= 0);
  const exact = valid.filter((record) => record.publicId === book.id || record.publicId === `isbn:${book.id}` || Boolean(record.isbn && record.isbn === book.id));
  // Author and title must both match. Avoid fuzzy matches between different
  // books that happen to mention the same author or a shared phrase.
  const matches = exact.length ? exact : valid.filter((record) => bookTitleKey(record.title) === bookTitleKey(book.title)
    && sameAuthor(record.author, book.author));
  // A metadata-only copy and an imported copy may coexist. Do not count the
  // same imported highlights twice, or let a blank metadata copy erase them.
  return matches.length ? Math.max(...matches.map((record) => record.highlightCount)) : null;
}
