const LETTERBOXD_USERNAME = 'contentwatch';
const collectionControllerFactory = window.JGCollectionController;
const dataFetch = window.JGDataFetch;
const movieMetadata = {
    'What Dreams May Come': { genre: 'Drama', timesWatched: 1 },
    'Before Sunset': { genre: 'Romance', timesWatched: 1 },
    'Before Sunrise': { genre: 'Romance', timesWatched: 1 },
    'Lawrence of Arabia': { genre: 'Drama', timesWatched: 2 },
    "Breakfast at Tiffany's": { genre: 'Romance', timesWatched: 2 },
    'The Place Beyond the Pines': { genre: 'Drama', timesWatched: 1 }
};

const collectionUi = window.JGCollectionUI;
const movieFilters = window.JGLetterboxdFilters;
const movieModal = window.JGLetterboxdModal.create();
const movieRender = window.JGLetterboxdRender;
const movieState = window.JGLetterboxdState.create();
const movieView = window.JGLetterboxdView;
let collectionController = null;

function getFilteredMovies() {
    return movieFilters.filterMovies(movieState.getMovies(), movieState.get());
}

function getVisibleMovies() {
    return movieFilters.getMoviesForGenre(getFilteredMovies(), movieState.get().activeGenre);
}

function renderFromState() {
    collectionController?.render();
}

function buildCollectionController() {
    collectionController = collectionControllerFactory.create({
        getState: () => movieState.get(),
        getFilteredItems: () => getFilteredMovies(),
        getVisibleItems: (filteredMovies, state) => movieFilters.getMoviesForGenre(filteredMovies, state.activeGenre),
        groupItems: (filteredMovies) => movieFilters.groupMoviesByGenre(filteredMovies),
        renderSidebar: (groups) => movieView.renderSidebar(groups, movieFilters),
        renderVisibleItems: (visibleMovies) => {
            movieView.setMainLoaded();
            movieRender.displayMovies(visibleMovies);
        },
        updateCount: (visibleMovies) => movieView.updateMovieCount(visibleMovies.length),
        updateControls: (state, filteredMovies) => {
            movieView.updateStarFilterDisplay(state.starFilter);
            movieView.updateTimesWatchedFilterDisplay(state.timesWatchedFilter);
            collectionUi.toggleClearButton('movie-search-clear-btn', Boolean(state.searchQuery));
            if (window.MovieStats && typeof window.MovieStats.render === 'function') {
                window.MovieStats.render(filteredMovies);
            }
        },
        group: {
            allButtonSelector: '[data-genre="all"]',
            buttonSelector: '.sidebar-category',
            panelForValue: (genre) => genre === 'all' ? null : document.getElementById(`genre-${movieFilters.normalizeGenreKey(genre)}`),
            panelSelector: '.genre-movies'
        },
        searchClearButtonId: 'movie-search-clear-btn',
        searchInputId: 'movie-search',
        sidebar: {
            storageKey: 'movies-sidebar-collapsed',
            layoutId: 'movies-layout',
            sidebarId: 'movies-sidebar',
            defaultCollapsed: true
        }
    });
}

function normalizeMovieData(movie) {
    return movieRender.normalizeMovieData(movie, movieMetadata);
}

function parseMovieData(item) {
    return movieRender.parseMovieData(item, movieMetadata);
}

async function loadCachedMovies() {
    const movies = await dataFetch.fetchJson('data/movies.json');
    if (!Array.isArray(movies) || movies.length === 0) {
        throw new Error('Cached movie data is empty');
    }

    return movies.map(normalizeMovieData);
}

function shouldFetchLiveLetterboxd() {
    return new URLSearchParams(window.location.search).get('source') === 'live';
}

function setMovies(movies) {
    movieState.setMovies(movies.map(normalizeMovieData));
    renderFromState();
}

