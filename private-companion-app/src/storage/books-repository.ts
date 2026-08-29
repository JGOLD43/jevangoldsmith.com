import * as Crypto from 'expo-crypto';

import type { Book, BookAnnotation, BookCollection, NewBook } from '@/domain/models';
import type { KindleImportDocument } from '@/services/kindle-import';
import { comparableBookTitle, findBestKindleBookMatch } from '@/services/book-matching';

import { removeEncryptedBook } from './book-files';
import { getDatabase } from './database';

type BookRow = {
  id: string; public_id: string | null; title: string; author: string; isbn: string; year: string;
  rating: number; re_reads: number; category: string; summary: string; review: string; cover_uri: string | null;
  format: Book['format']; encrypted_file_uri: string | null; original_file_name: string | null; file_hash: string | null;
  reading_status: Book['readingStatus']; progress: number; locator: string | null; total_pages: number | null;
  current_page: number | null; is_public: number; added_at: string; updated_at: string; last_opened_at: string | null;
};

type AnnotationRow = {
  id: string; book_id: string; kind: BookAnnotation['kind']; locator: string; selected_text: string;
  note: string; color: string; created_at: string; updated_at: string;
};

function mapBook(row: BookRow): Book {
  return {
    id: row.id, publicId: row.public_id, title: row.title, author: row.author, isbn: row.isbn, year: row.year,
    rating: row.rating, reReads: row.re_reads, category: row.category, summary: row.summary, review: row.review,
    coverUri: row.cover_uri, format: row.format, encryptedFileUri: row.encrypted_file_uri,
    originalFileName: row.original_file_name, fileHash: row.file_hash, readingStatus: row.reading_status,
    progress: row.progress, locator: row.locator, totalPages: row.total_pages, currentPage: row.current_page,
    isPublic: row.is_public === 1, addedAt: row.added_at, updatedAt: row.updated_at, lastOpenedAt: row.last_opened_at,
  };
}

function mapAnnotation(row: AnnotationRow): BookAnnotation {
  return { id: row.id, bookId: row.book_id, kind: row.kind, locator: row.locator, selectedText: row.selected_text,
    note: row.note, color: row.color, createdAt: row.created_at, updatedAt: row.updated_at };
}

export async function listBooks(): Promise<Book[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<BookRow>('SELECT * FROM books ORDER BY COALESCE(last_opened_at, updated_at) DESC');
  return rows.map(mapBook);
}

export async function syncPublicBooks(inputs: NewBook[]): Promise<void> {
  const database = await getDatabase();
  await database.withTransactionAsync(async () => {
    for (const input of inputs) {
      let existing = input.publicId
        ? await database.getFirstAsync<BookRow>('SELECT * FROM books WHERE public_id = ?', input.publicId)
        : null;
      if (!existing && input.isbn) {
        existing = await database.getFirstAsync<BookRow>('SELECT * FROM books WHERE isbn = ? AND isbn <> ?', input.isbn, '');
      }
      if (!existing) {
        existing = await database.getFirstAsync<BookRow>(
          'SELECT * FROM books WHERE lower(title) = lower(?) AND lower(author) = lower(?) LIMIT 1',
          input.title,
          input.author,
        );
      }
      if (!existing) {
        await addBook(input);
        continue;
      }
      await database.runAsync(`UPDATE books SET public_id=?, title=?, author=?, isbn=?, year=?, rating=?, re_reads=?,
        category=?, summary=?, review=?, cover_uri=?, is_public=1, reading_status=CASE WHEN progress > 0 THEN reading_status ELSE ? END,
        updated_at=? WHERE id=?`, input.publicId ?? existing.public_id, input.title, input.author, input.isbn ?? '',
        input.year ?? '', input.rating ?? 0, input.reReads ?? 0, input.category ?? '', input.summary ?? '', input.review ?? '',
        input.coverUri ?? existing.cover_uri, input.readingStatus ?? existing.reading_status, new Date().toISOString(), existing.id);
    }
  });
}

export async function getBook(bookId: string): Promise<Book | null> {
  const row = await (await getDatabase()).getFirstAsync<BookRow>('SELECT * FROM books WHERE id = ?', bookId);
  return row ? mapBook(row) : null;
}

