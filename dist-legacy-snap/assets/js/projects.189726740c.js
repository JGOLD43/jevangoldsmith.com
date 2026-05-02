window.JGTaskList.create({
    actions: {
        clearSearch: 'clearProjectSearch',
        filter: 'filterProjects',
        search: 'searchProjects',
        toggleDropdown: 'toggleProjectListDropdown',
        toggleSidebar: 'toggleProjectSidebar'
    },
    cardSelector: '.project-card',
    counterId: 'project-count',
    gridId: 'projects-container',
    layoutId: 'projects-layout',
    searchClearButtonId: 'project-search-clear-btn',
    searchInputId: 'project-search',
    sidebarId: 'projects-sidebar',
    storageKey: 'projects-sidebar-collapsed',
    zoomEvent: 'project_open'
});
