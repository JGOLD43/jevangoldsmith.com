import { escapeHtml } from '../lib/html-escape';
import { registerActions } from './action-dispatcher';
import { applyCardVisibility, bindStarRatingDrag, installEscapeCloser } from './collection-helpers';
import { createCollectionRuntime } from './collection-runtime';
import {
    closeDropdownOnOutsideClick,
    highlightAndScroll,
    toggleClearButton
} from './collection-ui';
import { fetchJson, readInlineJson } from './data-fetch';
import { onDomReady } from './dom-ready';
import { init as initGridZoom } from './grid-zoom';
import { initCoverFlight } from './cover-flight';
import { LOCAL_KEYS } from './storage-keys';
import { URL_PARAMS } from './url-params';

// Movie stats panel lives below-the-fold; lazy-import on first controls update.
let renderMovieStatsPromise: Promise<(movies: AnyObj[]) => void> | null = null;
async function renderMovieStats(filteredMovies: AnyObj[]): Promise<void> {
    if (!renderMovieStatsPromise) {
        renderMovieStatsPromise = import('./movie-stats').then((mod) => mod.render);
    }
    const fn = await renderMovieStatsPromise;
    fn(filteredMovies);
}

// --- state ---
// MoviesState uses AnyObj because the runtime builds movies from a different
// shape than the content-collection Movie type (runtime entries lack an `id`,
// since they come from the Letterboxd RSS sync rather than the merged
// collection). Typing this would require a separate RuntimeMovie interface.
interface MoviesState {
    activeGenre: string;
    movies: AnyObj[];
    searchQuery: string;
    sidebarCollapsed: boolean;
    starFilter: string;
    timesWatchedFilter: string;
}

const state: MoviesState = {
    activeGenre: 'all',
    movies: [],
    searchQuery: '',
    sidebarCollapsed: true,
    starFilter: 'all',
    timesWatchedFilter: 'all'
};
let linkedMovieHandled = false;
let moviesRuntime: AnyObj = null;

// --- filters ---
function normalizeGenreKey(genre: unknown): string {
    return String(genre || 'Uncategorized').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function filterMoviesData(movies: AnyObj[]): AnyObj[] {
    const query = state.searchQuery.toLowerCase();
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
    }, {} as Record<string, AnyObj[]>);
}

// --- modal ---
function closeMovieModal() {
    const modal = document.getElementById('movie-modal');
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// --- normalize / parse ---
function normalizeMovieData(movie: AnyObj) {
    const starCount = Number(movie.starCount || 0);
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
        genre: movie.genre || 'Uncategorized',
        timesWatched: Number(movie.timesWatched || 1),
        runtime: Number(movie.runtime || 0),
        tmdbId: movie.tmdbId || null,
        tmdbGenres: Array.isArray(movie.tmdbGenres) ? movie.tmdbGenres : [],
        overview: movie.overview || null,
        backdrop: movie.backdrop || null
    };
}


