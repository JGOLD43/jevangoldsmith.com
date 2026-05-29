#!/usr/bin/env node
// Derive data/books.generated.json from data/books.json.
//
// books.json is the hand-authored SOURCE OF TRUTH. The books page and people
// merge read books.generated.json, which is books.json + two resolved cover
// paths (coverImage = 360px, coverImageMedium = 240px) looked up from the
// remote-asset manifest by each book's OpenLibrary cover URL.
//
// Previously books.generated.json was hand-synced with no generator, so a new
// book added to books.json silently failed to appear. This script closes that
// gap; it runs in build.js before people:merge. Cover resolution mirrors
// site-astro/src/lib/book-card.ts (localize()).
//
// Usage: node scripts/build-books-generated.js [--check]
//   --check  exit non-zero if the committed file is stale (CI drift guard)

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const BOOKS = path.join(ROOT, 'data', 'books.json');
const REMOTE = path.join(ROOT, 'data', 'remote-assets.generated.json');
const OUT = path.join(ROOT, 'data', 'books.generated.json');

const remote = JSON.parse(fs.readFileSync(REMOTE, 'utf8'));

// Match book-card.ts COVER_WIDTHS: large prefers 360, medium prefers 240.
const LARGE_ORDER = ['360', '480', '240'];
const MEDIUM_ORDER = ['240', '360', '480'];

function pickJpg(formats, order) {
  for (const w of order) {
    const jpg = formats?.[w]?.jpg;
    if (jpg) return jpg;
  }
  return undefined;
}

function coversFor(book) {
  // Mirrors book-card.ts localize(): a book with an ISBN always gets a cover —
  // the locally-optimized jpg when the remote-asset manifest has it, otherwise
  // the raw OpenLibrary URL as fallback. Books without an ISBN get no cover.
  const cleanIsbn = String(book.isbn ?? '').replace(/[^0-9X]/g, '');
  if (!cleanIsbn) return {};
  const url = `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`;
  const entry = remote[url];
  const large = entry ? pickJpg(entry.formats, LARGE_ORDER) : undefined;
  const medium = entry ? pickJpg(entry.formats, MEDIUM_ORDER) : undefined;
  return { coverImage: large || url, coverImageMedium: medium || url };
}

function generate() {
  const books = JSON.parse(fs.readFileSync(BOOKS, 'utf8'));
  const list = Array.isArray(books) ? books : books.books;
  const out = list.map((book) => ({ ...book, ...coversFor(book) }));
  return `${JSON.stringify(out, null, 2)}\n`;
}

const generated = generate();

if (process.argv.includes('--check')) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (current !== generated) {
    console.error('[build-books-generated] data/books.generated.json is STALE. Run: npm run books:generate');
    process.exit(1);
  }
  console.log('[build-books-generated] up to date.');
  process.exit(0);
}

const withCover = (JSON.parse(generated)).filter((b) => b.coverImage).length;
fs.writeFileSync(OUT, generated);
console.log(`[build-books-generated] wrote ${OUT} (${JSON.parse(generated).length} books, ${withCover} with covers)`);
