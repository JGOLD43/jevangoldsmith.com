(function () {
    function create(initialState = {}) {
        const state = {
            activeGenre: 'all',
            movies: [],
            searchQuery: '',
            sidebarCollapsed: true,
            starFilter: 'all',
            timesWatchedFilter: 'all',
            ...initialState
        };

        return {
            clearSearchQuery() {
                state.searchQuery = '';
            },
            clearStarFilter() {
                state.starFilter = 'all';
            },
            clearTimesWatchedFilter() {
                state.timesWatchedFilter = 'all';
            },
            get() {
                return { ...state };
            },
            getMovies() {
                return state.movies;
            },
            setActiveGenre(genre) {
                state.activeGenre = genre || 'all';
            },
            setMovies(movies) {
                state.movies = Array.isArray(movies) ? movies : [];
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
            setTimesWatchedFilter(count) {
                state.timesWatchedFilter = count;
            }
        };
    }

    window.JGLetterboxdState = {
        create
    };
}());
