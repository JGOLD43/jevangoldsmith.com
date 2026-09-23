import lengths from '../../../data/book-reading-lengths.json';
import { consumptionTime } from './library-time';

const editions = lengths as Record<string, { pages: number; source: string }>;
export function bookConsumptionTime(book: { title: string; isbn?: string | null }) {
  const edition = book.isbn ? editions[book.isbn] : undefined;
  return { ...consumptionTime({ kind: 'book', title: book.title, pages: edition?.pages }), source: edition?.source };
}
