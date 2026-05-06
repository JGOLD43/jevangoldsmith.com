import { escapeHtml as escapeHTML } from '../lib/html-escape';
import { init as initGridZoom } from './grid-zoom';
import { installEscapeCloser, bindStarRatingDrag } from './collection-helpers';
import { fetchJson } from './data-fetch';
import { createCollectionRuntime } from './collection-runtime';
import {
    closeDropdownOnOutsideClick as closeDropdownOnOutsideClickShared,
    highlightAndScroll,
    toggleClearButton
} from './collection-ui';
import { registerActions } from './action-dispatcher';
// Movies/letterboxd page orchestrator. Inlines js/letterboxd-state.js,
// js/letterboxd-filters.js, js/letterboxd-modal.js, js/letterboxd-events.js,
// js/letterboxd-render.js, js/letterboxd-view.js — those shards only ever
// exposed window.JGLetterboxd* globals consumed here.

let linkedMovieHandled = false;
const movieMetadata: Record<string, AnyObj> = {
    'What Dreams May Come': { genre: 'Drama', timesWatched: 1 },
    'Before Sunset': { genre: 'Romance', timesWatched: 1 },
    'Before Sunrise': { genre: 'Romance', timesWatched: 1 },
    'Lawrence of Arabia': { genre: 'Drama', timesWatched: 2 },
    "Breakfast at Tiffany's": { genre: 'Romance', timesWatched: 2 },
    'The Place Beyond the Pines': { genre: 'Drama', timesWatched: 1 }
};

// --- state ---
const movieState = (function createState() {
    const state: { activeGenre: string; movies: AnyObj[]; searchQuery: string; sidebarCollapsed: boolean; starFilter: string; timesWatchedFilter: string } = {
        activeGenre: 'all',
        movies: [],
        searchQuery: '',
        sidebarCollapsed: true,
        starFilter: 'all',
        timesWatchedFilter: 'all'
    };
    return {
        clearSearchQuery() { state.searchQuery = ''; },
        clearStarFilter() { state.starFilter = 'all'; },
        clearTimesWatchedFilter() { state.timesWatchedFilter = 'all'; },
        get() { return { ...state }; },
        getMovies() { return state.movies; },
        setActiveGenre(g: string) { state.activeGenre = g || 'all'; },
        setMovies(m: AnyObj[]) { state.movies = Array.isArray(m) ? m : []; },
        setSearchQuery(q: string) { state.searchQuery = String(q || '').trim(); },
        setSidebarCollapsed(v: boolean) { state.sidebarCollapsed = Boolean(v); },
        setStarFilter(r: string) { state.starFilter = r; },
        setTimesWatchedFilter(c: string) { state.timesWatchedFilter = c; }
    };
}());

