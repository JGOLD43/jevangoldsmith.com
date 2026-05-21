import { bookCoverUrl } from '../lib/book-card';
import type { Book } from '../content.config';

export interface BooksState {
    activeCategory: string;
    books: Book[];
    reReadsFilter: string;
    searchQuery: string;
    sidebarCollapsed: boolean;
    starFilter: string;
    viewMode: string;
}

export const state: BooksState = {
    activeCategory: 'all',
    books: [],
    reReadsFilter: 'all',
    searchQuery: '',
    sidebarCollapsed: true,
    starFilter: 'all',
    viewMode: 'list'
};

export let booksRuntime: AnyObj = null;
export function setBooksRuntime(runtime: AnyObj) {
    booksRuntime = runtime;
}

export const categoryDisplayNames: Record<string, string> = {
    'Advertising and Copywriting': 'Advertising',
    'Astral Projection': 'Astral projection',
    'Autobiographies': 'Autobiographies',
    'Big Ideas': 'Big Ideas',
    'Copywriting': 'Copywriting',
    'The Great Books': 'The Great Books',
    'Lee Kuan Yew': 'Lee Kuan Yew',
    'Learning': 'Learning',
    'Mental Endurance': 'Mental Endurance',
    'Out of the Box Thinking': 'Out Of The Box Thinking',
    'Patience and Clear Thinking': 'Patience & Clear Thinking',
    'Persuasion': 'Persuasion',
    'Psychology Books': 'Psychology',
    'Science': 'Science',
    'Storytelling': 'Storytelling',
    'Strategy and War': 'Strategy',
    'Who Am I?': 'Who Am I?'
};

export function getCoverUrl(bookOrIsbn: AnyObj, size: 'medium' | 'large' = 'large'): string | null {
    if (!bookOrIsbn) return null;
    if (typeof bookOrIsbn === 'object') {
        if (size === 'medium' && bookOrIsbn.coverImageMedium) return bookOrIsbn.coverImageMedium;
        if (bookOrIsbn.coverImage) return bookOrIsbn.coverImage;
        return bookCoverUrl(bookOrIsbn, size) || null;
    }
    const cleanIsbn = String(bookOrIsbn).replace(/[^0-9X]/gi, '');
    return cleanIsbn ? `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-${size === 'medium' ? 'M' : 'L'}.jpg` : null;
}
