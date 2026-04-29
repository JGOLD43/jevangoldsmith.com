const collectionUi = window.JGCollectionUI;
const collectionControllerFactory = window.JGCollectionController;
const dataFetch = window.JGDataFetch;
const state = {
    category: 'all',
    searchQuery: '',
    sidebarCollapsed: true
};
let collectionController = null;
let updatePodcastViewDeferred = null;

function escapeValue(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function buildCuratedPodcastCard(podcast) {
    const card = document.createElement('div');
    card.className = `movie-card podcast-card js-zoom-item${podcast.badge ? ' has-review' : ''}`;
    card.dataset.category = podcast.category || 'all';
    card.dataset.search = podcast.searchText || '';
    card.innerHTML = `
        ${podcast.badge ? `<div class="times-read-badge movie-watch-badge">${escapeValue(podcast.badge)}</div>` : ''}
        <div class="movie-poster-wrapper">
            <img src="${escapeValue(podcast.image)}" alt="${escapeValue(podcast.host || podcast.title)}" class="podcast-cover" width="150" height="150" loading="lazy" decoding="async">
        </div>
        <div class="movie-info">
            <div class="movie-title-row">
                <h3 class="movie-title">${escapeValue(podcast.title)}</h3>
            </div>
            <div class="podcast-category-badge">${escapeValue(podcast.host)}</div>
            <p class="movie-description">${escapeValue(podcast.description)}</p>
        </div>
    `;
    return card;
}

async function renderCuratedPodcasts() {
    const data = await dataFetch.fetchJson('data/podcasts.json');
    const podcasts = Array.isArray(data.podcasts) ? data.podcasts : [];
    const container = document.getElementById('podcasts-container');
    if (!container) return;
    container.innerHTML = '';
    const fragment = document.createDocumentFragment();
    podcasts.forEach((podcast) => fragment.appendChild(buildCuratedPodcastCard(podcast)));
    container.appendChild(fragment);
}

function getPodcastCards() {
    return Array.from(document.querySelectorAll('.podcast-card'));
}

function updatePodcastView() {
    collectionController?.render();
}

function getFilteredPodcastCards(currentState = state) {
    const query = currentState.searchQuery.toLowerCase();
    return getPodcastCards().filter((card) => {
        const matchesCategory = currentState.category === 'all' || card.dataset.category === currentState.category;
        const matchesSearch = !query || (card.dataset.search || '').toLowerCase().includes(query);
        return matchesCategory && matchesSearch;
    });
}

function buildCollectionController() {
    collectionController = collectionControllerFactory.create({
        getState: () => ({ ...state }),
        getFilteredItems: (currentState) => getFilteredPodcastCards(currentState),
        renderVisibleItems: (visibleCards) => {
            const visibleSet = new Set(visibleCards);
            getPodcastCards().forEach((card) => {
                card.hidden = !visibleSet.has(card);
            });
        },
        updateCount: (visibleCards) => {
            const counter = document.getElementById('podcast-count');
            if (counter) counter.textContent = visibleCards.length;
        },
        updateControls: (currentState) => {
            collectionController?.syncSearchClearButton(Boolean(currentState.searchQuery));
        },
        group: {
            allButtonSelector: '.sidebar-category[data-podcast-category="all"]',
            buttonSelector: '.sidebar-category'
        },
        searchClearButtonId: 'podcast-search-clear-btn',
        searchInputId: 'podcast-search',
        sidebar: {
            storageKey: 'podcasts-sidebar-collapsed',
            layoutId: 'podcasts-layout',
            sidebarId: 'podcasts-sidebar',
            defaultCollapsed: true
        }
    });
    updatePodcastViewDeferred = collectionUi?.debounce ? collectionUi.debounce(updatePodcastView, 120) : updatePodcastView;
}

function filterPodcasts(category, buttonEl) {
    state.category = category || buttonEl?.dataset.podcastCategory || 'all';
    collectionController?.toggleGroup({
        value: state.category,
        button: buttonEl || document.querySelector(`.sidebar-category[data-podcast-category="${state.category}"]`),
        onCollapse: () => {
            state.category = 'all';
        }
    });
}

function searchPodcasts(query) {
    state.searchQuery = query.trim();
    updatePodcastViewDeferred();
}

function clearPodcastSearch() {
    state.searchQuery = '';
    collectionController?.clearSearchInput();
    updatePodcastView();
}

function togglePodcastSidebar() {
    state.sidebarCollapsed = Boolean(collectionController?.toggleSidebar());
}

function togglePodcastListDropdown() {
    collectionController?.toggleListDropdown();
}

function formatEpisodeDuration(ms) {
    if (!ms || typeof ms !== 'number' || ms <= 0) return '';
    const totalMin = Math.round(ms / 60000);
    if (totalMin < 60) return `${totalMin} min`;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatRelativeDate(iso) {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const diffMs = Date.now() - date.getTime();
    const day = 86400000;
    if (diffMs < day) return 'today';
    if (diffMs < day * 2) return 'yesterday';
    if (diffMs < day * 7) return `${Math.floor(diffMs / day)} days ago`;
    if (diffMs < day * 30) return `${Math.floor(diffMs / (day * 7))} wk ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function buildSpotifyEpisodeCard(ep) {
    const card = document.createElement('div');
    card.className = 'movie-card podcast-card js-zoom-item';
    card.dataset.spotify = 'episode';

    const showName = escapeHTML(ep.showName || 'Unknown show');
    const episodeName = escapeHTML(ep.episodeName || 'Untitled episode');
    const duration = escapeHTML(formatEpisodeDuration(ep.durationMs));
    const listenedAt = escapeHTML(formatRelativeDate(ep.listenedAt));
    const image = ep.image
        ? `<img src="${escapeAttr(ep.image)}" alt="${escapeAttr(ep.showName || ep.episodeName || '')}" class="podcast-cover" width="150" height="150" loading="lazy" decoding="async">`
        : `<div class="podcast-cover-placeholder">🎧</div>`;
    const link = ep.episodeUrl
        ? `<a class="spotify-episode-link" href="${escapeAttr(ep.episodeUrl)}" target="_blank" rel="noopener noreferrer">Open in Spotify →</a>`
        : '';

    card.innerHTML = `
        <div class="movie-poster-wrapper">${image}</div>
        <div class="movie-info">
            <div class="movie-title-row">
                <h3 class="movie-title">${episodeName}</h3>
            </div>
            <div class="podcast-category-badge">${showName}</div>
            ${duration ? `<div class="spotify-episode-duration">${duration}${listenedAt ? ` · ${listenedAt}` : ''}</div>` : (listenedAt ? `<div class="spotify-episode-duration">${listenedAt}</div>` : '')}
            ${link}
        </div>
    `;
    return card;
}

function buildSpotifyShowCard(show) {
    const card = document.createElement('div');
    card.className = 'movie-card podcast-card js-zoom-item';
    card.dataset.spotify = 'show';

    const name = escapeHTML(show.name || 'Untitled show');
    const publisher = escapeHTML(show.publisher || '');
    const image = show.image
        ? `<img src="${escapeAttr(show.image)}" alt="${escapeAttr(show.name || '')}" class="podcast-cover" width="150" height="150" loading="lazy" decoding="async">`
        : `<div class="podcast-cover-placeholder">🎙️</div>`;
    const link = show.url
        ? `<a class="spotify-episode-link" href="${escapeAttr(show.url)}" target="_blank" rel="noopener noreferrer">Open in Spotify →</a>`
        : '';

    card.innerHTML = `
        <div class="movie-poster-wrapper">${image}</div>
        <div class="movie-info">
            <div class="movie-title-row">
                <h3 class="movie-title">${name}</h3>
            </div>
            ${publisher ? `<div class="podcast-category-badge">${publisher}</div>` : ''}
            ${link}
        </div>
    `;
    return card;
}

async function loadJSON(url) {
    try {
        return await dataFetch.fetchJson(url);
    } catch {
        return null;
    }
}

function renderSpotifyMeta(elId, generatedAt, count, label) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (!count) {
        el.textContent = '';
        return;
    }
    const when = generatedAt ? ` · synced ${formatRelativeDate(generatedAt)}` : '';
    el.textContent = `${count} ${label}${when}`;
}

async function renderSpotifyRecentEpisodes() {
    const data = await loadJSON('data/podcast-episodes.json');
    if (!data || !Array.isArray(data.episodes) || data.episodes.length === 0) return;

    const container = document.getElementById('spotify-recent-container');
    const section = document.getElementById('spotify-recent-section');
    if (!container || !section) return;

    const recent = data.episodes.slice(0, 24);
    const frag = document.createDocumentFragment();
    recent.forEach((ep) => frag.appendChild(buildSpotifyEpisodeCard(ep)));
    container.appendChild(frag);
    section.hidden = false;
    renderSpotifyMeta('spotify-recent-meta', data.generatedAt, recent.length, recent.length === 1 ? 'recent episode' : 'recent episodes');
}

async function renderSpotifyFollowedShows() {
    const data = await loadJSON('data/podcast-shows.json');
    if (!data || !Array.isArray(data.shows) || data.shows.length === 0) return;

    const container = document.getElementById('spotify-shows-container');
    const section = document.getElementById('spotify-shows-section');
    if (!container || !section) return;

    const frag = document.createDocumentFragment();
    data.shows.forEach((show) => frag.appendChild(buildSpotifyShowCard(show)));
    container.appendChild(frag);
    section.hidden = false;
    renderSpotifyMeta('spotify-shows-meta', data.generatedAt, data.shows.length, data.shows.length === 1 ? 'show' : 'shows');
}

document.addEventListener('DOMContentLoaded', async () => {
    buildCollectionController();
    state.sidebarCollapsed = Boolean(collectionController?.restoreSidebar());
    document.addEventListener('click', (event) => {
        collectionController?.closeDropdownOnOutsideClick(event);
    });

    await renderCuratedPodcasts();
    updatePodcastView();

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
});
