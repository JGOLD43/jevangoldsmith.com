import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizePublicBook, publicBookId, toPublicBookFields } from '../src/services/public-books.ts';
import { parseKindleImport, parseKindleNotebookHtml } from '../src/services/kindle-import.ts';
import { comparableBookTitle, findBestKindleBookMatch, isEpubCfi } from '../src/services/book-matching.ts';

test('website books normalize into metadata-only local records', () => {
  const book = normalizePublicBook({ title: 'Example', author: 'Author', isbn: '978-1-2', rating: 5, read: true, coverImage: 'images/example-360.jpg', coverImageMedium: 'images/example-240.jpg' });
  assert.equal(book.format, 'metadata');
  assert.equal(book.isPublic, true);
  assert.equal(book.readingStatus, 'finished');
  assert.match(book.coverUri, /^https:\/\/jevangoldsmith\.com\//);
  assert.match(book.coverUri, /example-360\.jpg$/);
  assert.equal('encryptedFileUri' in book, false);
});

test('ISBN is the stable public identity, with title and author fallback', () => {
  assert.equal(publicBookId({ title: 'A', author: 'B', isbn: '978-1-2' }), 'isbn:97812');
  assert.equal(publicBookId({ title: 'A Book', author: 'Some One' }), 'title:a-book:some-one');
});

test('public book fields omit every private reading field', () => {
  const fields = toPublicBookFields({
    id: '1', publicId: null, title: 'Title', author: 'Author', isbn: '', year: '', rating: 4, reReads: 0,
    category: '', summary: '', review: '', coverUri: null, format: 'epub', encryptedFileUri: 'file:///secret.book',
    originalFileName: 'secret.epub', fileHash: 'hash', readingStatus: 'reading', progress: 0.3, locator: 'private-cfi',
    totalPages: 100, currentPage: 30, isPublic: false, addedAt: '', updatedAt: '', lastOpenedAt: '',
  });
  assert.deepEqual(Object.keys(fields), ['title', 'author', 'isbn', 'year', 'rating', 'reReads', 'category', 'summary', 'review', 'read']);
  assert.equal(JSON.stringify(fields).includes('secret'), false);
});

test('reading analytics remain in the encrypted local database', async () => {
  const database = await import('node:fs/promises').then((fs) => fs.readFile(new URL('../src/storage/database.ts', import.meta.url), 'utf8'));
  const analytics = await import('node:fs/promises').then((fs) => fs.readFile(new URL('../src/storage/reading-analytics.ts', import.meta.url), 'utf8'));
  const reader = await import('node:fs/promises').then((fs) => fs.readFile(new URL('../src/app/books/[id]/reader.tsx', import.meta.url), 'utf8'));
  assert.match(database, /PRAGMA key/);
  assert.match(database, /CREATE TABLE IF NOT EXISTS reading_sessions/);
  assert.match(analytics, /beginReadingSession/);
  assert.match(analytics, /getBookReadingStats/);
  assert.match(analytics, /getLibraryReadingStats/);
  assert.doesNotMatch(analytics, /fetch\(|publishManifest|askFrontierModel/);
  assert.match(reader, /useReadingSession/);
});

test('Kindle imports validate books and private highlights', () => {
  const imported = parseKindleImport(JSON.stringify({
    format: 'jgold-kindle-export', version: 1,
    books: [{ title: 'Example Book', author: 'Example Author', highlights: [{ text: 'A highlighted passage', location: 'Page 12', color: '#FFD54F' }] }],
  }));
  assert.equal(imported.books[0].title, 'Example Book');
  assert.equal(imported.books[0].highlights?.[0].location, 'Page 12');
  assert.throws(() => parseKindleImport('{"books":[]}'), /JGOLD Kindle export/);
});

test('Kindle v2 imports carry cover and collection repairs', () => {
  const imported = parseKindleImport(JSON.stringify({
    format: 'jgold-kindle-export', version: 2,
    books: [{ title: 'Example Book', sourceTitle: 'Example Book - Kindle Edition', coverUri: 'https://covers.example/book.jpg', category: 'Learning', collections: ['Learning', 'Kindle'] }],
  }));
  assert.equal(imported.version, 2);
  assert.equal(imported.books[0].coverUri, 'https://covers.example/book.jpg');
  assert.equal(imported.books[0].sourceTitle, 'Example Book - Kindle Edition');
  assert.deepEqual(imported.books[0].collections, ['Learning', 'Kindle']);
});

test('Kindle notebook HTML becomes one complete book import', () => {
  const imported = parseKindleNotebookHtml(`<!doctype html><html><body>
    <div class="bookTitle">A Useful Book</div><div class="authors">by Ada Reader</div>
    <div class="noteHeading">Highlight (yellow) - Page 12</div><div class="noteText">Recall first &amp; reread second.</div>
    <div class="noteHeading">Note - Page 12</div><div class="noteText">Use this in practice.</div>
    <div class="noteHeading">Highlight (yellow) - Location 44-45</div><div class="noteText">Transfer is the real test.</div>
  </body></html>`, 'A Useful Book - Notebook.html');
  assert.equal(imported.books[0].title, 'A Useful Book');
  assert.equal(imported.books[0].author, 'Ada Reader');
  assert.equal(imported.books[0].highlights?.length, 2);
  assert.equal(imported.books[0].highlights?.[0].note, 'Use this in practice.');
  assert.equal(imported.books[0].highlights?.[1].location, 'Location 44-45');
});

test('Kindle import stays local and idempotently checks annotations', async () => {
  const repository = await import('node:fs/promises').then((fs) => fs.readFile(new URL('../src/storage/books-repository.ts', import.meta.url), 'utf8'));
  assert.match(repository, /importKindleLibrary/);
  assert.match(repository, /selected_text=\? AND note=\?/);
  assert.match(repository, /book_collection_members/);
  assert.match(repository, /findBestKindleBookMatch/);
  assert.doesNotMatch(repository, /fetch\(|publishManifest/);
});

test('Kindle edition titles match the attached local book before metadata copies', () => {
  const base = { publicId: null, author: 'Ada Reader', isbn: '', year: '', rating: 0, reReads: 0, category: '', summary: '', review: '', coverUri: null, originalFileName: null, fileHash: null, readingStatus: 'reading', progress: 0, locator: null, totalPages: null, currentPage: null, isPublic: false, addedAt: '', updatedAt: '', lastOpenedAt: null };
  const metadata = { ...base, id: 'metadata', title: 'A Useful Book', format: 'metadata', encryptedFileUri: null };
  const attached = { ...base, id: 'attached', title: 'A Useful Book', format: 'epub', encryptedFileUri: 'encrypted://book' };
  assert.equal(comparableBookTitle('A Useful Book - Kindle Edition'), 'a useful book');
  assert.equal(findBestKindleBookMatch({ title: 'A Useful Book', sourceTitle: 'A Useful Book - Kindle Edition', author: 'Ada Reader' }, [metadata, attached])?.id, 'attached');
});

test('only real EPUB CFIs are rendered inline while imported locations stay listable', () => {
  assert.equal(isEpubCfi('epubcfi(/6/4!/4/2/1:0)'), true);
  assert.equal(isEpubCfi('Page 12'), false);
  assert.equal(isEpubCfi('Location 44-45'), false);
});

test('book details surface imported highlights before collection and publishing controls', async () => {
  const detail = await import('node:fs/promises').then((fs) => fs.readFile(new URL('../src/app/books/[id].tsx', import.meta.url), 'utf8'));
  assert.ok(detail.indexOf('title="Highlights & notes"') < detail.indexOf('title="Collections"'));
  assert.match(detail, /View all \$\{annotations\.length\} highlights & notes/);
});