async function fetchLiveLetterboxdMovies() {
    const rssUrl = `https://letterboxd.com/${LETTERBOXD_USERNAME}/rss/`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`;
    const response = await fetch(proxyUrl);

    if (!response.ok) {
        throw new Error('Failed to fetch RSS feed');
    }

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    if (xmlDoc.querySelector('parsererror')) {
        throw new Error('Error parsing RSS feed');
    }

    const items = Array.from(xmlDoc.querySelectorAll('item')).slice(0, 20);
    if (items.length === 0) {
        throw new Error('No movies found in feed');
    }

    const movieItems = items.map((item) => {
        const getElementText = (tagName) => {
            const el = item.querySelector(tagName);
            return el ? el.textContent : '';
        };

        const categories = Array.from(item.querySelectorAll('category')).map((cat) => cat.textContent);
        const genre = categories.length > 0 ? categories[0] : 'Uncategorized';

        return {
            description: getElementText('description'),
            genre,
            link: getElementText('link'),
            pubDate: getElementText('pubDate'),
            title: getElementText('title')
        };
    });

    const movies = movieItems
        .filter((item) => item.description && !item.title.includes('created a list'))
        .map(parseMovieData);

    if (movies.length === 0) {
        throw new Error('No watch entries found in feed');
    }

    return movies;
}

async function fetchLetterboxdMovies() {
    try {
        const cachedMovies = await loadCachedMovies();
        setMovies(cachedMovies);
        if (!shouldFetchLiveLetterboxd()) return;
    } catch (cacheError) {
        console.warn('Cached movie data unavailable, trying Letterboxd feed:', cacheError);
    }

    try {
        const liveMovies = await fetchLiveLetterboxdMovies();
        setMovies(liveMovies);
    } catch (error) {
        console.warn('Letterboxd feed unavailable, trying cached movies:', error);
        try {
            const fallbackMovies = await loadCachedMovies();
            setMovies(fallbackMovies);
        } catch (fallbackError) {
            console.error('Error loading movie data:', fallbackError);
            movieView.setError();
        }
    }
}

function searchMovies(query) {
    movieState.setSearchQuery(query);
    movieState.setActiveGenre('all');
    collectionController?.resetGrouping();
    renderFromState();
}

function clearMovieSearch() {
    collectionController?.clearSearchInput();
    movieState.clearSearchQuery();
    movieState.setActiveGenre('all');
    collectionController?.resetGrouping();
    renderFromState();
}

function setStarFilter(rating) {
    movieState.setStarFilter(rating);
    movieState.setActiveGenre('all');
    collectionController?.resetGrouping();
    renderFromState();
}

function clearStarFilter() {
    movieState.clearStarFilter();
    movieState.setActiveGenre('all');
    collectionController?.resetGrouping();
    renderFromState();
}

function setTimesWatchedFilter(count) {
    movieState.setTimesWatchedFilter(count);
    movieState.setActiveGenre('all');
    collectionController?.resetGrouping();
    renderFromState();
}

function clearTimesWatchedFilter() {
    movieState.clearTimesWatchedFilter();
    movieState.setActiveGenre('all');
    collectionController?.resetGrouping();
    renderFromState();
}

function toggleMovieGenre(genre, event) {
    const button = event?.target?.closest('.sidebar-category');
    collectionController?.toggleGroup({
        value: genre,
        button,
        onCollapse: () => {
            movieState.setActiveGenre('all');
        },
        onExpand: () => {
            movieState.setActiveGenre(genre);
        }
    });
}

function scrollToMovie(movieTitle, event) {
    event?.preventDefault();
    movieView.scrollToMovie(movieTitle, event);
}

function clearAllFilters() {
    collectionController?.clearSearchInput();
    movieState.clearSearchQuery();
    movieState.clearStarFilter();
    movieState.clearTimesWatchedFilter();
    movieState.setActiveGenre('all');
    collectionController?.resetGrouping();
    renderFromState();
}

function toggleSidebar() {
    const isCollapsed = collectionController?.toggleSidebar();
    movieState.setSidebarCollapsed(isCollapsed);
}

function restoreSidebarState() {
    const isCollapsed = collectionController?.restoreSidebar();
    movieState.setSidebarCollapsed(isCollapsed);
}

function toggleListDropdown() {
    collectionController?.toggleListDropdown();
}

function openMovieModal(movieData) {
    movieModal.open(movieData);
}

function closeMovieModal() {
    movieModal.close();
}

function openMovieByTitle(movieTitle) {
    const movie = movieState.getMovies().find((entry) => entry.title === movieTitle && entry.review);
    if (!movie) return;
    openMovieModal(movie);
}

function initMoviesZoom() {
    const moviesGrid = document.getElementById('movies-container');
    if (!moviesGrid || !window.JGGridZoom) return;

    moviesGrid.classList.add('js-zoom-grid');
    window.JGGridZoom.init({
        eventName: 'movie_open',
        grid: moviesGrid,
        itemSelector: '.movie-card.has-review',
        triggerSelector: '.movie-card.has-review'
    });
}

window.searchMovies = searchMovies;
window.clearMovieSearch = clearMovieSearch;
window.clearAllFilters = clearAllFilters;
window.toggleMovieGenre = toggleMovieGenre;
window.scrollToMovie = scrollToMovie;
window.toggleSidebar = toggleSidebar;
window.toggleListDropdown = toggleListDropdown;
window.closeMovieModal = closeMovieModal;

document.addEventListener('DOMContentLoaded', () => {
    buildCollectionController();
    restoreSidebarState();
        window.JGLetterboxdEvents.bind({
            clearTimesWatchedFilter,
            closeMovieModal,
            setStarFilter,
            setTimesWatchedFilter
        });
    fetchLetterboxdMovies();
    initMoviesZoom();
});
