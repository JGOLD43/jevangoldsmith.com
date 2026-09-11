interface ReadingYearRecord {
    read?: boolean | null;
    readYears?: unknown;
}

// Reading years are recorded separately from a book's publication year.
// A reread can place the same book in more than one year.
export function bookReadingYears(book: ReadingYearRecord): number[] {
    if (book.read === false || !Array.isArray(book.readYears)) return [];
    return [...new Set(book.readYears.filter((year): year is number =>
        typeof year === 'number' && Number.isInteger(year) && year >= 1000 && year <= 9999
    ))];
}

export function availableReadingYears(books: ReadingYearRecord[]): number[] {
    return [...new Set(books.flatMap(bookReadingYears))].sort((a, b) => b - a);
}

export function matchesReadingYear(book: ReadingYearRecord, year: string): boolean {
    return year === 'all' || bookReadingYears(book).includes(Number(year));
}

export function readingYearFromUrl(years: number[]): string {
    const value = new URLSearchParams(window.location.search).get('year');
    return value && years.some((year) => String(year) === value) ? value : 'all';
}

export function updateReadingYearUrl(year: string) {
    const url = new URL(window.location.href);
    if (year === 'all') url.searchParams.delete('year');
    else url.searchParams.set('year', year);
    window.history.replaceState(window.history.state, '', url);
}
