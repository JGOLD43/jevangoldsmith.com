let currentPodcastCategory = 'all';
let currentPodcastSearch = '';

function getPodcastCards() {
    return Array.from(document.querySelectorAll('.podcast-card'));
}

function updatePodcastView() {
    const query = currentPodcastSearch.toLowerCase();
    let visibleCount = 0;

    getPodcastCards().forEach((card) => {
        const matchesCategory = currentPodcastCategory === 'all' || card.dataset.category === currentPodcastCategory;
        const matchesSearch = !query || (card.dataset.search || '').toLowerCase().includes(query);
        const visible = matchesCategory && matchesSearch;
        card.hidden = !visible;
        if (visible) visibleCount += 1;
    });

    const counter = document.getElementById('podcast-count');
    if (counter) counter.textContent = visibleCount;
}

function filterPodcasts(category, buttonEl) {
    currentPodcastCategory = category;

    document.querySelectorAll('.sidebar-category').forEach((button) => {
        button.classList.remove('active');
    });

    if (buttonEl) buttonEl.classList.add('active');
    updatePodcastView();
}

function searchPodcasts(query) {
    currentPodcastSearch = query.trim();
    const clearButton = document.getElementById('podcast-search-clear-btn');
    if (clearButton) clearButton.style.display = currentPodcastSearch ? 'flex' : 'none';

    updatePodcastView();
}

function clearPodcastSearch() {
    currentPodcastSearch = '';
    const searchInput = document.getElementById('podcast-search');
    if (searchInput) searchInput.value = '';

    const clearButton = document.getElementById('podcast-search-clear-btn');
    if (clearButton) clearButton.style.display = 'none';

    updatePodcastView();
}

function togglePodcastSidebar() {
    const layout = document.getElementById('podcasts-layout');
    const sidebar = document.getElementById('podcasts-sidebar');
    if (!layout || !sidebar) return;
    layout.classList.toggle('sidebar-collapsed');
    sidebar.classList.toggle('collapsed');
    localStorage.setItem('podcasts-sidebar-collapsed', sidebar.classList.contains('collapsed'));
}

function togglePodcastListDropdown() {
    const dropdown = document.getElementById('list-dropdown');
    if (dropdown) dropdown.classList.toggle('open');
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
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return null;
        return await res.json();
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
    renderSpotifyMeta('spotify-recent-meta', data.generatedAt, recent.length, recent.length === 1 ? 'episode' : 'episodes');
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

document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', (event) => {
        const dropdown = document.getElementById('list-dropdown');
        if (dropdown && !dropdown.contains(event.target)) {
            dropdown.classList.remove('open');
        }
    });

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
