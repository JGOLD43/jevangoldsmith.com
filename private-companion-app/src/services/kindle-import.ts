export type KindleImportHighlight = {
  text: string;
  note?: string;
  location?: string;
  color?: string;
  createdAt?: string;
};

export type KindleImportBook = {
  title: string;
  sourceTitle?: string;
  author?: string;
  isbn?: string;
  year?: string;
  coverUri?: string;
  category?: string;
  collections?: string[];
  readingStatus?: 'unread' | 'reading' | 'finished';
  progress?: number;
  highlights?: KindleImportHighlight[];
};

export type KindleImportDocument = {
  format: 'jgold-kindle-export';
  version: 1 | 2;
  books: KindleImportBook[];
};

const MAX_BOOKS = 5_000;
const MAX_HIGHLIGHTS = 100_000;

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new Error(`${field} must be text.`);
  return value.trim();
}

function optionalStringList(value: unknown, field: string): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw new Error(`${field} must be a list.`);
  return [...new Set(value.map((entry, index) => optionalString(entry, `${field} ${index + 1}`)).filter((entry): entry is string => Boolean(entry)))];
}

export function parseKindleImport(value: string): KindleImportDocument {
  let input: unknown;
  try {
    input = JSON.parse(value);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  if (!input || typeof input !== 'object') throw new Error('That file is not a JGOLD Kindle export.');
  const root = input as Record<string, unknown>;
  if (root.format !== 'jgold-kindle-export' || ![1, 2].includes(Number(root.version)) || !Array.isArray(root.books)) {
    throw new Error('Choose a JGOLD Kindle export (version 1 or 2).');
  }
  if (root.books.length > MAX_BOOKS) throw new Error(`A Kindle import can contain at most ${MAX_BOOKS} books.`);

  let highlightCount = 0;
  const books = root.books.map((entry, bookIndex): KindleImportBook => {
    if (!entry || typeof entry !== 'object') throw new Error(`Book ${bookIndex + 1} is invalid.`);
    const book = entry as Record<string, unknown>;
    const title = optionalString(book.title, `Book ${bookIndex + 1} title`);
    if (!title) throw new Error(`Book ${bookIndex + 1} needs a title.`);
    if (title.length > 500) throw new Error(`Book ${bookIndex + 1} title is too long.`);
    if (book.highlights !== undefined && !Array.isArray(book.highlights)) {
      throw new Error(`Highlights for “${title}” must be a list.`);
    }
    const highlights = (book.highlights ?? []).map((entry, highlightIndex): KindleImportHighlight => {
      if (!entry || typeof entry !== 'object') throw new Error(`Highlight ${highlightIndex + 1} for “${title}” is invalid.`);
      const highlight = entry as Record<string, unknown>;
      const text = optionalString(highlight.text, `Highlight ${highlightIndex + 1} text`);
      if (!text) throw new Error(`Highlight ${highlightIndex + 1} for “${title}” is empty.`);
      highlightCount += 1;
      if (highlightCount > MAX_HIGHLIGHTS) throw new Error(`A Kindle import can contain at most ${MAX_HIGHLIGHTS} highlights.`);
      return {
        text,
        note: optionalString(highlight.note, 'Highlight note'),
        location: optionalString(highlight.location, 'Highlight location'),
        color: optionalString(highlight.color, 'Highlight color'),
        createdAt: optionalString(highlight.createdAt, 'Highlight date'),
      };
    });
    const readingStatus = book.readingStatus ?? 'finished';
    if (!['unread', 'reading', 'finished'].includes(String(readingStatus))) {
      throw new Error(`Reading status for “${title}” is invalid.`);
    }
    const progress = book.progress === undefined ? (readingStatus === 'finished' ? 1 : 0) : Number(book.progress);
    if (!Number.isFinite(progress) || progress < 0 || progress > 1) throw new Error(`Reading progress for “${title}” is invalid.`);
    return {
      title,
      sourceTitle: optionalString(book.sourceTitle, `Original title for “${title}”`),
      author: optionalString(book.author, `Author for “${title}”`),
      isbn: optionalString(book.isbn, `ISBN for “${title}”`),
      year: optionalString(book.year, `Year for “${title}”`),
      coverUri: optionalString(book.coverUri, `Cover for “${title}”`),
      category: optionalString(book.category, `Category for “${title}”`),
      collections: optionalStringList(book.collections, `Collections for “${title}”`),
      readingStatus: readingStatus as KindleImportBook['readingStatus'],
      progress,
      highlights,
    };
  });

  return { format: 'jgold-kindle-export', version: Number(root.version) as 1 | 2, books };
}

function decodeHtml(value: string): string {
  const entities: Record<string, string> = { amp: '&', apos: "'", gt: '>', lt: '<', nbsp: ' ', quot: '"' };
  return value
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(x?[0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code.replace(/^x/i, ''), /^x/i.test(code) ? 16 : 10)))
    .replace(/&([a-z]+);/gi, (_, name: string) => entities[name.toLowerCase()] ?? `&${name};`)
    .replace(/[ \t\r\f\v]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
}

function classBlocks(html: string, className: string): string[] {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const expression = new RegExp(`<[^>]+class=["'][^"']*\\b${escaped}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'gi');
  return [...html.matchAll(expression)].map((match) => decodeHtml(match[1])).filter(Boolean);
}

function notebookTitleFromFileName(fileName: string): string {
  return decodeURIComponent(fileName).replace(/[a-f0-9-]{36}$/i, '').replace(/\s*-\s*Notebook\.html$/i, '').trim();
}

export function parseKindleNotebookHtml(html: string, fileName = 'Kindle Notebook.html'): KindleImportDocument {
  if (!/<html\b|<!doctype\s+html/i.test(html)) throw new Error('That file is not a Kindle notebook HTML export.');
  const titles = classBlocks(html, 'bookTitle');
  const authors = classBlocks(html, 'authors');
  const headings = classBlocks(html, 'noteHeading');
  const passages = classBlocks(html, 'noteText');
  if (!passages.length) throw new Error('No highlights or notes were found in that Kindle notebook.');

  const highlights: KindleImportHighlight[] = [];
  passages.forEach((text, index) => {
    const heading = headings[index] ?? '';
    if (/\bnote\b/i.test(heading) && highlights.length) {
      highlights[highlights.length - 1].note = text;
      return;
    }
    const location = heading.match(/(?:page|location)\s+([0-9–—-]+)/i)?.[0];
    highlights.push({ text, location, color: '#FFD54F' });
  });
  return {
    format: 'jgold-kindle-export',
    version: 2,
    books: [{
      title: titles[0] || notebookTitleFromFileName(fileName),
      author: authors[0]?.replace(/^by\s+/i, ''),
      readingStatus: 'finished',
      progress: 1,
      collections: ['Kindle'],
      highlights,
    }],
  };
}
