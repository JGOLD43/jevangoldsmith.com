// Phase 7 (slice 8): bind sanitize helpers from window so strict-mode
// ES modules resolve bare `escapeHTML`/`escapeAttr`/`sanitizeUrl`/`sanitizeHTML`
// references that the legacy classic-script code depended on.
const { escapeHTML, escapeAttr, sanitizeUrl, sanitizeHTML } = (typeof window !== "undefined" ? window : globalThis);

// ============================================
// Adventures Page Runtime State
// ============================================

const ADVENTURES_DATA_URL = 'data/adventures.json';
const PLACES_DATA_URL = 'data/placeofinterest.json';
const ROUTES_DATA_URL = 'data/routes.generated.json';
const POPULAR_ROUTES_URL = 'data/popular-routes.json';
const POPULAR_ROUTES_INDEX_URL = 'data/popular-routes.index.json';
const PHOTOS_DATA_URL = 'data/photos.generated.json';
const COUNTRIES_GEO_URL = 'data/countries.slim.generated.json';
const COUNTRIES_VISITED_URL = 'data/countries-visited.generated.json';
const FILTERS_STORAGE_KEY = 'adventures-map-filters-v1';
const WEB_MERCATOR_MAX_LAT = 85.05112878;
const HORIZONTAL_WRAP_BOUND = 1000000;

const ROUTE_TYPE_COLORS = {
    hike: '#38a169',
    drive: '#dd6b20',
    bike: '#d69e2e',
    flight: '#9f7aea',
    sail: '#3182ce',
    paddle: '#0987a0',
    run: '#e53e3e',
    walk: '#4a5568',
    ski: '#63b3ed',
    track: '#C9A86C'
};