// --- filters ---
function normalizeGenreKey(genre: unknown): string {
    return String(genre || 'Uncategorized').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function filterMoviesData(movies: AnyObj[], state: AnyObj): AnyObj[] {
    const query = String(state.searchQuery || '').toLowerCase();
    return movies.filter((movie) => {
        if (query) {
            const matchesQuery = [movie.title, movie.genre || '', movie.year ? String(movie.year) : '']
                .some((value) => String(value).toLowerCase().includes(query));
            if (!matchesQuery) return false;
        }
        if (state.starFilter !== 'all' && Number(movie.starCount) < Number(state.starFilter)) return false;
        if (state.timesWatchedFilter !== 'all' && Number(movie.timesWatched) < Number(state.timesWatchedFilter)) return false;
        return true;
    });
}

function getMoviesForGenre(movies: AnyObj[], genre: string) {
    if (genre === 'all') return movies;
    return movies.filter((movie) => movie.genre === genre);
}

function groupMoviesByGenre(movies: AnyObj[]) {
    return movies.reduce((groups, movie) => {
        const genre = movie.genre || 'Uncategorized';
        if (!groups[genre]) groups[genre] = [];
        groups[genre].push(movie);
        return groups;
    }, {});
}

const movieFilters = {
    filterMovies: filterMoviesData,
    getMoviesForGenre,
    groupMoviesByGenre,
    normalizeGenreKey
};

// --- modal ---
function createMovieModal() {
    function close() {
        const modal = document.getElementById('movie-modal');
        if (!modal) return;
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    function open(movieData: AnyObj) {
        const modal = document.getElementById('movie-modal');
        if (!modal) return false;
        (document.getElementById('modal-movie-title') as HTMLElement).textContent = movieData.title;
        (document.getElementById('modal-movie-year') as HTMLElement).textContent = movieData.year || '';
        (document.getElementById('modal-movie-rating') as HTMLElement).textContent = movieData.rating || '';
        (document.getElementById('modal-movie-date') as HTMLElement).textContent = `Watched: ${movieData.date}`;
        (document.getElementById('modal-movie-review') as HTMLElement).textContent = movieData.review || 'No review available.';
        (document.getElementById('modal-letterboxd-link') as HTMLAnchorElement).href = movieData.link;
        const posterImg = document.getElementById('modal-movie-poster') as HTMLImageElement | null;
        if (movieData.poster && posterImg) {
            posterImg.src = movieData.poster;
            posterImg.alt = movieData.title;
            posterImg.style.display = 'block';
        } else if (posterImg) {
            posterImg.style.display = 'none';
        }
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        return true;
    }
    return { close, open };
}

// --- render ---
import { formatRuntime } from '../lib/dates';

function normalizeMovieData(movie: AnyObj) {
    const metadata = movieMetadata[movie.title] || {};
    const starCount = Number(movie.starCount || metadata.starCount || 0);
    return {
        title: movie.title || 'Untitled',
        date: movie.date || '',
        link: movie.link || '#',
        rating: movie.rating || (starCount ? `${'★'.repeat(starCount)}${'☆'.repeat(5 - starCount)}` : null),
        starCount,
        year: movie.year || null,
        poster: movie.poster || null,
        review: movie.review || null,
        shortDescription: movie.shortDescription || null,
        genre: metadata.genre || movie.genre || 'Uncategorized',
        timesWatched: Number(movie.timesWatched || metadata.timesWatched || 1),
        runtime: Number(movie.runtime || 0),
        tmdbId: movie.tmdbId || null,
        tmdbGenres: Array.isArray(movie.tmdbGenres) ? movie.tmdbGenres : [],
        overview: movie.overview || null,
        backdrop: movie.backdrop || null
    };
}

function displayMovies(movies: AnyObj[]) {
    const container = document.getElementById('movies-container');
    if (!container) return;
    const visibleTitles = new Set(movies.map((movie) => String(movie.title || '')));
    container.querySelectorAll<HTMLElement>('.movie-card').forEach((card) => {
        card.style.display = visibleTitles.has(card.dataset.movieTitle || '') ? '' : 'none';
    });
}

function parseMovieData(item: AnyObj) {
    const data: AnyObj = {
        title: item.title,
        date: new Date(item.pubDate).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        }),
        link: item.link,
        rating: null,
        starCount: 0,
        year: null,
        poster: null,
        review: null,
        shortDescription: null,
        genre: null,
        timesWatched: 1
    };
    const ratingMatch = item.title.match(/★+/);
    if (ratingMatch) {
        const stars = ratingMatch[0].length;
        data.starCount = stars;
        data.rating = '★'.repeat(stars) + '☆'.repeat(5 - stars);
    }
    const yearMatch = item.title.match(/,\s*(\d{4})/);
    if (yearMatch) {
        data.year = yearMatch[1];
        data.title = item.title.replace(/,\s*\d{4}.*$/, '').trim();
    }
    const posterMatch = item.description.match(/<img[^>]+src="([^"]+)"/);
    if (posterMatch) data.poster = posterMatch[1];
    const reviewText = item.description
        .replace(/<img[^>]*>/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/★+/g, '')
        .replace(/Watched on.*$/i, '')
        .trim();
    if (reviewText.length > 10) {
        data.review = reviewText;
        data.shortDescription = reviewText.length > 150 ? `${reviewText.substring(0, 150)}...` : reviewText;
    }
    const metadata = movieMetadata[data.title] || {};
    data.genre = metadata.genre || item.genre || 'Uncategorized';
    data.timesWatched = metadata.timesWatched || data.timesWatched;
    return data;
}

