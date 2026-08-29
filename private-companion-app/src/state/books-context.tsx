import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { Book, BookAnnotation, BookCollection, LibraryReadingStats, NewBook } from '@/domain/models';
import { loadPublicBooks } from '@/services/public-books';
import { importBookFile } from '@/storage/book-files';
import { pickKindleImport } from '@/storage/kindle-import';
import {
  addBook,
  addBookAnnotation,
  addBookCollection,
  attachBookFile,
  listBookAnnotations,
  listBookCollectionIds,
  listBookCollectionMemberships,
  listBookCollections,
  listBooks,
  importKindleLibrary,
  removeBook,
  removeBookAnnotation,
  repairImportedHighlightAssignments,
  saveReadingPosition,
  setBookInCollection,
  syncPublicBooks,
  updateBook,
} from '@/storage/books-repository';
import { getLibraryReadingStats } from '@/storage/reading-analytics';

const EMPTY_READING_STATS: LibraryReadingStats = {
  totalSeconds: 0, todaySeconds: 0, lastSevenDaysSeconds: 0, daysRead: 0,
  booksStarted: 0, booksFinished: 0, highlightCount: 0, currentStreak: 0,
  longestStreak: 0, currentWeekStreak: 0, longestWeekStreak: 0, sessionCount: 0, dailyActivity: [],
};

type BooksContextValue = {
  books: Book[];
  collections: BookCollection[];
  collectionIdsByBook: Record<string, string[]>;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  readingStats: LibraryReadingStats;
  refresh: () => Promise<void>;
  refreshReadingStats: () => Promise<void>;
  syncWebsite: () => Promise<void>;
  importBook: (attachToBookId?: string) => Promise<Book | null>;
  importKindle: () => Promise<Awaited<ReturnType<typeof importKindleLibrary>> | null>;
  editBook: (bookId: string, fields: Parameters<typeof updateBook>[1]) => Promise<Book>;
  deleteBook: (bookId: string) => Promise<void>;
  savePosition: (bookId: string, position: Parameters<typeof saveReadingPosition>[1]) => Promise<void>;
  annotationsFor: (bookId: string) => Promise<BookAnnotation[]>;
  addAnnotation: (input: Omit<BookAnnotation, 'id' | 'createdAt' | 'updatedAt'>) => Promise<BookAnnotation>;
  deleteAnnotation: (annotationId: string) => Promise<void>;
  createCollection: (name: string) => Promise<BookCollection>;
  collectionIdsFor: (bookId: string) => Promise<string[]>;
  toggleCollection: (bookId: string, collectionId: string, included: boolean) => Promise<void>;
  dismissError: () => void;
};

const BooksContext = createContext<BooksContextValue | null>(null);

export function BooksProvider({ children }: PropsWithChildren) {
  const [books, setBooks] = useState<Book[]>([]);
  const [collections, setCollections] = useState<BookCollection[]>([]);
  const [collectionIdsByBook, setCollectionIdsByBook] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readingStats, setReadingStats] = useState(EMPTY_READING_STATS);

  const refreshReadingStats = useCallback(async () => {
    setReadingStats(await getLibraryReadingStats());
  }, []);

  const refresh = useCallback(async () => {
    try {
      await repairImportedHighlightAssignments();
      const [nextBooks, nextCollections, nextMemberships, nextStats] = await Promise.all([
        listBooks(), listBookCollections(), listBookCollectionMemberships(), getLibraryReadingStats(),
      ]);
      setBooks(nextBooks);
      setCollections(nextCollections);
      setCollectionIdsByBook(nextMemberships);
      setReadingStats(nextStats);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not open the private library.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const syncWebsite = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      await syncPublicBooks(await loadPublicBooks());
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sync website books.');
    } finally {
      setSyncing(false);
    }
  }, [refresh]);

  const importBook = useCallback(async (attachToBookId?: string) => {
    const imported = await importBookFile();
    if (!imported) return null;
    try {
      let book: Book;
      if (attachToBookId) {
        book = await attachBookFile(attachToBookId, imported);
      } else {
        const input: NewBook = { ...imported, title: imported.suggestedTitle, author: '' };
        book = await addBook(input);
      }
      await refresh();
      return book;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not import that book.');
      throw cause;
    }
  }, [refresh]);

  const importKindle = useCallback(async () => {
    const imported = await pickKindleImport();
    if (!imported) return null;
    try {
      const result = await importKindleLibrary(imported);
      await refresh();
      return result;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not import Kindle history.');
      throw cause;
    }
  }, [refresh]);

  const editBook = useCallback(async (bookId: string, fields: Parameters<typeof updateBook>[1]) => {
    const book = await updateBook(bookId, fields);
    await refresh();
    return book;
  }, [refresh]);

  const deleteBook = useCallback(async (bookId: string) => {
    await removeBook(bookId);
    await refresh();
  }, [refresh]);

  const savePosition = useCallback(async (bookId: string, position: Parameters<typeof saveReadingPosition>[1]) => {
    await saveReadingPosition(bookId, position);
    setBooks((current) => current.map((book) => book.id === bookId
      ? { ...book, ...position, progress: position.progress, lastOpenedAt: new Date().toISOString(),
        readingStatus: position.progress >= 0.995 ? 'finished' : position.progress > 0 ? 'reading' : 'unread' }
      : book));
  }, []);

  const createCollection = useCallback(async (name: string) => {
    const collection = await addBookCollection(name);
    setCollections((current) => current.some((item) => item.id === collection.id) ? current : [...current, collection]);
    return collection;
  }, []);

  const toggleCollection = useCallback(async (bookId: string, collectionId: string, included: boolean) => {
    await setBookInCollection(bookId, collectionId, included);
    setCollectionIdsByBook((current) => ({
      ...current,
      [bookId]: included
        ? [...new Set([...(current[bookId] ?? []), collectionId])]
        : (current[bookId] ?? []).filter((id) => id !== collectionId),
    }));
  }, []);

  const value = useMemo<BooksContextValue>(() => ({
    books, collections, collectionIdsByBook, loading, syncing, error, readingStats, refresh, refreshReadingStats,
    syncWebsite, importBook, importKindle, editBook, deleteBook, savePosition,
    annotationsFor: listBookAnnotations, addAnnotation: addBookAnnotation, deleteAnnotation: removeBookAnnotation,
    createCollection, collectionIdsFor: listBookCollectionIds, toggleCollection,
    dismissError: () => setError(null),
  }), [books, collections, collectionIdsByBook, loading, syncing, error, readingStats, refresh, refreshReadingStats,
    syncWebsite, importBook, importKindle, editBook, deleteBook, savePosition, createCollection, toggleCollection]);

  return <BooksContext.Provider value={value}>{children}</BooksContext.Provider>;
}

export function useBooks(): BooksContextValue {
  const value = useContext(BooksContext);
  if (!value) throw new Error('useBooks must be used inside BooksProvider.');
  return value;
}