const BASEMAPS = {
    streets: { label: 'Streets', tile: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', maxZoom: 19, subdomains: 'abc' },
    satellite: { label: 'Satellite', tile: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', maxZoom: 19 },
    hybrid: { label: 'Satellite + Labels', tile: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', maxZoom: 19, overlay: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}' },
    terrain: { label: 'Terrain', tile: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', maxZoom: 19 },
    dark: { label: 'Dark', tile: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png', maxZoom: 19, subdomains: 'abcd' },
    light: { label: 'Light', tile: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png', maxZoom: 19, subdomains: 'abcd' }
};

const DEFAULT_FILTERS = {
    year: 'all',
    region: 'all',
    layers: { adventures: true, routes: true, photos: true, pois: true, countries: false },
    poiCategories: {},
    basemap: 'satellite',
    routeSet: 'all'
};

// Phase 3 slice 3.1 (Tier 1+2 plan): expose constants on globalThis so the
// dynamically-imported adventures-map.js module can resolve them via free-
// identifier lookup. Without this the map throws "WEB_MERCATOR_MAX_LAT is
// not defined" on bootstrap.
globalThis.WEB_MERCATOR_MAX_LAT = WEB_MERCATOR_MAX_LAT;
globalThis.HORIZONTAL_WRAP_BOUND = HORIZONTAL_WRAP_BOUND;
globalThis.ROUTE_TYPE_COLORS = ROUTE_TYPE_COLORS;
globalThis.BASEMAPS = BASEMAPS;
globalThis.FILTERS_STORAGE_KEY = FILTERS_STORAGE_KEY;
globalThis.DEFAULT_FILTERS = DEFAULT_FILTERS;
globalThis.ADVENTURES_DATA_URL = ADVENTURES_DATA_URL;
globalThis.PLACES_DATA_URL = PLACES_DATA_URL;
globalThis.ROUTES_DATA_URL = ROUTES_DATA_URL;
globalThis.POPULAR_ROUTES_URL = POPULAR_ROUTES_URL;
globalThis.POPULAR_ROUTES_INDEX_URL = POPULAR_ROUTES_INDEX_URL;
globalThis.PHOTOS_DATA_URL = PHOTOS_DATA_URL;
globalThis.COUNTRIES_GEO_URL = COUNTRIES_GEO_URL;
globalThis.COUNTRIES_VISITED_URL = COUNTRIES_VISITED_URL;

// Phase 5 (slice 12): cross-script-shared state lives on globalThis so the
// dynamically-imported adventures-map.js module sees the same backing
// values via free-identifier resolution.
globalThis.allAdventures = [];
globalThis.allPlaces = [];
globalThis.placeCategories = [];
globalThis.allRoutes = [];
globalThis.allPhotos = [];
globalThis.countryGeo = null;
globalThis.visitedIso = new Set();
globalThis.placesVisible = true;
globalThis.placeMarkers = [];
globalThis.routeLayer = null;
globalThis.photoLayer = null;
globalThis.countryLayer = null;
globalThis.basemapTileLayer = null;
globalThis.activeFilters = new Set();
globalThis.mapFilters = { ...DEFAULT_FILTERS, layers: { ...DEFAULT_FILTERS.layers }, poiCategories: {} };
globalThis.lightboxImages = [];
globalThis.lightboxIndex = 0;
globalThis.worldMap = null;
globalThis.adventureMaps = {};
globalThis.adventureMarkers = {};
globalThis.leafletPromise = null;
globalThis.markerClusterPromise = null;
globalThis.mapDataPromise = null;
globalThis.worldMapRequested = false;
globalThis.selectedAdventureId = null;
globalThis.currentAdventureView = 'list';
globalThis.adventuresMapBundlePromise = null;

// Phase 4 (additive): namespaced surface for AdventuresState/Urls/Constants.
if (typeof window !== 'undefined') {
    window.AdventuresState = {
        get adventures() { return globalThis.allAdventures; },
        set adventures(v) { globalThis.allAdventures = v; },
        get places() { return globalThis.allPlaces; },
        get placeCategories() { return globalThis.placeCategories; },
        get routes() { return globalThis.allRoutes; },
        get photos() { return globalThis.allPhotos; },
        get countries() { return globalThis.countryGeo; },
        get visited() { return globalThis.visitedIso; },
        get filters() { return globalThis.mapFilters; },
        get worldMap() { return globalThis.worldMap; },
        get adventureMaps() { return globalThis.adventureMaps; },
        get adventureMarkers() { return globalThis.adventureMarkers; },
        get selectedId() { return globalThis.selectedAdventureId; },
        set selectedId(v) { globalThis.selectedAdventureId = v; },
        get currentView() { return globalThis.currentAdventureView; },
        set currentView(v) { globalThis.currentAdventureView = v; }
    };
    window.AdventuresUrls = {
        adventures: ADVENTURES_DATA_URL,
        places: PLACES_DATA_URL,
        routes: ROUTES_DATA_URL,
        popularRoutes: POPULAR_ROUTES_URL,
        popularRoutesIndex: POPULAR_ROUTES_INDEX_URL,
        photos: PHOTOS_DATA_URL,
        countriesGeo: COUNTRIES_GEO_URL,
        countriesVisited: COUNTRIES_VISITED_URL
    };
    window.AdventuresConstants = {
        FILTERS_STORAGE_KEY,
        WEB_MERCATOR_MAX_LAT,
        HORIZONTAL_WRAP_BOUND,
        ROUTE_TYPE_COLORS,
        BASEMAPS,
        DEFAULT_FILTERS
    };
}

// FAST_BASEMAP_LAND consumed by adventures-map.js via globalThis.
globalThis.FAST_BASEMAP_LAND = [
    [[72, -168], [68, -52], [56, -58], [48, -70], [32, -81], [19, -105], [24, -125], [39, -124], [51, -134], [59, -151]],
    [[34, -116], [29, -95], [17, -88], [8, -80], [-4, -81], [-18, -75], [-35, -70], [-55, -66], [-52, -45], [-30, -39], [-7, -35], [8, -50], [18, -63], [24, -82]],
    [[72, -10], [70, 42], [62, 98], [55, 145], [42, 158], [28, 124], [8, 104], [6, 78], [21, 59], [31, 35], [40, 23], [45, 5], [54, -7]],
    [[35, -18], [30, 32], [14, 45], [-3, 40], [-20, 30], [-35, 19], [-34, 1], [-20, -12], [5, -17], [22, -16]],
    [[-11, 112], [-11, 154], [-28, 154], [-39, 145], [-35, 116]],
    [[-34, 166], [-36, 178], [-46, 170], [-43, 166]],
    [[37, 126], [45, 142], [31, 146]],
    [[-12, 45], [-25, 50], [-22, 43]]
];

function loadFilters() {
    try {
        const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
        if (!raw) return;
        const stored = JSON.parse(raw);
        if (!stored || typeof stored !== 'object') return;

        globalThis.mapFilters = {
            year: stored.year || 'all',
            region: stored.region || 'all',
            layers: { ...DEFAULT_FILTERS.layers, ...(stored.layers || {}) },
            poiCategories: { ...(stored.poiCategories || {}) },
            basemap: stored.basemap || 'satellite',
            routeSet: stored.routeSet || 'all'
        };
        globalThis.placesVisible = mapFilters.layers.pois;
    } catch (_error) {
    }
}

function saveFilters() {
    try {
        localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(mapFilters));
    } catch (_error) {
    }
}

// Async loader for the heavier Adventures map runtime.
function loadAdventuresMapBundle() {
    if (window.AdventuresMap) return Promise.resolve(window.AdventuresMap);
    if (globalThis.adventuresMapBundlePromise) return globalThis.adventuresMapBundlePromise;

    // Phase 5 (slice 12): native dynamic import. Vite/Astro emits a separate
    // chunk for the heavy map runtime — kept off the initial adventures bundle.
    globalThis.adventuresMapBundlePromise = import('./adventures-map.js').then(() => {
        if (!window.AdventuresMap) throw new Error('Adventures map API was not registered');
        return window.AdventuresMap;
    });

    return globalThis.adventuresMapBundlePromise;
}

function setupWorldMapLazyLoad(adventures) {
    const mapContainer = document.getElementById('world-map');
    if (!mapContainer) return;

    const split = document.querySelector('.adventures-page-split');
    const mobileToggle = document.querySelector('.adventures-mobile-toggle');
    const isMobileTabs = mobileToggle && getComputedStyle(mobileToggle).display !== 'none';
    if (isMobileTabs && !split?.classList.contains('map-view')) {
        return;
    }

    requestAnimationFrame(() => {
        setTimeout(() => ensureWorldMap(adventures), 100);
    });
}

function ensureWorldMap(adventures = allAdventures) {
    return loadAdventuresMapBundle().then((api) => api.ensureWorldMap(adventures));
}

// Phase 5 (slice 12): in legacy classic-script land, adventures-ui.js
// re-declared `highlightAdventureOnMap` and `clearMapHighlight` AFTER the
// loader and won via hoisting. As one ES module that's a duplicate-name
// error, so the loader's proxy versions are removed; the ui versions
// (further below) handle both first-load and post-load paths.

// ============================================
// Adventures Page UI
// ============================================

let hasAdoptedSsrAdventures = false;
function renderAdventures(adventures) {
    const container = document.getElementById('adventures-container');
    if (!container) return;

    if (adventures.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <p style="color: var(--text-light);">No adventures found in this region.</p>
            </div>
        `;
        return;
    }

    // Phase H: Astro SSRs every card with explicit width/height. On the
    // first render call, if the DOM already matches the data, just attach
    // click handlers to the existing cards instead of wiping + re-rendering.
    // Skipping the rebuild kills the CLS spike caused by re-renders that
    // dropped the width/height image attrs.
    if (!hasAdoptedSsrAdventures && container.children.length === adventures.length) {
        hasAdoptedSsrAdventures = true;
        const ids = adventures.map((a) => a.id);
        let allMatch = true;
        for (let i = 0; i < container.children.length; i++) {
            if (container.children[i].dataset.adventureId !== ids[i]) { allMatch = false; break; }
        }
        if (allMatch) {
            adventures.forEach((adventure) => {
                const card = document.getElementById(`card-${adventure.id}`);
                if (card) card.addEventListener('click', () => selectAdventure(adventure.id));
            });
            return;
        }
    }

    hasAdoptedSsrAdventures = true;
    container.innerHTML = '';
    adventures.forEach((adventure) => {
        container.appendChild(createCompactCard(adventure));
    });
}

function createCompactCard(adventure) {
    const card = document.createElement('div');
    card.className = 'adventure-compact-card';
    card.id = `card-${adventure.id}`;
    card.setAttribute('data-adventure-id', adventure.id);

    const formattedDate = formatDateRange(adventure.startDate, adventure.endDate);

    // width/height attrs matching the displayed CSS size (80×80 desktop)
    // so the browser reserves a square box before the image loads —
    // matches the legacy-style.css `.adventure-compact-image` rule and
    // eliminates the CLS spike from late-arriving image dimensions.
    card.innerHTML = `
        <img src="${escapeAttr(adventure.heroImage)}" alt="${escapeAttr(adventure.title)}" class="adventure-compact-image" width="80" height="80" loading="eager" decoding="async">
        <div class="adventure-compact-info">
            <div class="adventure-compact-location">${escapeHTML(adventure.location)}</div>
            <h3 class="adventure-compact-title">${escapeHTML(adventure.title)}</h3>
            <div class="adventure-compact-meta">${escapeHTML(formattedDate)} · ${escapeHTML(adventure.duration)}</div>
        </div>
    `;

    card.addEventListener('click', () => selectAdventure(adventure.id));
    return card;
}

function selectAdventure(id) {
    const adventure = allAdventures.find((item) => item.id === id);
    if (!adventure) return;

    document.querySelectorAll('.adventure-compact-card').forEach((card) => {
        card.classList.remove('active');
    });

    const selectedCard = document.getElementById(`card-${id}`);
    if (selectedCard) selectedCard.classList.add('active');

    globalThis.selectedAdventureId = id;
    highlightAdventureOnMap(adventure);
    showAdventureDetail(adventure);
}

function showAdventureDetail(adventure) {
    const overlay = document.getElementById('adventure-detail-overlay');
    const content = document.getElementById('adventure-detail-content');
    if (!overlay || !content) return;

    const formattedDate = formatDateRange(adventure.startDate, adventure.endDate);

    content.innerHTML = `
        <img src="${escapeAttr(adventure.heroImage)}" alt="${escapeAttr(adventure.title)}" class="adventure-detail-hero" loading="lazy" decoding="async">
        <div class="adventure-detail-body">
            <div class="adventure-location">${escapeHTML(adventure.location)}</div>
            <h2 class="adventure-title">${escapeHTML(adventure.title)}</h2>
            <div class="adventure-meta">
                <span>${escapeHTML(formattedDate)}</span>
                <span>${escapeHTML(adventure.duration)}</span>
            </div>
            <p class="adventure-description">${escapeHTML(adventure.shortDescription)}</p>
            <button type="button" class="view-full-story-btn" data-action="scrollToStory">Read Full Story</button>
        </div>
    `;

    overlay.classList.add('active');
}

function renderInlineStory(adventure) {
    const section = document.getElementById('adventure-story-inline');
    const inner = document.getElementById('adventure-story-inner');
    if (!section || !inner) return;

    const formattedDate = formatDateRange(adventure.startDate, adventure.endDate);
    const highlights = Array.isArray(adventure.highlights) ? adventure.highlights : [];
    const gallery = Array.isArray(adventure.gallery) ? adventure.gallery : [];

    inner.innerHTML = `
        <div class="adventure-story-hero">
            <img src="${escapeAttr(adventure.heroImage)}" alt="${escapeAttr(adventure.title)}" loading="lazy" decoding="async">
            <div class="adventure-story-hero-overlay">
                <div class="adventure-story-location">${escapeHTML(adventure.location)}</div>
                <h2 class="adventure-story-title">${escapeHTML(adventure.title)}</h2>
                ${adventure.subtitle ? `<p class="adventure-story-subtitle">${escapeHTML(adventure.subtitle)}</p>` : ''}
            </div>
        </div>
        <div class="adventure-story-body">
            <div class="adventure-story-meta">
                <span>${escapeHTML(formattedDate)}</span>
                <span>${escapeHTML(adventure.duration)}</span>
            </div>
            <div class="adventure-story-content">${adventure.content || ''}</div>
            ${highlights.length ? `<div class="adventure-story-highlights">
                <h3>Highlights</h3>
                <ul>${highlights.map((item) => `<li>${escapeHTML(item)}</li>`).join('')}</ul>
            </div>` : ''}
            ${gallery.length ? `<div class="adventure-story-gallery">
                <h3>Gallery</h3>
                <div class="adventure-story-gallery-grid">
                    ${gallery.map((item, index) => `<figure class="adventure-story-gallery-item" data-action="open-adventure-lightbox" data-adventure-id="${escapeAttr(adventure.id)}" data-index="${index}">
                        <img src="${escapeAttr(item.thumbnail || item.src)}" alt="${escapeAttr(item.caption || '')}" loading="lazy" decoding="async">
                        ${item.caption ? `<figcaption>${escapeHTML(item.caption)}</figcaption>` : ''}
                    </figure>`).join('')}
                </div>
            </div>` : ''}
        </div>
    `;

    section.hidden = false;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeAdventureDetail() {
    const overlay = document.getElementById('adventure-detail-overlay');
    if (overlay) overlay.classList.remove('active');

    const inlineStory = document.getElementById('adventure-story-inline');
    const inlineInner = document.getElementById('adventure-story-inner');
    if (inlineStory) inlineStory.hidden = true;
    if (inlineInner) inlineInner.innerHTML = '';

    document.querySelectorAll('.adventure-compact-card').forEach((card) => {
        card.classList.remove('active');
    });

    globalThis.selectedAdventureId = null;
    clearMapHighlight();
}

function highlightAdventureOnMap(adventure) {
    if (!worldMap) {
        ensureWorldMap().then(() => highlightAdventureOnMap(adventure));
        return;
    }
    if (!adventure || !adventure.mapCenter) return;

    const targetLng = nearestWrappedLongitude(adventure.mapCenter.lng, worldMap.getCenter().lng);
    worldMap.setView([adventure.mapCenter.lat, targetLng], 5, {
        animate: true,
        duration: 0.5
    });
}

function clearMapHighlight() {
    if (!worldMap) {
        if (window.AdventuresMap) window.AdventuresMap.ensureWorldMap().then(clearMapHighlight);
        return;
    }
    worldMap.setView([20, 0], 2, {
        animate: true,
        duration: 0.5
    });
}

function openLightbox(adventureId, index) {
    const adventure = allAdventures.find((item) => item.id === adventureId);
    if (!adventure || !adventure.gallery) return;

    globalThis.lightboxImages = adventure.gallery;
    globalThis.lightboxIndex = index;

    updateLightboxImage();
    document.getElementById('lightbox').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    document.getElementById('lightbox').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function nextImage() {
    globalThis.lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
    updateLightboxImage();
}

function prevImage() {
    globalThis.lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
    updateLightboxImage();
}

function updateLightboxImage() {
    const photo = lightboxImages[lightboxIndex];
    document.getElementById('lightbox-image').src = photo.src;
    document.getElementById('lightbox-caption').textContent = photo.caption || '';
    document.getElementById('lightbox-counter').textContent = `${lightboxIndex + 1} / ${lightboxImages.length}`;
}

// Phase 3 slice 3.2 (Tier 1+2 plan): adventures-map.js calls updateLightboxImage
// when the map's photo lightbox is opened.
globalThis.updateLightboxImage = updateLightboxImage;

document.addEventListener('keydown', (event) => {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox || !lightbox.classList.contains('active')) return;

    if (event.key === 'Escape') closeLightbox();
    if (event.key === 'ArrowRight') nextImage();
    if (event.key === 'ArrowLeft') prevImage();
});

document.addEventListener('click', (event) => {
    const lightbox = document.getElementById('lightbox');
    if (lightbox && event.target === lightbox) closeLightbox();
});

function populateSidebar(adventures) {
    const regions = {
        all: adventures.length,
        europe: 0,
        asia: 0,
        australia: 0,
        americas: 0,
        other: 0
    };

    adventures.forEach((adventure) => {
        const region = (adventure.region || 'other').toLowerCase();
        if (Object.prototype.hasOwnProperty.call(regions, region)) regions[region] += 1;
        else regions.other += 1;
    });

    Object.keys(regions).forEach((region) => {
        const countEl = document.getElementById(`count-${region}`);
        if (countEl) countEl.textContent = regions[region];
    });
}

function toggleFilter(region, buttonEl) {
    if (activeFilters.has(region)) {
        activeFilters.delete(region);
        buttonEl.classList.remove('active');
    } else {
        activeFilters.add(region);
        buttonEl.classList.add('active');
    }

    updateAllButtonState();
    applyFilters();
}

function resetFilters(buttonEl) {
    activeFilters.clear();
    document.querySelectorAll('.filter-pill:not([data-region="all"])').forEach((btn) => {
        btn.classList.remove('active');
    });

    buttonEl.classList.add('active');
    closeAdventureDetail();
    renderAdventures(allAdventures);
    updateAdventureCount(allAdventures.length);
}

function updateAllButtonState() {
    const allBtn = document.querySelector('.filter-pill[data-region="all"]');
    if (!allBtn) return;
    allBtn.classList.toggle('active', activeFilters.size === 0);
}

function applyFilters() {
    let filtered = allAdventures;

    if (activeFilters.size > 0) {
        filtered = allAdventures.filter((adventure) => {
            const region = (adventure.region || 'other').toLowerCase();
            return activeFilters.has(region);
        });
    }

    renderAdventures(filtered);
    updateAdventureCount(filtered.length);
}

function formatDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const options = { month: 'short', year: 'numeric' };

    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
        return start.toLocaleDateString('en-US', options);
    }

    if (start.getFullYear() === end.getFullYear()) {
        return `${start.toLocaleDateString('en-US', { month: 'short' })} - ${end.toLocaleDateString('en-US', options)}`;
    }

    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
}

function updateAdventureCount(count) {
    const countEl = document.getElementById('adventure-count');
    if (countEl) countEl.textContent = count;
}

function showErrorMessage() {
    const container = document.getElementById('adventures-container');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <p style="color: var(--accent-color);">Unable to load adventures</p>
                <p style="color: var(--text-light);">Please try refreshing the page.</p>
            </div>
        `;
    }

    const worldMapEl = document.getElementById('world-map');
    if (worldMapEl) worldMapEl.style.display = 'none';
}

function switchMobileView(view) {
    const pageContainer = document.querySelector('.adventures-page-split');
    const buttons = document.querySelectorAll('.mobile-view-btn');
    if (!pageContainer) return;

    buttons.forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });

    if (view === 'map') {
        pageContainer.classList.add('map-view');
        ensureWorldMap();
        if (worldMap) setTimeout(() => worldMap.invalidateSize(), 100);
        return;
    }

    pageContainer.classList.remove('map-view');
}

function bindAdventureActions() {
    document.addEventListener('click', (event) => {
        const trigger = event.target.closest('[data-action]');
        if (!trigger) return;

        const action = trigger.dataset.action;
        if (action === 'open-adventure-lightbox') {
            const id = trigger.dataset.adventureId;
            const index = Number.parseInt(trigger.dataset.index || '0', 10);
            if (id) openLightbox(id, Number.isNaN(index) ? 0 : index);
            return;
        }

        if (action === 'select-adventure') {
            const id = trigger.dataset.adventureId;
            if (id) selectAdventure(id);
            return;
        }

        if (action === 'scrollToStory') {
            const adventure = allAdventures.find((item) => item.id === selectedAdventureId);
            if (adventure) renderInlineStory(adventure);
        }
    });
}
// ============================================
// Adventures Page Bootstrap
// ============================================

// Phase 3 slice 3.2 (Tier 1+2 plan): copy of nearestWrappedLongitude so
// adventures.js's highlightAdventureOnMap path doesn't depend on the
// map-module having loaded. Same impl as adventures-map.js.
function nearestWrappedLongitude(lng, referenceLng) {
    let wrappedLng = lng;
    while (wrappedLng - referenceLng > 180) wrappedLng -= 360;
    while (wrappedLng - referenceLng < -180) wrappedLng += 360;
    return wrappedLng;
}

async function fetchJson(url, fallback = null) {
    try {
        const response = await fetch(url);
        if (!response.ok) return fallback;
        return await response.json();
    } catch (_error) {
        return fallback;
    }
}

// Phase 3 slice 3.1 (Tier 1+2 plan): adventures-map.js calls fetchJson as a
// bare reference. Expose on globalThis for cross-module resolution.
globalThis.fetchJson = fetchJson;

async function loadAdventures() {
    const data = await fetchJson(ADVENTURES_DATA_URL);
    if (!data || !Array.isArray(data.adventures)) {
        console.error('Error loading adventures');
        showErrorMessage();
        return;
    }
    globalThis.allAdventures = data.adventures.filter((item) => item.status === 'published');
    allAdventures.sort((left, right) => new Date(right.startDate) - new Date(left.startDate));

    renderAdventures(allAdventures);
    populateSidebar(allAdventures);
    setupWorldMapLazyLoad(allAdventures);
    updateAdventureCount(allAdventures.length);
}

function initAdventuresPage() {
    loadFilters();
    bindAdventureActions();
    loadAdventures();

    const key = 'adventures-sidebar-collapsed';
    const split = document.querySelector('.adventures-page-split');
    const button = document.getElementById('adventures-sidebar-toggle');
    if (!split || !button) return;

    if (localStorage.getItem(key) !== '0') {
        split.classList.add('sidebar-collapsed');
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-label', 'Expand sidebar');
    }

    button.addEventListener('click', () => {
        const collapsed = split.classList.toggle('sidebar-collapsed');
        localStorage.setItem(key, collapsed ? '1' : '0');
        button.setAttribute('aria-expanded', String(!collapsed));
        button.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdventuresPage, { once: true });
} else {
    initAdventuresPage();
}