export async function addBook(input: NewBook): Promise<Book> {
  const database = await getDatabase();
  if (input.fileHash) {
    const duplicate = await database.getFirstAsync<BookRow>('SELECT * FROM books WHERE file_hash = ?', input.fileHash);
    if (duplicate) return mapBook(duplicate);
  }
  const now = new Date().toISOString();
  const book: Book = {
    id: Crypto.randomUUID(), publicId: input.publicId ?? null, title: input.title.trim(), author: input.author.trim(),
    isbn: input.isbn?.trim() ?? '', year: input.year?.trim() ?? '', rating: input.rating ?? 0, reReads: input.reReads ?? 0,
    category: input.category?.trim() ?? '', summary: input.summary?.trim() ?? '', review: input.review?.trim() ?? '',
    coverUri: input.coverUri ?? null, format: input.format, encryptedFileUri: input.encryptedFileUri ?? null,
    originalFileName: input.originalFileName ?? null, fileHash: input.fileHash ?? null,
    readingStatus: input.readingStatus ?? 'unread', progress: 0, locator: null, totalPages: null, currentPage: null,
    isPublic: input.isPublic ?? false, addedAt: now, updatedAt: now, lastOpenedAt: null,
  };
  await database.runAsync(`INSERT INTO books
    (id, public_id, title, author, isbn, year, rating, re_reads, category, summary, review, cover_uri, format,
     encrypted_file_uri, original_file_name, file_hash, reading_status, progress, locator, total_pages, current_page,
     is_public, added_at, updated_at, last_opened_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    book.id, book.publicId, book.title, book.author, book.isbn, book.year, book.rating, book.reReads, book.category,
    book.summary, book.review, book.coverUri, book.format, book.encryptedFileUri, book.originalFileName, book.fileHash,
    book.readingStatus, book.progress, book.locator, book.totalPages, book.currentPage, book.isPublic ? 1 : 0,
    book.addedAt, book.updatedAt, book.lastOpenedAt);
  return book;
}

export async function updateBook(bookId: string, fields: Partial<Pick<Book,
  'title' | 'author' | 'isbn' | 'year' | 'rating' | 'reReads' | 'category' | 'summary' | 'review' |
  'coverUri' | 'readingStatus' | 'isPublic'
>>): Promise<Book> {
  const current = await getBook(bookId);
  if (!current) throw new Error('Book not found.');
  const next = { ...current, ...fields, updatedAt: new Date().toISOString() };
  await (await getDatabase()).runAsync(`UPDATE books SET title=?, author=?, isbn=?, year=?, rating=?, re_reads=?,
    category=?, summary=?, review=?, cover_uri=?, reading_status=?, is_public=?, updated_at=? WHERE id=?`,
    next.title.trim(), next.author.trim(), next.isbn.trim(), next.year.trim(), next.rating, next.reReads,
    next.category.trim(), next.summary.trim(), next.review.trim(), next.coverUri, next.readingStatus,
    next.isPublic ? 1 : 0, next.updatedAt, bookId);
  return next;
}

export async function attachBookFile(bookId: string, input: Pick<Book, 'encryptedFileUri' | 'originalFileName' | 'fileHash' | 'format'>): Promise<Book> {
  const current = await getBook(bookId);
  if (!current) throw new Error('Book not found.');
  if (input.fileHash) {
    const duplicate = await (await getDatabase()).getFirstAsync<{ id: string }>('SELECT id FROM books WHERE file_hash = ? AND id <> ?', input.fileHash, bookId);
    if (duplicate) throw new Error('That file is already attached to another book.');
  }
  if (current.encryptedFileUri && current.encryptedFileUri !== input.encryptedFileUri) removeEncryptedBook(current.encryptedFileUri);
  const updatedAt = new Date().toISOString();
  await (await getDatabase()).runAsync('UPDATE books SET encrypted_file_uri=?, original_file_name=?, file_hash=?, format=?, updated_at=? WHERE id=?',
    input.encryptedFileUri, input.originalFileName, input.fileHash, input.format, updatedAt, bookId);
  return { ...current, ...input, updatedAt };
}

export async function saveReadingPosition(bookId: string, input: { progress: number; locator?: string | null; currentPage?: number | null; totalPages?: number | null }): Promise<void> {
  const progress = Math.max(0, Math.min(1, input.progress));
  const status = progress >= 0.995 ? 'finished' : progress > 0 ? 'reading' : 'unread';
  const now = new Date().toISOString();
  await (await getDatabase()).runAsync(`UPDATE books SET progress=?, locator=?, current_page=?, total_pages=?,
    reading_status=?, last_opened_at=?, updated_at=? WHERE id=?`, progress, input.locator ?? null,
    input.currentPage ?? null, input.totalPages ?? null, status, now, now, bookId);
}

export async function removeBook(bookId: string): Promise<void> {
  const book = await getBook(bookId);
  if (book?.encryptedFileUri) removeEncryptedBook(book.encryptedFileUri);
  await (await getDatabase()).runAsync('DELETE FROM books WHERE id = ?', bookId);
}

export async function listBookAnnotations(bookId: string): Promise<BookAnnotation[]> {
  const rows = await (await getDatabase()).getAllAsync<AnnotationRow>('SELECT * FROM book_annotations WHERE book_id = ? ORDER BY created_at DESC', bookId);
  return rows.map(mapAnnotation);
}

export async function addBookAnnotation(input: Omit<BookAnnotation, 'id' | 'createdAt' | 'updatedAt'>): Promise<BookAnnotation> {
  const now = new Date().toISOString();
  const annotation: BookAnnotation = { ...input, id: Crypto.randomUUID(), createdAt: now, updatedAt: now };
  await (await getDatabase()).runAsync(`INSERT INTO book_annotations
    (id, book_id, kind, locator, selected_text, note, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    annotation.id, annotation.bookId, annotation.kind, annotation.locator, annotation.selectedText,
    annotation.note, annotation.color, annotation.createdAt, annotation.updatedAt);
  return annotation;
}

export type KindleImportResult = {
  booksAdded: number;
  booksMatched: number;
  highlightsAdded: number;
  booksRepaired: number;
  collectionsAdded: number;
};

export async function importKindleLibrary(input: KindleImportDocument): Promise<KindleImportResult> {
  const database = await getDatabase();
  const existingBooks = await listBooks();
  const result: KindleImportResult = { booksAdded: 0, booksMatched: 0, highlightsAdded: 0, booksRepaired: 0, collectionsAdded: 0 };

  await database.withTransactionAsync(async () => {
    for (const imported of input.books) {
      let book = findBestKindleBookMatch(imported, existingBooks);
      if (!book) {
        book = await addBook({
          title: imported.title,
          author: imported.author ?? '',
          isbn: imported.isbn,
          year: imported.year,
          coverUri: imported.coverUri,
          format: 'metadata',
          readingStatus: imported.readingStatus ?? 'finished',
          isPublic: false,
          category: imported.category ?? imported.collections?.[0] ?? 'Kindle',
        });
        existingBooks.push(book);
        result.booksAdded += 1;
      } else {
        result.booksMatched += 1;
      }
      const readingStatus = imported.readingStatus ?? 'finished';
      const progress = imported.progress ?? (readingStatus === 'finished' ? 1 : 0);
      const repaired = Boolean(imported.author || imported.isbn || imported.year || imported.coverUri || imported.category);
      await database.runAsync(`UPDATE books SET title=CASE WHEN ? <> '' THEN ? ELSE title END,
        author=CASE WHEN ? <> '' THEN ? ELSE author END,
        isbn=CASE WHEN ? <> '' THEN ? ELSE isbn END, year=CASE WHEN ? <> '' THEN ? ELSE year END,
        cover_uri=COALESCE(?, cover_uri), category=CASE WHEN ? <> '' THEN ? ELSE category END,
        reading_status=?, progress=?, updated_at=? WHERE id=?`,
      imported.sourceTitle ? imported.title : '', imported.sourceTitle ? imported.title : '',
      imported.author ?? '', imported.author ?? '', imported.isbn ?? '', imported.isbn ?? '',
      imported.year ?? '', imported.year ?? '', imported.coverUri ?? null,
      imported.category ?? '', imported.category ?? '', readingStatus, progress, new Date().toISOString(), book.id);
      if (repaired) result.booksRepaired += 1;

      for (const collectionName of [...new Set(['Kindle', ...(imported.collections ?? []), ...(imported.category ? [imported.category] : [])])]) {
        const collection = await addBookCollection(collectionName);
        const membership = await database.getFirstAsync<{ collection_id: string }>(
          'SELECT collection_id FROM book_collection_members WHERE collection_id=? AND book_id=?', collection.id, book.id,
        );
        if (!membership) {
          await database.runAsync('INSERT INTO book_collection_members (collection_id, book_id) VALUES (?, ?)', collection.id, book.id);
          result.collectionsAdded += 1;
        }
      }

      for (const highlight of imported.highlights ?? []) {
        const locator = highlight.location ?? '';
        const note = highlight.note ?? '';
        const duplicate = await database.getFirstAsync<{ id: string }>(`SELECT id FROM book_annotations
          WHERE book_id=? AND kind='highlight' AND locator=? AND selected_text=? AND note=? LIMIT 1`,
        book.id, locator, highlight.text, note);
        if (duplicate) continue;
        const now = highlight.createdAt && !Number.isNaN(Date.parse(highlight.createdAt))
          ? new Date(highlight.createdAt).toISOString()
          : new Date().toISOString();
        await database.runAsync(`INSERT INTO book_annotations
          (id, book_id, kind, locator, selected_text, note, color, created_at, updated_at)
          VALUES (?, ?, 'highlight', ?, ?, ?, ?, ?, ?)`, Crypto.randomUUID(), book.id, locator,
        highlight.text, note, highlight.color ?? '#FFD54F', now, now);
        result.highlightsAdded += 1;
      }
    }
  });
  return result;
}

export async function repairImportedHighlightAssignments(): Promise<number> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<BookRow & { highlight_count: number }>(`SELECT books.*,
    COUNT(book_annotations.id) AS highlight_count FROM books
    LEFT JOIN book_annotations ON book_annotations.book_id=books.id AND book_annotations.kind IN ('highlight', 'note')
    GROUP BY books.id`);
  const books = rows.map(mapBook);
  let repaired = 0;
  await database.withTransactionAsync(async () => {
    for (const sourceRow of rows) {
      if (sourceRow.format !== 'metadata' || sourceRow.highlight_count < 1) continue;
      const source = mapBook(sourceRow);
      const title = comparableBookTitle(source.title);
      const candidates = books.filter((candidate) => candidate.id !== source.id && candidate.encryptedFileUri
        && comparableBookTitle(candidate.title) === title
        && (!source.isbn || !candidate.isbn || source.isbn.replace(/\W/g, '') === candidate.isbn.replace(/\W/g, ''))
        && (!source.author || !candidate.author || source.author.toLocaleLowerCase().trim() === candidate.author.toLocaleLowerCase().trim()));
      if (candidates.length !== 1) continue;
      const target = candidates[0];
      const annotations = await database.getAllAsync<AnnotationRow>('SELECT * FROM book_annotations WHERE book_id=?', source.id);
      for (const annotation of annotations) {
        const duplicate = await database.getFirstAsync<{ id: string }>(`SELECT id FROM book_annotations
          WHERE book_id=? AND kind=? AND locator=? AND selected_text=? AND note=? LIMIT 1`, target.id,
        annotation.kind, annotation.locator, annotation.selected_text, annotation.note);
        if (!duplicate) {
          await database.runAsync('UPDATE book_annotations SET book_id=?, updated_at=? WHERE id=?',
            target.id, new Date().toISOString(), annotation.id);
        } else {
          await database.runAsync('DELETE FROM book_annotations WHERE id=? AND book_id=?', annotation.id, source.id);
        }
        repaired += 1;
      }
      await database.runAsync(`INSERT OR IGNORE INTO book_collection_members (collection_id, book_id)
        SELECT collection_id, ? FROM book_collection_members WHERE book_id=?`, target.id, source.id);
    }
  });
  return repaired;
}

