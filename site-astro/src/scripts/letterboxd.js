// Phase 7 (slice 8): bind sanitize helpers from window so strict-mode
// ES modules resolve bare `escapeHTML`/`escapeAttr`/`sanitizeUrl`/`sanitizeHTML`
// references that the legacy classic-script code depended on.
const { escapeHTML, escapeAttr, sanitizeUrl, sanitizeHTML } = (typeof window !== "undefined" ? window : globalThis);

// Movies/letterboxd page orchestrator. Inlines js/letterboxd-state.js,
// js/letterboxd-filters.js, js/letterboxd-modal.js, js/letterboxd-events.js,
// js/letterboxd-render.js, js/letterboxd-view.js — those shards only ever
// exposed window.JGLetterboxd* globals consumed here.

const LETTERBOXD_USERNAME = 'contentwatch';
let linkedMovieHandled = false;
const movieMetadata = {
    'What Dreams May Come': { genre: 'Drama', timesWatched: 1 },
    'Before Sunset': { genre: 'Romance', timesWatched: 1 },
    'Before Sunrise': { genre: 'Romance', timesWatched: 1 },
    'Lawrence of Arabia': { genre: 'Drama', timesWatched: 2 },
    "Breakfast at Tiffany's": { genre: 'Romance', timesWatched: 2 },
    'The Place Beyond the Pines': { genre: 'Drama', timesWatched: 1 }
};

// --- state ---
const movieState = (function createState() {
    const state = {
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
        setActiveGenre(g) { state.activeGenre = g || 'all'; },
        setMovies(m) { state.movies = Array.isArray(m) ? m : []; },
        setSearchQuery(q) { state.searchQuery = String(q || '').trim(); },
        setSidebarCollapsed(v) { state.sidebarCollapsed = Boolean(v); },
        setStarFilter(r) { state.starFilter = r; },
        setTimesWatchedFilter(c) { state.timesWatchedFilter = c; }
    };
}());

// Phase 4 (additive): expose movies-page state for future feature-module migration.
if (typeof window !== 'undefined') {
    window.MoviesState = movieState;
}

