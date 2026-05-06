import { renderSpotifyFollowedShows, renderSpotifyRecentEpisodes } from './podcasts-spotify';
import { init as initGridZoom } from './grid-zoom';
import { createCollectionRuntime } from './collection-runtime';

let podcastRuntime: AnyObj = null;

function buildCollectionController() {
    podcastRuntime = createCollectionRuntime({
        actions: {
            clearSearch: 'clearPodcastSearch',
            filter: 'filterPodcasts',
            search: 'searchPodcasts',
            toggleDropdown: 'togglePodcastListDropdown',
            toggleSidebar: 'togglePodcastSidebar'
        },
        allButtonSelector: '.sidebar-category[data-podcast-category="all"]',
        buttonSelector: '.sidebar-category',
        cardSelector: '.podcast-card',
        categoryMode: 'exact',
        counterId: 'podcast-count',
        layoutId: 'podcasts-layout',
        searchClearButtonId: 'podcast-search-clear-btn',
        searchInputId: 'podcast-search',
        sidebarId: 'podcasts-sidebar',
        storageKey: 'podcasts-sidebar-collapsed'
    });
}

async function initPodcastsPage() {
    buildCollectionController();
    podcastRuntime.init();

    const grid = document.getElementById('podcasts-container');
    if (grid) {
        grid.classList.add('js-zoom-grid');
        initGridZoom({
            grid: grid,
            itemSelector: '.podcast-card',
            triggerSelector: '.podcast-card',
            eventName: 'podcast_open'
        });
    }

    renderSpotifyRecentEpisodes();
    renderSpotifyFollowedShows();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPodcastsPage, { once: true });
} else {
    initPodcastsPage();
}

export {};