// --- view ---
function setSidebarLoaded() {
    const loadingSidebar = document.getElementById('loading-sidebar');
    const sidebarContent = document.getElementById('sidebar-content');
    const sidebarFooter = document.getElementById('sidebar-footer');
    if (loadingSidebar) loadingSidebar.style.display = 'none';
    if (sidebarContent) sidebarContent.style.display = 'block';
    if (sidebarFooter) sidebarFooter.style.display = 'block';
}

function setMainLoaded() {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const containerEl = document.getElementById('movies-container');
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';
    if (containerEl) containerEl.style.display = 'grid';
}

function setError() {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'block';
}

function renderSidebar(genreGroups: AnyObj) {
    setSidebarLoaded();
    const countAllEl = document.getElementById('count-all-movies');
    if (countAllEl) {
        const total = (Object.values(genreGroups) as AnyObj[][]).reduce((sum: number, movies) => sum + movies.length, 0);
        countAllEl.textContent = String(total);
    }
    document.querySelectorAll('#sidebar-content .sidebar-section').forEach((section) => {
        const button = section.querySelector('.sidebar-category[data-genre]') as HTMLElement | null;
        const genre = button?.dataset.genre;
        if (!genre || genre === 'all') return;
        const key = normalizeGenreKey(genre);
        const countEl = document.getElementById(`count-${key}`);
        const container = document.getElementById(`genre-${key}`);
        if (countEl) countEl.textContent = '0';
        if (container) container.innerHTML = '';
        (section as HTMLElement).style.display = 'none';
    });
    Object.keys(genreGroups).forEach((genre) => {
        const key = normalizeGenreKey(genre);
        const movies = genreGroups[genre] as AnyObj[];
        const countEl = document.getElementById(`count-${key}`);
        const section = countEl?.closest('.sidebar-section') as HTMLElement | null;
        const container = document.getElementById(`genre-${key}`);
        if (countEl) countEl.textContent = String(movies.length);
        if (section) section.style.display = movies.length === 0 ? 'none' : 'block';
        if (container) {
            container.innerHTML = movies.map((movie: AnyObj) => `
                <a href="#" class="movie-link" data-action="scrollToMovie" data-action-args="${encodeURIComponent(movie.title)}" data-action-eventobj="true">
                    <div>${escapeHTML(movie.title)}</div>
                    <div class="movie-link-year">${escapeHTML(movie.year || '')}</div>
                </a>
            `).join('');
        }
    });
}

function updateMovieCount(count: number) {
    const countElement = document.getElementById('movie-count');
    if (countElement) countElement.textContent = String(count);
}

function updateStarFilterDisplay(value: string | number) {
    const stars = document.querySelectorAll('.filter-star');
    const text = document.getElementById('filter-rating-text');
    const valNum = value === 'all' ? Number.NaN : Number(value);
    stars.forEach((star) => {
        const starNumber = Number.parseInt(star.getAttribute('data-star') || '0', 10);
        star.classList.remove('full', 'half');
        if (value === 'all') return;
        if (starNumber <= valNum) star.classList.add('full');
        else if (starNumber === valNum + 0.5) star.classList.add('half');
    });
    if (text) text.textContent = value === 'all' ? '' : (valNum >= 5 ? '★' : `${value}★+`);
}

function updateTimesWatchedFilterDisplay(value: string | number) {
    const slider = document.getElementById('timeswatched-slider') as HTMLInputElement | null;
    const text = document.getElementById('filter-timeswatched-text');
    const normalized = value === 'all' ? 0 : Number(value);
    if (slider) slider.value = String(normalized);
    if (text) text.textContent = normalized > 0 ? (normalized >= 10 ? '10' : String(normalized)) : '';
}

function scrollToMovieByTitle(movieTitle: string, event?: Event) {
    const movieCards = Array.from(document.querySelectorAll('.movie-card')) as HTMLElement[];
    const targetCard = movieCards.find((card) => card.getAttribute('data-movie-title') === movieTitle);
    if (!targetCard) return;
    highlightAndScroll(targetCard, {
        activeElement: (event?.target as Element | undefined)?.closest('.movie-link') ?? null,
        activeSelector: '.movie-link'
    });
}

