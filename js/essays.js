const collectionUi = window.JGCollectionUI;
const dataFetch = window.JGDataFetch;
const essaysFilters = window.JGEssaysFilters;
const essaysState = window.JGEssaysState.create();
const essaysView = window.JGEssaysView;
let essaysRuntime = null;

async function loadEssays() {
    try {
        const data = await dataFetch.fetchJson('data/essays.json');
        const publishedEssays = data.essays
            .filter((essay) => essay.status === 'published')
            .sort((left, right) => new Date(right.date) - new Date(left.date));

        essaysState.setEssays(publishedEssays);
        essaysState.setFilteredEssays(publishedEssays);
        renderFromState();
    } catch (error) {
        console.error('Error loading essays:', error);
        essaysView.showErrorMessage();
    }
}

function getDerivedEssays() {
    const state = essaysState.get();
    const categoryFiltered = essaysFilters.filterByCategory(state.essays, state.activeCategory);
    return essaysFilters.filterBySearch(categoryFiltered, state.searchTerm);
}

function getVisibleEssayState(filteredEssays) {
    const state = essaysState.get();
    const currentIndex = Math.max(0, Math.min(state.currentIndex, Math.max(filteredEssays.length - 1, 0)));
    essaysState.setFilteredEssays(filteredEssays);
    essaysState.setCurrentIndex(currentIndex);
    return {
        essays: filteredEssays,
        currentIndex
    };
}

function renderFromState() {
    essaysRuntime?.render();
}

function buildCollectionController() {
    essaysRuntime = window.JGCollectionRuntime.create({
        getState: () => essaysState.get(),
        getFilteredItems: () => getDerivedEssays(),
        getVisibleItems: (filteredEssays) => getVisibleEssayState(filteredEssays),
        renderSidebar: () => essaysView.renderSidebar(essaysFilters.groupByCategory(essaysState.get().essays)),
        groupItems: () => essaysFilters.groupByCategory(essaysState.get().essays),
        renderVisibleItems: (visibleState) => essaysView.renderCurrentEssay(visibleState.essays, visibleState.currentIndex),
        updateCount: (visibleState) => essaysView.updateEssayCount(visibleState.essays.length),
        updateControls: (state) => collectionUi.toggleClearButton('search-clear-btn', Boolean(state.searchTerm), 'block'),
        group: {
            allButtonSelector: '[data-action="toggleCategory"][data-action-args="all"]',
            buttonSelector: '.sidebar-category',
            panelForValue: (category) => category === 'all' ? null : document.getElementById(`category-${category}`),
            panelSelector: '.category-essays'
        },
        searchClearButtonId: 'search-clear-btn',
        searchInputId: 'essay-search',
        storageKey: 'essays-sidebar-collapsed',
        layoutId: 'essays-layout',
        sidebarId: 'essays-sidebar',
        defaultCollapsed: false
    });
}

function toggleCategory(category, event) {
    const button = event?.target?.closest('.sidebar-category');
    const panel = category === 'all' ? null : document.getElementById(`category-${category}`);

    essaysRuntime?.toggleGroup({
        value: category,
        button,
        panel,
        onCollapse: () => {
            essaysState.setActiveCategory('all');
            essaysState.setCurrentIndex(0);
        },
        onExpand: () => {
            essaysState.setActiveCategory(category);
            essaysState.setCurrentIndex(0);
        }
    });
}

const searchEssays = collectionUi.debounce((term) => {
    essaysState.setSearchTerm(term);
    essaysState.setActiveCategory('all');
    essaysState.setCurrentIndex(0);
    essaysRuntime?.resetGrouping();
    renderFromState();
});

function clearEssaySearch() {
    essaysRuntime?.clearSearchInput();
    essaysState.clearSearchTerm();
    essaysState.setActiveCategory('all');
    essaysState.setCurrentIndex(0);
    essaysRuntime?.resetGrouping();
    renderFromState();
}

function prevEssay() {
    const state = essaysState.get();
    if (state.currentIndex <= 0) return;
    essaysState.setCurrentIndex(state.currentIndex - 1);
    renderFromState();
    essaysView.scrollToTop();
}

function nextEssay() {
    const state = essaysState.get();
    if (state.currentIndex >= state.filteredEssays.length - 1) return;
    essaysState.setCurrentIndex(state.currentIndex + 1);
    renderFromState();
    essaysView.scrollToTop();
}

function scrollToEssay(essayId, event) {
    event?.preventDefault();

    const state = essaysState.get();
    const filteredIndex = essaysFilters.findEssayIndex(state.filteredEssays, essayId);
    if (filteredIndex >= 0) {
        essaysState.setCurrentIndex(filteredIndex);
        renderFromState();
        essaysView.scrollToTop();
        return;
    }

    const fullIndex = essaysFilters.findEssayIndex(state.essays, essayId);
    if (fullIndex < 0) return;

    essaysState.setActiveCategory('all');
    essaysState.setCurrentIndex(fullIndex);
    essaysRuntime?.resetGrouping();
    renderFromState();
    essaysView.scrollToTop();
}

function toggleEssaysSidebar() {
    const isCollapsed = essaysRuntime?.toggleSidebar();
    essaysState.setSidebarCollapsed(isCollapsed);
}

function restoreSidebarState() {
    const isCollapsed = essaysRuntime?.restoreSidebar();
    essaysState.setSidebarCollapsed(isCollapsed);
}

function toggleListDropdown() {
    essaysRuntime?.toggleListDropdown();
}

window.JGActions.register({
    clearEssaySearch,
    nextEssay,
    prevEssay,
    scrollToEssay,
    searchEssays,
    toggleCategory,
    toggleEssaysSidebar,
    toggleListDropdown
});

document.addEventListener('DOMContentLoaded', () => {
    buildCollectionController();
    restoreSidebarState();
    document.addEventListener('click', (event) => {
        essaysRuntime?.closeDropdownOnOutsideClick(event);
    });
    loadEssays();
});
