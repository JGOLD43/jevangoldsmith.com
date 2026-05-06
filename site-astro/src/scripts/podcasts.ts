import { renderSpotifyFollowedShows, renderSpotifyRecentEpisodes } from './podcasts-spotify';

let podcastRuntime: AnyObj = null;

function buildCollectionController() {
    podcastRuntime = window.JGCollectionRuntime.create({
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
    if (grid && window.JGGridZoom) {
        grid.classList.add('js-zoom-grid');
        window.JGGridZoom.init({
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
