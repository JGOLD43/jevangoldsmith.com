(function () {
    function create(initialState = {}) {
        const state = {
            activeCategory: 'all',
            currentIndex: 0,
            essays: [],
            filteredEssays: [],
            searchTerm: '',
            sidebarCollapsed: false,
            ...initialState
        };

        return {
            clearSearchTerm() {
                state.searchTerm = '';
            },
            get() {
                return {
                    ...state,
                    essays: [...state.essays],
                    filteredEssays: [...state.filteredEssays]
                };
            },
            getCurrentEssay() {
                return state.filteredEssays[state.currentIndex] || null;
            },
            setActiveCategory(category) {
                state.activeCategory = category || 'all';
            },
            setCurrentIndex(index) {
                state.currentIndex = index;
            },
            setEssays(essays) {
                state.essays = Array.isArray(essays) ? essays : [];
            },
            setFilteredEssays(essays) {
                state.filteredEssays = Array.isArray(essays) ? essays : [];
            },
            setSearchTerm(term) {
                state.searchTerm = String(term || '').trim().toLowerCase();
            },
            setSidebarCollapsed(collapsed) {
                state.sidebarCollapsed = Boolean(collapsed);
            }
        };
    }

    window.JGEssaysState = {
        create
    };
}());
