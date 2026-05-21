// Generic shape for collection-page state. Each collection page (books,
// essays, letterboxd, movie-stats, ...) intersects this with its own
// filter fields. Single source of truth; renames propagate via TS errors
// instead of silently breaking renders across pages.
//
// Usage:
//   interface BooksState extends CollectionState<Book> {
//     starFilter: string;
//     reReadsFilter: string;
//   }

export interface CollectionState<TItem> {
    activeCategory: string;
    items: TItem[];
    searchQuery: string;
    sidebarCollapsed: boolean;
    viewMode: string;
}
