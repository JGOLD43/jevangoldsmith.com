import { loadPeopleData } from './people-data';
import { initPeopleDetail } from './people-detail';
import { applyPeopleSourceFilter, registerPeopleFilterActions } from './people-filter';
import { createCollectionRuntime } from './collection-runtime';

let peopleRuntime: AnyObj = null;
let peopleById = new Map<string, AnyObj>();

async function loadPeopleCards() {
    const grid = document.getElementById('people-grid');
    if (!grid) return;
    peopleById = await loadPeopleData();
}

async function initPeoplePage() {
    peopleRuntime = createCollectionRuntime({
        actions: {
            clearSearch: 'clearPeopleSearch',
            filter: 'filterByCategory',
            search: 'filterPeople',
            toggleSidebar: 'togglePeopleSidebar'
        },
        allButtonSelector: '[data-action="filterByCategory"][data-action-args="all"]',
        buttonSelector: '.sidebar-category',
        cardSelector: '.person-card',
        categoryMode: 'exact',
        counterId: 'people-count',
        layoutId: 'people-layout',
        searchClearButtonId: 'people-search-clear-btn',
        searchClearDisplay: 'block',
        searchInputId: 'people-search',
        sidebarId: 'people-sidebar',
        storageKey: 'people-sidebar-collapsed',
        onRender: applyPeopleSourceFilter,
        useDisplayStyle: true
    });
    await loadPeopleCards();
    registerPeopleFilterActions(() => peopleRuntime);
    peopleRuntime.init();
    initPeopleDetail(() => peopleById);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initPeoplePage().catch((error) => console.error('Error loading people:', error));
    });
} else {
    initPeoplePage().catch((error) => console.error('Error loading people:', error));
}

export {};