// --- view ---
function displayMovies(movies: AnyObj[]) {
    const container = document.getElementById('movies-container');
    const visibleTitles = new Set(movies.map((movie) => String(movie.title || '')));
    applyCardVisibility(
        container,
        visibleTitles,
        '.movie-card',
        (card) => [card.dataset.movieTitle || '']
    );
}

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
    const hasSsrGenreLinks = Array.from(document.querySelectorAll('.genre-movies'))
        .some((container) => container.children.length > 0);
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
        if (container && !hasSsrGenreLinks) container.innerHTML = '';
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
        if (container && !container.children.length) {
            container.innerHTML = movies.map((movie: AnyObj) => `
                <a href="#" class="movie-link" data-action="scrollToMovie" data-action-args="${encodeURIComponent(movie.title)}" data-action-eventobj="true">
                    <div>${escapeHtml(movie.title)}</div>
                    <div class="movie-link-year">${escapeHtml(movie.year || '')}</div>
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

// --- runtime + actions ---
function renderFromState() { moviesRuntime?.render(); }

function buildCollectionController() {
    moviesRuntime = createCollectionRuntime({
        getState: () => ({ ...state }),
        getFilteredItems: () => filterMoviesData(state.movies),
        getVisibleItems: (filteredMovies: AnyObj[], s: AnyObj) => getMoviesForGenre(filteredMovies, s.activeGenre),
        groupItems: (filteredMovies: AnyObj[]) => groupMoviesByGenre(filteredMovies),
        renderSidebar,
        renderVisibleItems: (visibleMovies: AnyObj[]) => {
            setMainLoaded();
            displayMovies(visibleMovies);
        },
        updateCount: (visibleMovies: AnyObj[]) => updateMovieCount(visibleMovies.length),
        updateControls: (s: AnyObj, filteredMovies: AnyObj[]) => {
            updateStarFilterDisplay(s.starFilter);
            updateTimesWatchedFilterDisplay(s.timesWatchedFilter);
            toggleClearButton('movie-search-clear-btn', Boolean(s.searchQuery));
            renderMovieStats(filteredMovies);
        },
        group: {
            allButtonSelector: '[data-genre="all"]',
            buttonSelector: '.sidebar-category',
            panelForValue: (genre: string) => genre === 'all' ? null : document.getElementById(`genre-${normalizeGenreKey(genre)}`),
            panelSelector: '.genre-movies'
        },
        searchClearButtonId: 'movie-search-clear-btn',
        searchInputId: 'movie-search',
        storageKey: LOCAL_KEYS.moviesSidebar,
        layoutId: 'movies-layout',
        sidebarId: 'movies-sidebar',
        defaultCollapsed: true
    });
}

function applyFilter(mutate: () => void) {
    mutate();
    state.activeGenre = 'all';
    moviesRuntime?.resetGrouping();
    renderFromState();
}

function searchMovies(query: string) {
    applyFilter(() => { state.searchQuery = String(query || '').trim(); });
}

function clearMovieSearch() {
    moviesRuntime?.clearSearchInput();
    applyFilter(() => { state.searchQuery = ''; });
}

function setStarFilter(rating: string | number) {
    applyFilter(() => { state.starFilter = String(rating); });
}

function setTimesWatchedFilter(count: string | number) {
    applyFilter(() => { state.timesWatchedFilter = String(count); });
}

function clearTimesWatchedFilter() {
    applyFilter(() => { state.timesWatchedFilter = 'all'; });
}

function clearAllFilters() {
    moviesRuntime?.clearSearchInput();
    applyFilter(() => {
        state.searchQuery = '';
        state.starFilter = 'all';
        state.timesWatchedFilter = 'all';
    });
}

function toggleMovieGenre(genre: string, event?: Event) {
    const button = (event?.target as Element | undefined)?.closest('.sidebar-category');
    moviesRuntime?.toggleGroup({
        value: genre,
        button,
        onCollapse: () => { state.activeGenre = 'all'; },
        onExpand: () => { state.activeGenre = genre; }
    });
}

function scrollToMovie(movieTitle: string, event?: Event) {
    event?.preventDefault();
    scrollToMovieByTitle(movieTitle, event);
}

function handleLinkedMovie() {
    if (linkedMovieHandled) return;
    const linkedMovieTitle = new URLSearchParams(window.location.search).get(URL_PARAMS.movie);
    if (!linkedMovieTitle) return;
    linkedMovieHandled = true;
    window.requestAnimationFrame(() => scrollToMovie(linkedMovieTitle, undefined));
}

function toggleSidebar() {
    state.sidebarCollapsed = Boolean(moviesRuntime?.toggleSidebar());
}

function restoreSidebarState() {
    state.sidebarCollapsed = Boolean(moviesRuntime?.restoreSidebar());
}

function toggleListDropdown() { moviesRuntime?.toggleListDropdown(); }

// --- data load ---
async function loadCachedMovies() {
    const inline = readInlineJson<AnyObj[]>('jg-movies-data');
    if (Array.isArray(inline) && inline.length > 0) {
        return inline.map(normalizeMovieData);
    }
    const movies = await fetchJson('data/movies.json');
    if (!Array.isArray(movies) || movies.length === 0) {
        throw new Error('Cached movie data is empty');
    }
    return movies.map(normalizeMovieData);
}

function setMovies(movies: AnyObj[]) {
    state.movies = movies.map(normalizeMovieData);
    renderFromState();
    handleLinkedMovie();
}

async function fetchLetterboxdMovies() {
    try {
        const cachedMovies = await loadCachedMovies();
        setMovies(cachedMovies);
    } catch (error) {
        console.error('Error loading movie data:', error);
        setError();
    }
}

// --- events ---
function bindMovieEvents() {
    installEscapeCloser(closeMovieModal);

    document.addEventListener('click', (event) => {
        const modal = document.getElementById('movie-modal');
        if (event.target === modal) {
            closeMovieModal();
            return;
        }
        closeDropdownOnOutsideClick('list-dropdown', event);
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

function initMoviesZoom() {
    const moviesGrid = document.getElementById('movies-container');
    if (!moviesGrid) return;
    moviesGrid.classList.add('js-zoom-grid');
    moviesGrid.querySelectorAll('.movie-card').forEach((el) => el.classList.add('js-zoom-item'));
    initGridZoom({
        anchorSelector: '.movie-poster',
        eventName: 'movie_open',
        grid: moviesGrid,
        itemSelector: '.movie-card',
        triggerSelector: '.movie-card'
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
    bindMovieEvents();
    fetchLetterboxdMovies();
    initMoviesZoom();
}

onDomReady(initMoviesPage, 'movies init');
