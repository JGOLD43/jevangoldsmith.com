(function () {
    function create(initialState = {}) {
        const state = {
            activeCategory: 'all',
            books: [],
            reReadsFilter: 'all',
            searchQuery: '',
            sidebarCollapsed: true,
            starFilter: 'all',
            viewMode: 'list',
            ...initialState
        };

        return {
            clearReReadsFilter() {
                state.reReadsFilter = 'all';
            },
            clearSearchQuery() {
                state.searchQuery = '';
            },
            clearStarFilter() {
                state.starFilter = 'all';
            },
            get() {
                return { ...state };
            },
            getBooks() {
                return state.books;
            },
            setActiveCategory(category) {
                state.activeCategory = category || 'all';
            },
            setBooks(books) {
                state.books = Array.isArray(books) ? books : [];
            },
            setReReadsFilter(count) {
                state.reReadsFilter = count;
            },
            setSearchQuery(query) {
                state.searchQuery = String(query || '').trim();
            },
            setSidebarCollapsed(collapsed) {
                state.sidebarCollapsed = Boolean(collapsed);
            },
            setStarFilter(rating) {
                state.starFilter = rating;
            },
            setViewMode(mode) {
                state.viewMode = mode || 'list';
            }
        };
    }

    window.JGBooksState = {
        create
    };
}());