export async function removeBookAnnotation(annotationId: string): Promise<void> {
  await (await getDatabase()).runAsync('DELETE FROM book_annotations WHERE id = ?', annotationId);
}

export async function listBookCollections(): Promise<BookCollection[]> {
  return (await (await getDatabase()).getAllAsync<{ id: string; name: string; created_at: string }>('SELECT * FROM book_collections ORDER BY name'))
    .map((row) => ({ id: row.id, name: row.name, createdAt: row.created_at }));
}

export async function addBookCollection(name: string): Promise<BookCollection> {
  const collection = { id: Crypto.randomUUID(), name: name.trim(), createdAt: new Date().toISOString() };
  await (await getDatabase()).runAsync('INSERT OR IGNORE INTO book_collections (id, name, created_at) VALUES (?, ?, ?)', collection.id, collection.name, collection.createdAt);
  const saved = await (await getDatabase()).getFirstAsync<{ id: string; name: string; created_at: string }>('SELECT * FROM book_collections WHERE name = ? COLLATE NOCASE', collection.name);
  if (!saved) throw new Error('Could not create collection.');
  return { id: saved.id, name: saved.name, createdAt: saved.created_at };
}

export async function listBookCollectionIds(bookId: string): Promise<string[]> {
  const rows = await (await getDatabase()).getAllAsync<{ collection_id: string }>('SELECT collection_id FROM book_collection_members WHERE book_id = ?', bookId);
  return rows.map((row) => row.collection_id);
}

export async function listBookCollectionMemberships(): Promise<Record<string, string[]>> {
  const rows = await (await getDatabase()).getAllAsync<{ book_id: string; collection_id: string }>(
    'SELECT book_id, collection_id FROM book_collection_members ORDER BY book_id, collection_id',
  );
  return rows.reduce<Record<string, string[]>>((memberships, row) => {
    memberships[row.book_id] = [...(memberships[row.book_id] ?? []), row.collection_id];
    return memberships;
  }, {});
}

export async function setBookInCollection(bookId: string, collectionId: string, included: boolean): Promise<void> {
  const database = await getDatabase();
  if (included) await database.runAsync('INSERT OR IGNORE INTO book_collection_members (collection_id, book_id) VALUES (?, ?)', collectionId, bookId);
  else await database.runAsync('DELETE FROM book_collection_members WHERE collection_id = ? AND book_id = ?', collectionId, bookId);
}