// --- filters ---
function normalizeGenreKey(genre) {
    return String(genre || 'Uncategorized').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function filterMoviesData(movies, state) {
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

function getMoviesForGenre(movies, genre) {
    if (genre === 'all') return movies;
    return movies.filter((movie) => movie.genre === genre);
}

function groupMoviesByGenre(movies) {
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
    function open(movieData) {
        const modal = document.getElementById('movie-modal');
        if (!modal) return false;
        document.getElementById('modal-movie-title').textContent = movieData.title;
        document.getElementById('modal-movie-year').textContent = movieData.year || '';
        document.getElementById('modal-movie-rating').textContent = movieData.rating || '';
        document.getElementById('modal-movie-date').textContent = `Watched: ${movieData.date}`;
        document.getElementById('modal-movie-review').textContent = movieData.review || 'No review available.';
        document.getElementById('modal-letterboxd-link').href = movieData.link;
        const posterImg = document.getElementById('modal-movie-poster');
        if (movieData.poster) {
            posterImg.src = movieData.poster;
            posterImg.alt = movieData.title;
            posterImg.style.display = 'block';
        } else {
            posterImg.style.display = 'none';
        }
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        return true;
    }
    return { close, open };
}

// --- render ---
const genreIcons = {
    'Action': '💥', 'Adventure': '🗺️', 'Animation': '🎨', 'Comedy': '😂',
    'Crime': '🔫', 'Documentary': '📹', 'Drama': '🎭', 'Fantasy': '🧙',
    'Horror': '👻', 'Mystery': '🔍', 'Romance': '💕', 'Sci-Fi': '🚀',
    'Thriller': '😱', 'Western': '🤠', 'Uncategorized': '🎬'
};

function formatRuntime(minutes) {
    const totalMinutes = Number(minutes) || 0;
    if (totalMinutes <= 0) return '';
    const hours = Math.floor(totalMinutes / 60);
    const remainder = totalMinutes % 60;
    if (hours === 0) return `${remainder} min`;
    if (remainder === 0) return `${hours}h`;
    return `${hours}h ${remainder}m`;
}

function normalizeMovieData(movie) {
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

function createMovieCardFromData(movieData) {
    const card = document.createElement('div');
    card.className = 'movie-card js-zoom-item';
    card.setAttribute('data-movie-title', movieData.title);
    card.setAttribute('data-title', movieData.title);
    card.setAttribute('data-id', movieData.title);
    if (movieData.review) {
        card.classList.add('has-review');
        card.style.cursor = 'pointer';
    }
    const timesWatchedBadge = movieData.timesWatched > 1
        ? `<div class="times-read-badge movie-watch-badge">${movieData.timesWatched}x Watched</div>`
        : '';
    const genreIcon = genreIcons[movieData.genre] || '🎬';
    const ratingNumber = movieData.starCount || '';

    const detailHtml = movieData.review ? `
        <div class="js-zoom-detail" aria-hidden="true">
            <p class="zoom-detail-kicker">${escapeHTML(movieData.genre || 'Film')}${movieData.year ? ' · ' + escapeHTML(movieData.year) : ''}</p>
            <p class="zoom-detail-title">${escapeHTML(movieData.title)}</p>
            ${movieData.rating ? `<p class="zoom-detail-lead">${escapeHTML(movieData.rating)}</p>` : ''}
            <p class="zoom-detail-line"><span>Review —</span> ${escapeHTML(movieData.review)}</p>
            ${movieData.date ? `<p class="zoom-detail-line"><span>Watched —</span> ${escapeHTML(movieData.date)}</p>` : ''}
            ${movieData.link && movieData.link !== '#' ? `<a class="zoom-detail-link" href="${escapeAttr(movieData.link)}" target="_blank" rel="noopener noreferrer">Letterboxd</a>` : ''}
        </div>
    ` : '';

    card.innerHTML = `
        ${timesWatchedBadge}
        <div class="movie-poster-wrapper">
            ${movieData.poster ? `<img src="${escapeAttr(movieData.poster)}" alt="${escapeAttr(movieData.title)}" class="movie-poster" loading="lazy" decoding="async">` : `<div class="movie-poster-placeholder">${escapeHTML(movieData.title)}</div>`}
        </div>
        <div class="movie-info">
            <div class="movie-title-row">
                <h3 class="movie-title">${escapeHTML(movieData.title)}</h3>
                ${movieData.year ? `<span class="movie-year">${escapeHTML(movieData.year)}</span>` : ''}
            </div>
            ${movieData.runtime ? `<div class="movie-runtime">${escapeHTML(formatRuntime(movieData.runtime))}</div>` : ''}
            ${movieData.genre ? `<div class="movie-genre-badge">${genreIcon} ${escapeHTML(movieData.genre)}</div>` : ''}
            ${movieData.rating ? `<div class="movie-rating">${ratingNumber ? `<span class="rating-number">${escapeHTML(ratingNumber)}</span>` : ''}${escapeHTML(movieData.rating)}</div>` : ''}
            ${movieData.shortDescription ? `<p class="movie-description">${escapeHTML(movieData.shortDescription)}</p>` : ''}
            ${movieData.date ? `<p class="movie-date">Watched: ${escapeHTML(movieData.date)}</p>` : ''}
        </div>
        ${detailHtml}
    `;
    return card;
}

let hasAdoptedSsrMovies = false;
function displayMovies(movies) {
    const container = document.getElementById('movies-container');
    if (!container) return;
    // Phase 1 slice 1.2: Astro SSRs every movie card from data/movies.json.
    // On first call (initial render), if the DOM already has the SSR'd cards,
    // we skip the wipe so users see no flash. Subsequent calls (filter /
    // search) always re-render — that's the runtime path.
    if (!hasAdoptedSsrMovies) {
        hasAdoptedSsrMovies = true;
        // Hide the "Loading…" placeholder once we know SSR cards are usable.
        const loadingEl = document.getElementById('loading');
        if (loadingEl) loadingEl.style.display = 'none';
        if (container.children.length === movies.length) return;
    }
    container.innerHTML = '';
    movies.forEach((movieData) => container.appendChild(createMovieCardFromData(movieData)));
}

function parseMovieData(item) {
    const data = {
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

function renderSidebar(genreGroups) {
    setSidebarLoaded();
    const countAllEl = document.getElementById('count-all-movies');
    if (countAllEl) {
        const total = Object.values(genreGroups).reduce((sum, movies) => sum + movies.length, 0);
        countAllEl.textContent = total;
    }
    document.querySelectorAll('#sidebar-content .sidebar-section').forEach((section) => {
        const button = section.querySelector('.sidebar-category[data-genre]');
        const genre = button?.dataset.genre;
        if (!genre || genre === 'all') return;
        const key = normalizeGenreKey(genre);
        const countEl = document.getElementById(`count-${key}`);
        const container = document.getElementById(`genre-${key}`);
        if (countEl) countEl.textContent = '0';
        if (container) container.innerHTML = '';
        section.style.display = 'none';
    });
    Object.keys(genreGroups).forEach((genre) => {
        const key = normalizeGenreKey(genre);
        const movies = genreGroups[genre];
        const countEl = document.getElementById(`count-${key}`);
        const section = countEl?.closest('.sidebar-section');
        const container = document.getElementById(`genre-${key}`);
        if (countEl) countEl.textContent = movies.length;
        if (section) section.style.display = movies.length === 0 ? 'none' : 'block';
        if (container) {
            container.innerHTML = movies.map((movie) => `
                <a href="#" class="movie-link" data-action="scrollToMovie" data-action-args="${encodeURIComponent(movie.title)}" data-action-eventobj="true">
                    <div>${escapeHTML(movie.title)}</div>
                    <div class="movie-link-year">${escapeHTML(movie.year || '')}</div>
                </a>
            `).join('');
        }
    });
}

function updateMovieCount(count) {
    const countElement = document.getElementById('movie-count');
    if (countElement) countElement.textContent = count;
}

function updateStarFilterDisplay(value) {
    const stars = document.querySelectorAll('.filter-star');
    const text = document.getElementById('filter-rating-text');
    stars.forEach((star) => {
        const starNumber = Number.parseInt(star.getAttribute('data-star'), 10);
        star.classList.remove('full', 'half');
        if (value === 'all') return;
        if (starNumber <= value) star.classList.add('full');
        else if (starNumber === value + 0.5) star.classList.add('half');
    });
    if (text) text.textContent = value === 'all' ? '' : (value >= 5 ? '★' : `${value}★+`);
}

function updateTimesWatchedFilterDisplay(value) {
    const slider = document.getElementById('timeswatched-slider');
    const text = document.getElementById('filter-timeswatched-text');
    const normalized = value === 'all' ? 0 : Number(value);
    if (slider) slider.value = normalized;
    if (text) text.textContent = normalized > 0 ? (normalized >= 10 ? '10' : String(normalized)) : '';
}

function scrollToMovieByTitle(movieTitle, event) {
    const movieCards = Array.from(document.querySelectorAll('.movie-card'));
    const targetCard = movieCards.find((card) => card.getAttribute('data-movie-title') === movieTitle);
    if (!targetCard) return;
    window.JGCollectionUI.highlightAndScroll(targetCard, {
        activeElement: event?.target?.closest('.movie-link'),
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
    createMovieCardFromData,
    displayMovies,
    formatRuntime,
    normalizeMovieData,
    parseMovieData
};

// --- events ---
function bindMovieEvents({ clearTimesWatchedFilter, closeMovieModal, setStarFilter, setTimesWatchedFilter }) {
    const helpers = window.JGCollectionHelpers;
    helpers.installEscapeCloser(closeMovieModal);

    document.addEventListener('click', (event) => {
        const modal = document.getElementById('movie-modal');
        if (event.target === modal) {
            closeMovieModal();
            return;
        }
        window.JGCollectionUI.closeDropdownOnOutsideClick('list-dropdown', event);
    });

    helpers.bindStarRatingDrag(document, setStarFilter);

    const slider = document.getElementById('timeswatched-slider');
    if (slider) {
        slider.addEventListener('input', (event) => {
            const count = Number.parseInt(event.target.value, 10);
            if (count === 0) {
                clearTimesWatchedFilter();
                return;
            }
            setTimesWatchedFilter(count);
        });
    }
}

// --- orchestrator ---
const dataFetch = window.JGDataFetch;
const collectionUi = window.JGCollectionUI;
const movieModal = createMovieModal();
let moviesRuntime = null;

function getFilteredMovies() {
    return movieFilters.filterMovies(movieState.getMovies(), movieState.get());
}

function renderFromState() {
    moviesRuntime?.render();
}

function buildCollectionController() {
    moviesRuntime = window.JGCollectionRuntime.create({
        getState: () => movieState.get(),
        getFilteredItems: () => getFilteredMovies(),
        getVisibleItems: (filteredMovies, state) => movieFilters.getMoviesForGenre(filteredMovies, state.activeGenre),
        groupItems: (filteredMovies) => movieFilters.groupMoviesByGenre(filteredMovies),
        renderSidebar: (groups) => movieView.renderSidebar(groups),
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
            panelForValue: (genre) => genre === 'all' ? null : document.getElementById(`genre-${normalizeGenreKey(genre)}`),
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
    const movies = await dataFetch.fetchJson('data/movies.json');
    if (!Array.isArray(movies) || movies.length === 0) {
        throw new Error('Cached movie data is empty');
    }
    return movies.map(normalizeMovieData);
}

function setMovies(movies) {
    movieState.setMovies(movies.map(normalizeMovieData));
    renderFromState();
    handleLinkedMovie();
}

// Phase 1.3: runtime path is pure SSR-then-cached-fetch. The Letterboxd
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

function searchMovies(query) {
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

function setStarFilter(rating) {
    movieState.setStarFilter(rating);
    movieState.setActiveGenre('all');
    moviesRuntime?.resetGrouping();
    renderFromState();
}

function clearStarFilter() {
    movieState.clearStarFilter();
    movieState.setActiveGenre('all');
    moviesRuntime?.resetGrouping();
    renderFromState();
}

function setTimesWatchedFilter(count) {
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

function toggleMovieGenre(genre, event) {
    const button = event?.target?.closest('.sidebar-category');
    moviesRuntime?.toggleGroup({
        value: genre,
        button,
        onCollapse: () => { movieState.setActiveGenre('all'); },
        onExpand: () => { movieState.setActiveGenre(genre); }
    });
}

function scrollToMovie(movieTitle, event) {
    event?.preventDefault();
    movieView.scrollToMovie(movieTitle, event);
}

function handleLinkedMovie() {
    if (linkedMovieHandled) return;
    const linkedMovieTitle = new URLSearchParams(window.location.search).get('movie');
    if (!linkedMovieTitle) return;
    linkedMovieHandled = true;
    window.requestAnimationFrame(() => {
        scrollToMovie(linkedMovieTitle);
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

window.JGActions.register({
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
