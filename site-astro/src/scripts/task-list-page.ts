import { createCollectionRuntime } from './collection-runtime';
import { initCoverFlight } from './cover-flight';

interface TaskListFlightConfig {
  cardSelector: string;
  coverSelector: string;
  detailMainSelector: string;
  detailHeroImgSelector: string;
  bodyLaunchClass: string;
  arrivalKey: string;
  listingBackSelectors: string[];
}

interface TaskListPageConfig {
  actions: {
    clearSearch: string;
    filter: string;
    search: string;
    toggleDropdown: string;
    toggleSidebar: string;
  };
  cardSelector: string;
  counterId: string;
  gridId: string;
  layoutId: string;
  searchClearButtonId: string;
  searchInputId: string;
  sidebarId: string;
  storageKey: string;
  flight: TaskListFlightConfig;
}

export function initTaskListPage(config: TaskListPageConfig) {
  const runtime = createCollectionRuntime({
    actions: config.actions,
    buttonSelector: '.sidebar-category',
    cardSelector: config.cardSelector,
    counterId: config.counterId,
    gridId: config.gridId,
    layoutId: config.layoutId,
    searchClearButtonId: config.searchClearButtonId,
    searchInputId: config.searchInputId,
    sidebarId: config.sidebarId,
    storageKey: config.storageKey
  });

  const start = () => {
    runtime.init();
    const grid = document.getElementById(config.gridId);
    if (!grid) return;
    initCoverFlight({ grid, ...config.flight });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}
