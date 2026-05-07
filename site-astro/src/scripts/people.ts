import { loadPeopleModalData, preloadPeopleModalData } from './people-data';
import { initPeopleDetail } from './people-detail';
import { applyPeopleSourceFilter, registerPeopleFilterActions } from './people-filter';
import { createCollectionRuntime } from './collection-runtime';

let peopleRuntime: AnyObj = null;

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
    registerPeopleFilterActions(() => peopleRuntime);
    peopleRuntime.init();
    initPeopleDetail(loadPeopleModalData);
    // Warm the modal-data cache during idle so the first card-click modal
    // opens against a hit, not a network request.
    const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => void };
    if (typeof w.requestIdleCallback === 'function') {
        w.requestIdleCallback(preloadPeopleModalData, { timeout: 2500 });
    } else {
        setTimeout(preloadPeopleModalData, 1500);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initPeoplePage().catch((error) => console.error('Error loading people:', error));
    });
} else {
    initPeoplePage().catch((error) => console.error('Error loading people:', error));
}

export {};