const movieView = {
    renderSidebar,
    scrollToMovie: scrollToMovieByTitle,
    setError,
    setMainLoaded,
    updateMovieCount,
    updateStarFilterDisplay,
    updateTimesWatchedFilterDisplay
};

const movieRender = {
    displayMovies,
    formatRuntime,
    normalizeMovieData,
    parseMovieData
};

// --- events ---
function bindMovieEvents({ clearTimesWatchedFilter, closeMovieModal, setStarFilter, setTimesWatchedFilter }) {
    installEscapeCloser(closeMovieModal);

    document.addEventListener('click', (event) => {
        const modal = document.getElementById('movie-modal');
        if (event.target === modal) {
            closeMovieModal();
            return;
        }
        closeDropdownOnOutsideClickShared('list-dropdown', event);
    });

    bindStarRatingDrag(document, setStarFilter);

    const slider = document.getElementById('timeswatched-slider');
    if (slider) {
        slider.addEventListener('input', (event: Event) => {
            const count = Number.parseInt((event.target as HTMLInputElement).value, 10);
            if (count === 0) {
                clearTimesWatchedFilter();
                return;
            }
            setTimesWatchedFilter(count);
        });
    }
}

// --- orchestrator ---
const movieModal = createMovieModal();
let moviesRuntime: AnyObj = null;

function getFilteredMovies() {
    return movieFilters.filterMovies(movieState.getMovies(), movieState.get());
}

function renderFromState() {
    moviesRuntime?.render();
}

function buildCollectionController() {
    moviesRuntime = createCollectionRuntime({
        getState: () => movieState.get(),
        getFilteredItems: () => getFilteredMovies(),
        getVisibleItems: (filteredMovies: AnyObj[], state: AnyObj) => movieFilters.getMoviesForGenre(filteredMovies, state.activeGenre),
        groupItems: (filteredMovies: AnyObj[]) => movieFilters.groupMoviesByGenre(filteredMovies),
        renderSidebar: (groups: AnyObj) => movieView.renderSidebar(groups),
        renderVisibleItems: (visibleMovies: AnyObj[]) => {
            movieView.setMainLoaded();
            movieRender.displayMovies(visibleMovies);
        },
        updateCount: (visibleMovies: AnyObj[]) => movieView.updateMovieCount(visibleMovies.length),
        updateControls: (state: AnyObj, filteredMovies: AnyObj[]) => {
            movieView.updateStarFilterDisplay(state.starFilter);
            movieView.updateTimesWatchedFilterDisplay(state.timesWatchedFilter);
            toggleClearButton('movie-search-clear-btn', Boolean(state.searchQuery));
            if (window.MovieStats && typeof window.MovieStats.render === 'function') {
                window.MovieStats.render(filteredMovies);
            }
        },
        group: {
            allButtonSelector: '[data-genre="all"]',
            buttonSelector: '.sidebar-category',
            panelForValue: (genre: string) => genre === 'all' ? null : document.getElementById(`genre-${normalizeGenreKey(genre)}`),
            panelSelector: '.genre-movies'
        },
        searchClearButtonId: 'movie-search-clear-btn',
        searchInputId: 'movie-search',
        storageKey: 'movies-sidebar-collapsed',
        layoutId: 'movies-layout',
        sidebarId: 'movies-sidebar',
        defaultCollapsed: true
    });
}

async function loadCachedMovies() {
    const inline = document.getElementById('jg-movies-data');
    if (inline?.textContent) {
        try {
            const movies = JSON.parse(inline.textContent);
            if (Array.isArray(movies) && movies.length > 0) {
                return movies.map(normalizeMovieData);
            }
        } catch {
            // fall through to network fetch
        }
    }
    const movies = await fetchJson('data/movies.json');
    if (!Array.isArray(movies) || movies.length === 0) {
        throw new Error('Cached movie data is empty');
    }
    return movies.map(normalizeMovieData);
}

function setMovies(movies: AnyObj[]) {
    movieState.setMovies(movies.map(normalizeMovieData));
    renderFromState();
    handleLinkedMovie();
}

