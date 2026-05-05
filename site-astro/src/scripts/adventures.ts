import {
    state, fetchJson, updateLightboxImage,
    ADVENTURES_DATA_URL, PLACES_DATA_URL, ROUTES_DATA_URL,
    POPULAR_ROUTES_URL, POPULAR_ROUTES_INDEX_URL, PHOTOS_DATA_URL,
    COUNTRIES_GEO_URL, COUNTRIES_VISITED_URL, FILTERS_STORAGE_KEY,
    WEB_MERCATOR_MAX_LAT, HORIZONTAL_WRAP_BOUND, ROUTE_TYPE_COLORS,
    BASEMAPS, DEFAULT_FILTERS
} from './adventures-state';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any;
const escapeHTML = window.escapeHTML as (s: unknown) => string;
const escapeAttr = window.escapeAttr as (s: unknown) => string;
const sanitizeUrl = window.sanitizeUrl as (s: unknown, fallback?: string) => string;
void escapeAttr; void sanitizeUrl;

// ============================================
// Adventures Page Runtime State
// ============================================



// state defaults live in adventures-state.ts. constants
// (BASEMAPS, DEFAULT_FILTERS, *_DATA_URL, ...) imported from the same
// module — no more globalThis.X = X exposure for cross-module reads.

if (typeof window !== 'undefined') {
    window.AdventuresState = {
        get adventures() { return state.allAdventures; },
        set adventures(v) { state.allAdventures = v; },
        get places() { return state.allPlaces; },
        get placeCategories() { return state.placeCategories; },
        get routes() { return state.allRoutes; },
        get photos() { return state.allPhotos; },
        get countries() { return state.countryGeo; },
        get visited() { return state.visitedIso; },
        get filters() { return state.mapFilters; },
        get worldMap() { return state.worldMap; },
        get adventureMaps() { return state.adventureMaps; },
        get adventureMarkers() { return state.adventureMarkers; },
        get selectedId() { return state.selectedAdventureId; },
        set selectedId(v) { state.selectedAdventureId = v; },
        get currentView() { return state.currentAdventureView; },
        set currentView(v) { state.currentAdventureView = v; }
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

function loadFilters() {
    try {
        const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
        if (!raw) return;
        const stored = JSON.parse(raw);
        if (!stored || typeof stored !== 'object') return;

        state.mapFilters = {
            year: stored.year || 'all',
            region: stored.region || 'all',
            layers: { ...DEFAULT_FILTERS.layers, ...(stored.layers || {}) },
            poiCategories: { ...(stored.poiCategories || {}) },
            basemap: stored.basemap || 'satellite',
            routeSet: stored.routeSet || 'all'
        };
        state.placesVisible = state.mapFilters.layers.pois;
    } catch (_error) {
    }
}

function saveFilters() {
    try {
        localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(state.mapFilters));
    } catch (_error) {
    }
}

// Async loader for the heavier Adventures map runtime.
function loadAdventuresMapBundle() {
    if (window.AdventuresMap) return Promise.resolve(window.AdventuresMap);
    if (state.adventuresMapBundlePromise) return state.adventuresMapBundlePromise;

    // native dynamic import. Vite/Astro emits a separate
    // chunk for the heavy map runtime — kept off the initial adventures bundle.
    state.adventuresMapBundlePromise = import('./adventures-map.js').then(() => {
        if (!window.AdventuresMap) throw new Error('Adventures map API was not registered');
        return window.AdventuresMap;
    });

    return state.adventuresMapBundlePromise;
}

function setupWorldMapLazyLoad(adventures: AnyObj[]) {
    const mapContainer = document.getElementById('world-map');
    if (!mapContainer) return;

    // On mobile, the map starts hidden (tab-style layout). Don't mount
    // until the user switches to the map tab.
    const split = document.querySelector('.adventures-page-split');
    const mobileToggle = document.querySelector('.adventures-mobile-toggle');
    const isMobileTabs = mobileToggle && getComputedStyle(mobileToggle).display !== 'none';
    if (isMobileTabs && !split?.classList.contains('map-view')) {
        const load = () => ensureWorldMap(adventures);
        mapContainer.addEventListener('pointerdown', load, { once: true, passive: true });
        mapContainer.addEventListener('touchstart', load, { once: true, passive: true });
        return;
    }

    // Desktop: mount the map immediately. Users want to see the map, not
    // a placeholder asking them to click Load.
    ensureWorldMap(adventures);
}

function ensureWorldMap(adventures = state.allAdventures) {
    const mapContainer = document.getElementById('world-map');
    mapContainer?.classList.add('map-loading');
    return loadAdventuresMapBundle().then((api: AnyObj) => api.ensureWorldMap(adventures));
}


// ============================================
// Adventures Page UI
// ============================================

let hasAdoptedSsrAdventures = false;
function renderAdventures(adventures: AnyObj[]) {
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

    // Astro SSRs every card with explicit width/height. On the
    // first render call, if the DOM already matches the data, just attach
    // click handlers to the existing cards instead of wiping + re-rendering.
    // Skipping the rebuild kills the CLS spike caused by re-renders that
    // dropped the width/height image attrs.
    if (!hasAdoptedSsrAdventures && container.children.length === adventures.length) {
        hasAdoptedSsrAdventures = true;
        const ids = adventures.map((a) => a.id);
        let allMatch = true;
        for (let i = 0; i < container.children.length; i++) {
            if ((container.children[i] as HTMLElement).dataset.adventureId !== ids[i]) { allMatch = false; break; }
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

function createCompactCard(adventure: AnyObj) {
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

function selectAdventure(id: string) {
    const adventure = state.allAdventures.find((item: AnyObj) => item.id === id);
    if (!adventure) return;

    document.querySelectorAll('.adventure-compact-card').forEach((card) => {
        card.classList.remove('active');
    });

    const selectedCard = document.getElementById(`card-${id}`);
    if (selectedCard) selectedCard.classList.add('active');

    state.selectedAdventureId = id;
    highlightAdventureOnMap(adventure);
    showAdventureDetail(adventure);
}

function showAdventureDetail(adventure: AnyObj) {
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

function renderInlineStory(adventure: AnyObj) {
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
                <ul>${highlights.map((item: AnyObj) => `<li>${escapeHTML(item)}</li>`).join('')}</ul>
            </div>` : ''}
            ${gallery.length ? `<div class="adventure-story-gallery">
                <h3>Gallery</h3>
                <div class="adventure-story-gallery-grid">
                    ${gallery.map((item: AnyObj, index: number) => `<figure class="adventure-story-gallery-item" data-action="open-adventure-lightbox" data-adventure-id="${escapeAttr(adventure.id)}" data-index="${index}">
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

    state.selectedAdventureId = null;
    clearMapHighlight();
}

function highlightAdventureOnMap(adventure: AnyObj) {
    if (!state.worldMap) {
        ensureWorldMap().then(() => highlightAdventureOnMap(adventure));
        return;
    }
    if (!adventure || !adventure.mapCenter) return;

    const targetLng = nearestWrappedLongitude(adventure.mapCenter.lng, state.worldMap.getCenter().lng);
    state.worldMap.setView([adventure.mapCenter.lat, targetLng], 5, {
        animate: true,
        duration: 0.5
    });
}

function clearMapHighlight() {
    if (!state.worldMap) {
        if (window.AdventuresMap) window.AdventuresMap.ensureWorldMap().then(clearMapHighlight);
        return;
    }
    state.worldMap.setView([20, 0], 2, {
        animate: true,
        duration: 0.5
    });
}

function openLightbox(adventureId: string, index: number) {
    const adventure = state.allAdventures.find((item: AnyObj) => item.id === adventureId);
    if (!adventure || !adventure.gallery) return;

    state.lightboxImages = adventure.gallery;
    state.lightboxIndex = index;

    updateLightboxImage();
    (document.getElementById('lightbox') as HTMLElement).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    (document.getElementById('lightbox') as HTMLElement).classList.remove('active');
    document.body.style.overflow = 'auto';
}

function nextImage() {
    state.lightboxIndex = (state.lightboxIndex + 1) % state.lightboxImages.length;
    updateLightboxImage();
}

function prevImage() {
    state.lightboxIndex = (state.lightboxIndex - 1 + state.lightboxImages.length) % state.lightboxImages.length;
    updateLightboxImage();
}

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

function populateSidebar(adventures: AnyObj[]) {
    const regions: Record<string, number> = {
        all: adventures.length,
        europe: 0,
        asia: 0,
        australia: 0,
        americas: 0,
        other: 0
    };

    adventures.forEach((adventure: AnyObj) => {
        const region = (adventure.region || 'other').toLowerCase();
        if (Object.prototype.hasOwnProperty.call(regions, region)) regions[region] += 1;
        else regions.other += 1;
    });

    Object.keys(regions).forEach((region) => {
        const countEl = document.getElementById(`count-${region}`);
        if (countEl) countEl.textContent = String(regions[region]);
    });
}

function toggleFilter(region: string, buttonEl: HTMLElement) {
    if (state.activeFilters.has(region)) {
        state.activeFilters.delete(region);
        buttonEl.classList.remove('active');
    } else {
        state.activeFilters.add(region);
        buttonEl.classList.add('active');
    }

    updateAllButtonState();
    applyFilters();
}

function resetFilters(buttonEl: HTMLElement) {
    state.activeFilters.clear();
    document.querySelectorAll('.filter-pill:not([data-region="all"])').forEach((btn) => {
        btn.classList.remove('active');
    });

    buttonEl.classList.add('active');
    closeAdventureDetail();
    renderAdventures(state.allAdventures);
    updateAdventureCount(state.allAdventures.length);
}

function updateAllButtonState() {
    const allBtn = document.querySelector('.filter-pill[data-region="all"]');
    if (!allBtn) return;
    allBtn.classList.toggle('active', state.activeFilters.size === 0);
}

function applyFilters() {
    let filtered = state.allAdventures;

    if (state.activeFilters.size > 0) {
        filtered = state.allAdventures.filter((adventure: AnyObj) => {
            const region = (adventure.region || 'other').toLowerCase();
            return state.activeFilters.has(region);
        });
    }

    renderAdventures(filtered);
    updateAdventureCount(filtered.length);
}

function formatDateRange(startDate: string | Date, endDate: string | Date) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const options: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' };

    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
        return start.toLocaleDateString('en-US', options);
    }

    if (start.getFullYear() === end.getFullYear()) {
        return `${start.toLocaleDateString('en-US', { month: 'short' })} - ${end.toLocaleDateString('en-US', options)}`;
    }

    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
}

function updateAdventureCount(count: number) {
    const countEl = document.getElementById('adventure-count');
    if (countEl) countEl.textContent = String(count);
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
    if (worldMapEl) (worldMapEl as HTMLElement).style.display = 'none';
}

function switchMobileView(view: string) {
    const pageContainer = document.querySelector('.adventures-page-split');
    const buttons = document.querySelectorAll('.mobile-view-btn');
    if (!pageContainer) return;

    buttons.forEach((btn) => {
        btn.classList.toggle('active', (btn as HTMLElement).dataset.view === view);
    });

    if (view === 'map') {
        pageContainer.classList.add('map-view');
        ensureWorldMap();
        if (state.worldMap) setTimeout(() => state.worldMap.invalidateSize(), 100);
        return;
    }

    pageContainer.classList.remove('map-view');
}

function bindAdventureActions() {
    document.addEventListener('click', (event) => {
        const trigger = (event.target as Element | null)?.closest?.('[data-action]') as HTMLElement | null;
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
            const adventure = state.allAdventures.find((item: AnyObj) => item.id === state.selectedAdventureId);
            if (adventure) renderInlineStory(adventure);
            return;
        }

        if (action === 'loadWorldMap') {
            ensureWorldMap();
        }
    });
}
// ============================================
// Adventures Page Bootstrap
// ============================================

// copy of nearestWrappedLongitude so
// adventures.js's highlightAdventureOnMap path doesn't depend on the
// map-module having loaded. Same impl as adventures-map.js.
function nearestWrappedLongitude(lng: number, referenceLng: number) {
    let wrappedLng = lng;
    while (wrappedLng - referenceLng > 180) wrappedLng -= 360;
    while (wrappedLng - referenceLng < -180) wrappedLng += 360;
    return wrappedLng;
}

async function loadAdventures() {
    const data = await fetchJson(ADVENTURES_DATA_URL) as AnyObj;
    if (!data || !Array.isArray(data.adventures)) {
        console.error('Error loading adventures');
        showErrorMessage();
        return;
    }
    state.allAdventures = (data.adventures as AnyObj[]).filter((item: AnyObj) => item.status === 'published');
    state.allAdventures.sort((left: AnyObj, right: AnyObj) => new Date(right.startDate).getTime() - new Date(left.startDate).getTime());

    renderAdventures(state.allAdventures);
    populateSidebar(state.allAdventures);
    setupWorldMapLazyLoad(state.allAdventures);
    updateAdventureCount(state.allAdventures.length);
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

// Register data-action handlers used by HTML markup.
window.JGActions?.register({
    saveFilters,
    toggleFilter,
    resetFilters,
    switchMobileView
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdventuresPage, { once: true });
} else {
    initAdventuresPage();
}

export {};
