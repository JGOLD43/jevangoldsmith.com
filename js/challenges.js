window.JGTaskList.create({
    actions: {
        clearSearch: 'clearChallengeSearch',
        filter: 'filterChallenges',
        search: 'searchChallenges',
        toggleDropdown: 'toggleChallengeListDropdown',
        toggleSidebar: 'toggleChallengeSidebar'
    },
    cardSelector: '.challenge-card',
    counterId: 'challenge-count',
    gridId: 'challenges-container',
    layoutId: 'challenges-layout',
    searchClearButtonId: 'challenge-search-clear-btn',
    searchInputId: 'challenge-search',
    sidebarId: 'challenges-sidebar',
    storageKey: 'challenges-sidebar-collapsed',
    zoomEvent: 'challenge_open'
});