// runtime path is pure SSR-then-cached-fetch. The Letterboxd
// RSS proxy fetch was a CLS source (variable count → wipe + relayout)
// and racy via allorigins.win. data/movies.json is now refreshed
// nightly by .github/workflows/letterboxd-sync.yml so the cached path
// is always current.
async function fetchLetterboxdMovies() {
    try {
        const cachedMovies = await loadCachedMovies();
        setMovies(cachedMovies);
    } catch (error) {
        console.error('Error loading movie data:', error);
        movieView.setError();
    }
}

function searchMovies(query: string) {
    movieState.setSearchQuery(query);
    movieState.setActiveGenre('all');
    moviesRuntime?.resetGrouping();
    renderFromState();
}

function clearMovieSearch() {
    moviesRuntime?.clearSearchInput();
    movieState.clearSearchQuery();
    movieState.setActiveGenre('all');
    moviesRuntime?.resetGrouping();
    renderFromState();
}

function setStarFilter(rating: string) {
    movieState.setStarFilter(rating);
    movieState.setActiveGenre('all');
    moviesRuntime?.resetGrouping();
    renderFromState();
}

function setTimesWatchedFilter(count: string) {
    movieState.setTimesWatchedFilter(count);
    movieState.setActiveGenre('all');
    moviesRuntime?.resetGrouping();
    renderFromState();
}

function clearTimesWatchedFilter() {
    movieState.clearTimesWatchedFilter();
    movieState.setActiveGenre('all');
    moviesRuntime?.resetGrouping();
    renderFromState();
}

function toggleMovieGenre(genre: string, event?: Event) {
    const button = (event?.target as Element | undefined)?.closest('.sidebar-category');
    moviesRuntime?.toggleGroup({
        value: genre,
        button,
        onCollapse: () => { movieState.setActiveGenre('all'); },
        onExpand: () => { movieState.setActiveGenre(genre); }
    });
}

function scrollToMovie(movieTitle: string, event?: Event) {
    event?.preventDefault();
    movieView.scrollToMovie(movieTitle, event);
}

function handleLinkedMovie() {
    if (linkedMovieHandled) return;
    const linkedMovieTitle = new URLSearchParams(window.location.search).get('movie');
    if (!linkedMovieTitle) return;
    linkedMovieHandled = true;
    window.requestAnimationFrame(() => {
        scrollToMovie(linkedMovieTitle, undefined);
    });
}

function clearAllFilters() {
    moviesRuntime?.clearSearchInput();
    movieState.clearSearchQuery();
    movieState.clearStarFilter();
    movieState.clearTimesWatchedFilter();
    movieState.setActiveGenre('all');
    moviesRuntime?.resetGrouping();
    renderFromState();
}

function toggleSidebar() {
    const isCollapsed = moviesRuntime?.toggleSidebar();
    movieState.setSidebarCollapsed(isCollapsed);
}

function restoreSidebarState() {
    const isCollapsed = moviesRuntime?.restoreSidebar();
    movieState.setSidebarCollapsed(isCollapsed);
}

function toggleListDropdown() {
    moviesRuntime?.toggleListDropdown();
}

function closeMovieModal() {
    movieModal.close();
}

function initMoviesZoom() {
    const moviesGrid = document.getElementById('movies-container');
    if (!moviesGrid) return;
    moviesGrid.classList.add('js-zoom-grid');
    initGridZoom({
        eventName: 'movie_open',
        grid: moviesGrid,
        itemSelector: '.movie-card.has-review',
        triggerSelector: '.movie-card.has-review'
    });
}

registerActions({
    clearAllFilters,
    clearMovieSearch,
    closeMovieModal,
    scrollToMovie,
    searchMovies,
    toggleListDropdown,
    toggleMovieGenre,
    toggleSidebar
});

function initMoviesPage() {
    buildCollectionController();
    restoreSidebarState();
    bindMovieEvents({
        clearTimesWatchedFilter,
        closeMovieModal,
        setStarFilter,
        setTimesWatchedFilter
    });
    fetchLetterboxdMovies();
    initMoviesZoom();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMoviesPage, { once: true });
} else {
    initMoviesPage();
}

export {};
