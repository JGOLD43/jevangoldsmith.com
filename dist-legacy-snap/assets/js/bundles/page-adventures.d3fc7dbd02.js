
/* js/action-dispatcher.js */
(function () {
    const registry = Object.create(null);

    function register(actions) {
        Object.assign(registry, actions || {});
    }

    function resolveAction(name) {
        return registry[name] || window[name];
    }

    function defaultEventType(el) {
        const tag = (el.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return 'input';
        return 'click';
    }

    function parseArgs(raw) {
        if (!raw) return [];
        return raw.split('|').map((value) => decodeURIComponent(value));
    }

    function findActionTarget(event, eventType) {
        if (eventType === 'click') {
            return event.target.closest('[data-action]');
        }
        if (event.target && event.target.matches('[data-action]')) {
            return event.target;
        }
        return null;
    }

    function runAction(event, eventType) {
        const el = findActionTarget(event, eventType);
        if (!el) return;

        const actionEvent = el.dataset.actionEvent || defaultEventType(el);
        if (actionEvent !== eventType) return;

        const fnName = el.dataset.action;
        const fn = resolveAction(fnName);
        if (typeof fn !== 'function') return;

        const args = parseArgs(el.dataset.actionArgs);
        if (el.dataset.actionValue === 'true') args.push(el.value);
        if (el.dataset.actionThis === 'true') args.push(el);
        if (el.dataset.actionEventobj === 'true') args.push(event);

        const result = fn.apply(window, args);
        if (el.dataset.actionPreventDefault === 'true' || result === false) {
            event.preventDefault();
        }
    }

    document.addEventListener('click', function (event) {
        runAction(event, 'click');
    });

    document.addEventListener('input', function (event) {
        runAction(event, 'input');
    });

    document.addEventListener('submit', function (event) {
        runAction(event, 'submit');
    });

    window.JGActions = { register };
}());



/* js/adventures-runtime.js */
// ============================================
// Adventures Page Runtime State
// ============================================

const ADVENTURES_DATA_URL = 'data/adventures.json';
const PLACES_DATA_URL = 'data/placeofinterest.json';
const ROUTES_DATA_URL = 'data/routes.generated.json';
const POPULAR_ROUTES_URL = 'data/popular-routes.json';
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

let allAdventures = [];
let allPlaces = [];
let placeCategories = [];
let allRoutes = [];
let allPhotos = [];
let countryGeo = null;
let visitedIso = new Set();
let placesVisible = true;
let placeMarkers = [];
let routeLayer = null;
let photoLayer = null;
let countryLayer = null;
let basemapTileLayer = null;
let activeFilters = new Set();
let mapFilters = { ...DEFAULT_FILTERS, layers: { ...DEFAULT_FILTERS.layers }, poiCategories: {} };
let lightboxImages = [];
let lightboxIndex = 0;
let worldMap = null;
let adventureMaps = {};
let adventureMarkers = {};
let leafletPromise = null;
let markerClusterPromise = null;
let worldMapRequested = false;
let selectedAdventureId = null;
let currentAdventureView = 'list';

const FAST_BASEMAP_LAND = [
    [[72, -168], [68, -52], [56, -58], [48, -70], [32, -81], [19, -105], [24, -125], [39, -124], [51, -134], [59, -151]],
    [[34, -116], [29, -95], [17, -88], [8, -80], [-4, -81], [-18, -75], [-35, -70], [-55, -66], [-52, -45], [-30, -39], [-7, -35], [8, -50], [18, -63], [24, -82]],
    [[72, -10], [70, 42], [62, 98], [55, 145], [42, 158], [28, 124], [8, 104], [6, 78], [21, 59], [31, 35], [40, 23], [45, 5], [54, -7]],
    [[35, -18], [30, 32], [14, 45], [-3, 40], [-20, 30], [-35, 19], [-34, 1], [-20, -12], [5, -17], [22, -16]],
    [[-11, 112], [-11, 154], [-28, 154], [-39, 145], [-35, 116]],
    [[-34, 166], [-36, 178], [-46, 170], [-43, 166]],
    [[37, 126], [45, 142], [31, 146]],
    [[-12, 45], [-25, 50], [-22, 43]]
];



/* js/adventures-ui.js */
// ============================================
// Adventures Page UI
// ============================================

function renderAdventures(adventures) {
    const container = document.getElementById('adventures-container');
    if (!container) return;

    container.innerHTML = '';

    if (adventures.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <p style="color: var(--text-light);">No adventures found in this region.</p>
            </div>
        `;
        return;
    }

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

    card.innerHTML = `
        <img src="${escapeAttr(adventure.heroImage)}" alt="${escapeAttr(adventure.title)}" class="adventure-compact-image" loading="lazy" decoding="async">
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

    selectedAdventureId = id;
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

    selectedAdventureId = null;
    clearMapHighlight();
}

function highlightAdventureOnMap(adventure) {
    if (!worldMap) {
        ensureWorldMap();
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
    if (!worldMap) return;
    worldMap.setView([20, 0], 2, {
        animate: true,
        duration: 0.5
    });
}

function openLightbox(adventureId, index) {
    const adventure = allAdventures.find((item) => item.id === adventureId);
    if (!adventure || !adventure.gallery) return;

    lightboxImages = adventure.gallery;
    lightboxIndex = index;

    updateLightboxImage();
    document.getElementById('lightbox').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    document.getElementById('lightbox').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function nextImage() {
    lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
    updateLightboxImage();
}

function prevImage() {
    lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
    updateLightboxImage();
}

function updateLightboxImage() {
    const photo = lightboxImages[lightboxIndex];
    document.getElementById('lightbox-image').src = photo.src;
    document.getElementById('lightbox-caption').textContent = photo.caption || '';
    document.getElementById('lightbox-counter').textContent = `${lightboxIndex + 1} / ${lightboxImages.length}`;
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



/* js/adventures-map.js */
// ============================================
// Adventures Page Data + Map Runtime
// ============================================

async function fetchJson(url, fallback = null) {
    try {
        const response = await fetch(url);
        if (!response.ok) return fallback;
        return await response.json();
    } catch (_error) {
        return fallback;
    }
}

function createMapMarker({ lat, lng, iconClass, iconHtml, iconSize, iconAnchor, popupAnchor, popupHtml, onClick, riseOnHover = false, layer }) {
    const iconOpts = { className: iconClass, html: iconHtml, iconSize };
    if (iconAnchor) iconOpts.iconAnchor = iconAnchor;
    if (popupAnchor) iconOpts.popupAnchor = popupAnchor;
    const marker = L.marker([lat, lng], { icon: L.divIcon(iconOpts), riseOnHover });
    if (popupHtml) marker.bindPopup(popupHtml);
    if (onClick) marker.on('click', onClick);
    if (layer) marker.addTo(layer);
    return marker;
}

function injectVendorBundle({ cssHrefs = [], scriptSrc, marker }) {
    return new Promise((resolve, reject) => {
        if (marker && !document.querySelector(`link[${marker}]`)) {
            cssHrefs.forEach((href, index) => {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = href;
                if (index === 0) link.setAttribute(marker, 'true');
                document.head.appendChild(link);
            });
        } else if (!marker) {
            cssHrefs.forEach((href) => {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = href;
                document.head.appendChild(link);
            });
        }
        const script = document.createElement('script');
        script.src = scriptSrc;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

async function loadAdventures() {
    const data = await fetchJson(ADVENTURES_DATA_URL);
    if (!data || !Array.isArray(data.adventures)) {
        console.error('Error loading adventures');
        showErrorMessage();
        return;
    }
    allAdventures = data.adventures.filter((item) => item.status === 'published');
    allAdventures.sort((left, right) => new Date(right.startDate) - new Date(left.startDate));

    renderAdventures(allAdventures);
    populateSidebar(allAdventures);
    setupWorldMapLazyLoad(allAdventures);
    updateAdventureCount(allAdventures.length);
}

async function loadPlacesOfInterest() {
    const data = await fetchJson(PLACES_DATA_URL);
    if (!data) return;
    allPlaces = Array.isArray(data.places) ? data.places : [];
    placeCategories = Array.isArray(data.categories) ? data.categories : [];
    for (const category of placeCategories) {
        if (mapFilters.poiCategories[category.id] === undefined) {
            mapFilters.poiCategories[category.id] = true;
        }
    }
    saveFilters();
}

async function loadCountriesData() {
    const [geo, visited] = await Promise.all([
        fetchJson(COUNTRIES_GEO_URL),
        fetchJson(COUNTRIES_VISITED_URL)
    ]);
    if (geo) countryGeo = geo;
    if (visited) visitedIso = new Set(Array.isArray(visited.iso) ? visited.iso : []);
}

async function loadRoutes() {
    const [primary, popular] = await Promise.all([
        fetchJson(ROUTES_DATA_URL, { routes: [] }),
        fetchJson(POPULAR_ROUTES_URL, { routes: [] })
    ]);
    allRoutes = [
        ...(Array.isArray(primary?.routes) ? primary.routes : []),
        ...(Array.isArray(popular?.routes) ? popular.routes : [])
    ];
}

async function loadPhotos() {
    const data = await fetchJson(PHOTOS_DATA_URL, { photos: [] });
    allPhotos = Array.isArray(data?.photos) ? data.photos : [];
}

function loadMarkerCluster() {
    if (window.L && window.L.markerClusterGroup) return Promise.resolve();
    if (markerClusterPromise) return markerClusterPromise;
    markerClusterPromise = injectVendorBundle({
        cssHrefs: [
            'vendor/leaflet.markercluster/MarkerCluster.css',
            'vendor/leaflet.markercluster/MarkerCluster.Default.css'
        ],
        scriptSrc: 'vendor/leaflet.markercluster/leaflet.markercluster.js'
    });
    return markerClusterPromise;
}

function nearestWrappedLongitude(lng, referenceLng) {
    let wrappedLng = lng;
    while (wrappedLng - referenceLng > 180) wrappedLng -= 360;
    while (wrappedLng - referenceLng < -180) wrappedLng += 360;
    return wrappedLng;
}

function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (leafletPromise) return leafletPromise;
    leafletPromise = injectVendorBundle({
        cssHrefs: ['vendor/leaflet/leaflet.css'],
        scriptSrc: 'vendor/leaflet/leaflet.js',
        marker: 'data-leaflet-css'
    }).then(() => window.L);
    return leafletPromise;
}

function addFastBaseMap(map) {
    if (!window.L || !map || map._fastBaseMapAdded) return;

    map.createPane('fastBasemap');
    map.getPane('fastBasemap').style.zIndex = 180;
    map.getPane('overlayPane').style.zIndex = 400;

    FAST_BASEMAP_LAND.forEach((shape) => {
        L.polygon(shape, {
            pane: 'fastBasemap',
            interactive: false,
            stroke: true,
            color: 'rgba(255,255,255,0.52)',
            weight: 1,
            fillColor: '#24394d',
            fillOpacity: 0.92
        }).addTo(map);
    });

    L.polyline([[0, -180], [0, 180]], {
        pane: 'fastBasemap',
        interactive: false,
        color: 'rgba(255,255,255,0.18)',
        weight: 1,
        dashArray: '4 8'
    }).addTo(map);

    map._fastBaseMapAdded = true;
}

function addSatelliteTiles(map) {
    setBasemap(map, mapFilters.basemap || 'satellite');
}

function setBasemap(map, name) {
    if (!window.L || !map) return;
    const def = BASEMAPS[name] || BASEMAPS.satellite;

    if (basemapTileLayer && map === worldMap) {
        if (Array.isArray(basemapTileLayer)) basemapTileLayer.forEach((layer) => map.removeLayer(layer));
        else map.removeLayer(basemapTileLayer);
        basemapTileLayer = null;
    }

    const options = {
        maxZoom: def.maxZoom || 19,
        noWrap: false,
        detectRetina: false,
        updateWhenIdle: false,
        updateWhenZooming: true,
        keepBuffer: 6,
        crossOrigin: true
    };

    if (def.subdomains) options.subdomains = def.subdomains;
    const layer = L.tileLayer(def.tile, options).addTo(map);
    let overlayLayer = null;

    if (def.overlay) {
        overlayLayer = L.tileLayer(def.overlay, { ...options, subdomains: '' }).addTo(map);
    }

    if (map === worldMap) basemapTileLayer = overlayLayer ? [layer, overlayLayer] : layer;
}

function setupWorldMapLazyLoad(adventures) {
    const mapContainer = document.getElementById('world-map');
    if (!mapContainer) return;

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                observer.disconnect();
                ensureWorldMap(adventures);
            }
        }, { rootMargin: '280px' });
        observer.observe(mapContainer);
        return;
    }

    ensureWorldMap(adventures);
}

async function ensureWorldMap(adventures = allAdventures) {
    if (worldMapRequested || worldMap) return;
    worldMapRequested = true;
    await loadLeaflet();
    initWorldMap(adventures);
}

function initWorldMap(adventures) {
    const mapContainer = document.getElementById('world-map');
    if (!mapContainer || worldMap || !window.L) return;

    const adventuresWithLocation = adventures.filter((adventure) => adventure.mapCenter);
    if (adventuresWithLocation.length === 0) {
        mapContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#666;">No location data available</div>';
        return;
    }

    const verticalBounds = L.latLngBounds(
        [-WEB_MERCATOR_MAX_LAT, -HORIZONTAL_WRAP_BOUND],
        [WEB_MERCATOR_MAX_LAT, HORIZONTAL_WRAP_BOUND]
    );

    worldMap = L.map('world-map', {
        preferCanvas: true,
        zoomControl: true,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        touchZoom: true,
        keyboard: true,
        worldCopyJump: true,
        minZoom: 2,
        maxZoom: 18,
        maxBounds: verticalBounds,
        maxBoundsViscosity: 1.0,
        zoomSnap: 0.25,
        zoomDelta: 1,
        wheelDebounceTime: 20,
        wheelPxPerZoomLevel: 50,
        inertia: true,
        inertiaDeceleration: 2500,
        fadeAnimation: true,
        zoomAnimation: true,
        markerZoomAnimation: true
    }).setView([25, 40], 3);

    addFastBaseMap(worldMap);
    addSatelliteTiles(worldMap);

    const worldCopyOffsets = [-360, 0, 360];
    adventures.forEach((adventure) => {
        if (!adventure.mapCenter) return;

        const popupHtml = `
            <div style="min-width: 180px; text-align: center; padding: 0.5rem;">
                <strong style="font-size: 1rem;">${escapeHTML(adventure.title)}</strong><br>
                <span style="color: #666; font-size: 0.85rem;">${escapeHTML(adventure.location)}</span><br>
                <button data-action="select-adventure" data-adventure-id="${escapeAttr(adventure.id)}"
                   style="margin-top: 0.5rem; padding: 0.4rem 1rem; background: #C9A86C; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
                   View Details
                </button>
            </div>
        `;

        worldCopyOffsets.forEach((offset, index) => {
            const marker = createMapMarker({
                lat: adventure.mapCenter.lat,
                lng: adventure.mapCenter.lng + offset,
                iconClass: 'adventure-marker-icon',
                iconHtml: '<span class="adv-marker-pulse"></span><span class="adv-marker-ring"></span><span class="adv-marker-dot"></span>',
                iconSize: [28, 28],
                iconAnchor: [14, 14],
                popupAnchor: [0, -14],
                popupHtml,
                onClick: () => selectAdventure(adventure.id),
                riseOnHover: true,
                layer: worldMap
            });
            if (index === 1) adventureMarkers[adventure.id] = marker;
        });
    });

    renderPlaceMarkers();
    renderCountryLayer();
    renderRouteLayer();
    renderPhotoLayer();
    applyAdventureMarkerFilter();
    buildMapControlStack();

    const markerBounds = L.latLngBounds(adventuresWithLocation.map((adventure) => [
        adventure.mapCenter.lat,
        adventure.mapCenter.lng
    ]));
    worldMap.fitBounds(markerBounds.pad(0.28), { animate: false, maxZoom: 3 });

    requestAnimationFrame(() => {
        worldMap.invalidateSize();
        worldMap.fitBounds(markerBounds.pad(0.28), { animate: false, maxZoom: 3 });
    });

    if ('ResizeObserver' in window) {
        let resizeRaf = 0;
        const observer = new ResizeObserver(() => {
            if (resizeRaf) cancelAnimationFrame(resizeRaf);
            resizeRaf = requestAnimationFrame(() => {
                resizeRaf = 0;
                if (worldMap) worldMap.invalidateSize();
            });
        });
        observer.observe(mapContainer);
    }

    const split = document.querySelector('.adventures-page-split');
    if (split) {
        split.addEventListener('transitionend', (event) => {
            if (event.propertyName === 'grid-template-columns' && worldMap) {
                worldMap.invalidateSize();
            }
        });
    }
}

function renderPlaceMarkers() {
    if (!worldMap || !window.L) return;

    placeMarkers.forEach((marker) => worldMap.removeLayer(marker));
    placeMarkers = [];

    if (!mapFilters.layers.pois || allPlaces.length === 0) return;

    const worldCopyOffsets = [-360, 0, 360];
    const categoryColor = (id) => {
        const category = placeCategories.find((item) => item.id === id);
        return (category && category.color) || '#2b6cb0';
    };
    const categoryLabel = (id) => {
        const category = placeCategories.find((item) => item.id === id);
        return (category && category.label) || 'Place of interest';
    };

    allPlaces.forEach((place) => {
        if (typeof place.lat !== 'number' || typeof place.lng !== 'number') return;
        if (!matchesRegionFilter(place.region)) return;

        const category = place.category || 'wishlist';
        if (mapFilters.poiCategories[category] === false) return;

        const color = categoryColor(category);
        const label = categoryLabel(category);
        const popupHtml = `
            <div style="min-width: 180px; padding: 0.5rem;">
                <strong style="font-size: 0.95rem;">${escapeHTML(place.name)}</strong><br>
                ${place.location ? `<span style="color: #666; font-size: 0.8rem;">${escapeHTML(place.location)}</span><br>` : ''}
                ${place.notes ? `<p style="margin: 0.4rem 0 0; font-size: 0.85rem; color: #444;">${escapeHTML(place.notes)}</p>` : ''}
                <span style="display:inline-block;margin-top:0.4rem;padding:0.15rem 0.5rem;background:${color};color:#fff;border-radius:3px;font-size:0.7rem;letter-spacing:0.05em;text-transform:uppercase;">${escapeHTML(label)}</span>
            </div>
        `;

        worldCopyOffsets.forEach((offset) => {
            const marker = createMapMarker({
                lat: place.lat,
                lng: place.lng + offset,
                iconClass: 'place-marker-icon',
                iconHtml: `<span class="place-marker-ring" style="--marker-color:${color}"></span><span class="place-marker-dot"></span>`,
                iconSize: [18, 18],
                iconAnchor: [9, 9],
                popupAnchor: [0, -9],
                popupHtml,
                riseOnHover: true,
                layer: worldMap
            });
            placeMarkers.push(marker);
        });
    });
}

function togglePlacesOfInterest(buttonEl) {
    mapFilters.layers.pois = !mapFilters.layers.pois;
    placesVisible = mapFilters.layers.pois;
    if (buttonEl) buttonEl.classList.toggle('active', mapFilters.layers.pois);
    saveFilters();
    renderPlaceMarkers();
}

function loadFilters() {
    try {
        const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
        if (!raw) return;
        const stored = JSON.parse(raw);
        if (!stored || typeof stored !== 'object') return;

        mapFilters = {
            year: stored.year || 'all',
            region: stored.region || 'all',
            layers: { ...DEFAULT_FILTERS.layers, ...(stored.layers || {}) },
            poiCategories: { ...(stored.poiCategories || {}) },
            basemap: stored.basemap || 'satellite',
            routeSet: stored.routeSet || 'all'
        };
        placesVisible = mapFilters.layers.pois;
    } catch (_error) {
    }
}

function saveFilters() {
    try {
        localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(mapFilters));
    } catch (_error) {
    }
}

function adventureYear(adventure) {
    if (!adventure || !adventure.startDate) return null;
    const date = new Date(adventure.startDate);
    return Number.isNaN(date.getTime()) ? null : date.getUTCFullYear();
}

function matchesYearFilter(year) {
    if (mapFilters.year === 'all' || mapFilters.year === null) return true;
    return String(year) === String(mapFilters.year);
}

function matchesRegionFilter(region) {
    if (mapFilters.region === 'all' || !mapFilters.region) return true;
    if (!region) return false;
    return String(region).toLowerCase() === String(mapFilters.region).toLowerCase();
}

function matchesAdventureFilters(adventure) {
    return matchesYearFilter(adventureYear(adventure)) && matchesRegionFilter(adventure.region);
}

function applyAllFilters() {
    saveFilters();
    applyAdventureMarkerFilter();
    renderPlaceMarkers();
    renderRouteLayer();
    renderPhotoLayer();
    renderCountryLayer();
}

function applyAdventureMarkerFilter() {
    if (!worldMap) return;
    Object.entries(adventureMarkers).forEach(([id, marker]) => {
        const adventure = allAdventures.find((item) => item.id === id);
        const visible = mapFilters.layers.adventures && adventure && matchesAdventureFilters(adventure);
        if (visible) {
            if (!worldMap.hasLayer(marker)) worldMap.addLayer(marker);
            return;
        }
        if (worldMap.hasLayer(marker)) worldMap.removeLayer(marker);
    });
}

function renderCountryLayer() {
    if (!worldMap || !window.L) return;
    if (countryLayer) {
        worldMap.removeLayer(countryLayer);
        countryLayer = null;
    }
    if (!mapFilters.layers.countries || !countryGeo) return;

    countryLayer = L.geoJSON(countryGeo, {
        renderer: L.svg(),
        pane: 'overlayPane',
        filter: (feature) => visitedIso.has(feature.properties.iso),
        style: () => ({
            stroke: true,
            color: '#C9A86C',
            weight: 0.8,
            fillColor: '#C9A86C',
            fillOpacity: 0.35,
            className: 'country-fill-visited'
        }),
        onEachFeature: (feature, layer) => {
            layer.bindTooltip(feature.properties.name || feature.properties.iso, { sticky: true });
        }
    }).addTo(worldMap);
}

function renderRouteLayer() {
    if (!worldMap || !window.L) return;
    if (routeLayer) {
        worldMap.removeLayer(routeLayer);
        routeLayer = null;
    }
    if (!mapFilters.layers.routes || allRoutes.length === 0) return;

    const group = L.layerGroup();
    const routeSet = mapFilters.routeSet || 'all';

    allRoutes.forEach((route) => {
        const isBucket = route.adventureId === 'popular-routes';
        if (routeSet === 'mine' && isBucket) return;
        if (routeSet === 'bucket' && !isBucket) return;

        const adventure = allAdventures.find((item) => item.id === route.adventureId);
        if (adventure && !matchesAdventureFilters(adventure)) return;
        if (!route.geometry) return;

        const coords = route.geometry.type === 'MultiLineString'
            ? route.geometry.coordinates
            : [route.geometry.coordinates];

        coords.forEach((line) => {
            const latlngs = line.map(([lng, lat]) => [lat, lng]);
            const color = ROUTE_TYPE_COLORS[route.type] || ROUTE_TYPE_COLORS.track;
            const polyline = L.polyline(latlngs, {
                color,
                weight: 3,
                opacity: isBucket ? 0.7 : 0.85,
                dashArray: isBucket ? '6 6' : null,
                className: `route-line-${route.type || 'track'}${isBucket ? ' route-line-bucket' : ''}`
            });
            const label = isBucket
                ? `🪣 ${escapeHTML(route.name || 'Route')} · ${route.distanceKm || 0} km${route.country ? ` · ${escapeHTML(route.country)}` : ''}`
                : `${escapeHTML(route.name || 'Route')} · ${route.distanceKm || 0} km`;

            polyline.bindTooltip(label, { sticky: true });
            polyline.on('click', (event) => {
                if (event && event.originalEvent) L.DomEvent.stopPropagation(event);
                if (route.adventureId && !isBucket) selectAdventure(route.adventureId);
                const bounds = polyline.getBounds();
                if (bounds.isValid()) {
                    worldMap.fitBounds(bounds.pad(0.25), { animate: true, duration: 0.6, maxZoom: 13 });
                }
            });
            group.addLayer(polyline);
        });
    });

    routeLayer = group.addTo(worldMap);
}

function renderPhotoLayer() {
    if (!worldMap || !window.L) return;
    if (photoLayer) {
        worldMap.removeLayer(photoLayer);
        photoLayer = null;
    }
    if (!mapFilters.layers.photos || allPhotos.length === 0) return;

    const createLayer = () => {
        const cluster = window.L.markerClusterGroup
            ? L.markerClusterGroup({
                chunkedLoading: true,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: false,
                maxClusterRadius: 60
            })
            : L.layerGroup();

        allPhotos.forEach((photo, index) => {
            if (typeof photo.lat !== 'number' || typeof photo.lng !== 'number') return;

            const adventure = allAdventures.find((item) => item.id === photo.adventureId);
            if (adventure && !matchesAdventureFilters(adventure)) return;

            const thumb = photo.thumb || photoUrl(photo.driveId, 200);
            const full = photo.full || photoUrl(photo.driveId, 1600);
            const marker = createMapMarker({
                lat: photo.lat,
                lng: photo.lng,
                iconClass: 'photo-marker',
                iconHtml: `<div class="photo-marker-bubble" style="background-image:url('${escapeAttr(thumb)}')"></div>`,
                iconSize: [36, 36],
                popupHtml: `
                <div class="photo-popup">
                    <img src="${escapeAttr(full)}" alt="${escapeAttr(photo.caption || '')}" style="max-width:260px;max-height:200px;display:block;border-radius:6px;">
                    ${photo.caption ? `<p style="margin:0.4rem 0 0;font-size:0.8rem;color:#444;">${escapeHTML(photo.caption)}</p>` : ''}
                </div>
            `,
                onClick: () => openPhotoLightbox(index)
            });
            cluster.addLayer(marker);
        });

        photoLayer = cluster.addTo(worldMap);
    };

    if (window.L.markerClusterGroup) createLayer();
    else loadMarkerCluster().then(createLayer).catch(() => createLayer());
}

function photoUrl(driveId, size) {
    if (!driveId) return '';
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w${size}`;
}

function openPhotoLightbox(index) {
    lightboxImages = allPhotos
        .filter((photo) => typeof photo.lat === 'number' && typeof photo.lng === 'number')
        .map((photo) => ({
            src: photo.full || photoUrl(photo.driveId, 1600),
            caption: photo.caption || ''
        }));

    lightboxIndex = Math.max(0, Math.min(index, lightboxImages.length - 1));
    updateLightboxImage();

    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function buildMapControlStack() {
    if (!worldMap) return;
    const mapEl = document.getElementById('world-map');
    if (!mapEl || mapEl.querySelector('.map-controls-stack')) return;

    const years = [...new Set(allAdventures.map(adventureYear).filter(Boolean))].sort((left, right) => right - left);
    const regions = [...new Set(allAdventures.map((adventure) => adventure.region).filter(Boolean))].sort();

    const wrapper = document.createElement('div');
    wrapper.className = 'map-controls-stack';
    wrapper.innerHTML = `
        <button type="button" class="map-controls-toggle" data-action="toggle-controls" aria-expanded="false" aria-label="Toggle map controls"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></button>
        <div class="map-controls-body" hidden>
            <div class="map-controls-group">
                <label class="map-controls-label">Layers</label>
                ${renderLayerToggles()}
            </div>
            <div class="map-controls-group">
                <label class="map-controls-label">POI categories</label>
                ${renderPoiToggles()}
            </div>
            <div class="map-controls-group">
                <label class="map-controls-label" for="map-filter-routeset">Route set</label>
                <select id="map-filter-routeset" class="map-controls-select">
                    <option value="all" ${mapFilters.routeSet === 'all' ? 'selected' : ''}>All routes</option>
                    <option value="mine" ${mapFilters.routeSet === 'mine' ? 'selected' : ''}>Mine only</option>
                    <option value="bucket" ${mapFilters.routeSet === 'bucket' ? 'selected' : ''}>Bucket list only</option>
                </select>
            </div>
            <div class="map-controls-group">
                <label class="map-controls-label" for="map-filter-year">Year</label>
                <select id="map-filter-year" class="map-controls-select">
                    <option value="all">All</option>
                    ${years.map((year) => `<option value="${year}" ${String(mapFilters.year) === String(year) ? 'selected' : ''}>${year}</option>`).join('')}
                </select>
            </div>
            <div class="map-controls-group">
                <label class="map-controls-label" for="map-filter-region">Region</label>
                <select id="map-filter-region" class="map-controls-select">
                    <option value="all">All</option>
                    ${regions.map((region) => `<option value="${escapeAttr(region)}" ${String(mapFilters.region).toLowerCase() === String(region).toLowerCase() ? 'selected' : ''}>${escapeHTML(region)}</option>`).join('')}
                </select>
            </div>
            <div class="map-controls-group">
                <label class="map-controls-label" for="map-filter-basemap">Basemap</label>
                <select id="map-filter-basemap" class="map-controls-select">
                    ${Object.entries(BASEMAPS).map(([key, value]) => `<option value="${key}" ${mapFilters.basemap === key ? 'selected' : ''}>${escapeHTML(value.label)}</option>`).join('')}
                </select>
            </div>
        </div>
    `;
    mapEl.appendChild(wrapper);

    wrapper.addEventListener('click', (event) => {
        const trigger = event.target.closest('[data-action]');
        if (!trigger) return;
        if (trigger.dataset.action !== 'toggle-controls') return;

        const body = wrapper.querySelector('.map-controls-body');
        const open = !body.hasAttribute('hidden');
        if (open) body.setAttribute('hidden', '');
        else body.removeAttribute('hidden');
        trigger.setAttribute('aria-expanded', String(!open));
    });

    wrapper.addEventListener('change', (event) => {
        const target = event.target;
        if (target.matches('input[data-layer]')) {
            mapFilters.layers[target.dataset.layer] = target.checked;
            applyAllFilters();
            return;
        }
        if (target.matches('input[data-poi-category]')) {
            mapFilters.poiCategories[target.dataset.poiCategory] = target.checked;
            saveFilters();
            renderPlaceMarkers();
            return;
        }
        if (target.id === 'map-filter-year') {
            mapFilters.year = target.value;
            applyAllFilters();
            return;
        }
        if (target.id === 'map-filter-region') {
            mapFilters.region = target.value;
            applyAllFilters();
            return;
        }
        if (target.id === 'map-filter-basemap') {
            mapFilters.basemap = target.value;
            saveFilters();
            setBasemap(worldMap, target.value);
            return;
        }
        if (target.id === 'map-filter-routeset') {
            mapFilters.routeSet = target.value;
            saveFilters();
            renderRouteLayer();
        }
    });
}

function renderLayerToggles() {
    const layers = [
        ['adventures', 'Adventures'],
        ['routes', 'Routes'],
        ['photos', 'Photos'],
        ['pois', 'POIs'],
        ['countries', 'Countries visited']
    ];

    return layers.map(([key, label]) => `
        <label class="map-controls-check">
            <input type="checkbox" data-layer="${key}" ${mapFilters.layers[key] ? 'checked' : ''}>
            <span>${escapeHTML(label)}</span>
        </label>
    `).join('');
}

function renderPoiToggles() {
    if (!placeCategories.length) return '<p class="map-controls-empty">No categories</p>';
    return placeCategories.map((category) => `
        <label class="map-controls-check">
            <input type="checkbox" data-poi-category="${escapeAttr(category.id)}" ${mapFilters.poiCategories[category.id] !== false ? 'checked' : ''}>
            <span style="--poi-dot:${escapeAttr(category.color || '#666')}">${escapeHTML(category.label)}</span>
        </label>
    `).join('');
}



/* js/adventures.js */
// ============================================
// Adventures Page Bootstrap
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    loadFilters();
    bindAdventureActions();

    loadPlacesOfInterest().then(() => {
        if (worldMap) renderPlaceMarkers();
    });
    loadCountriesData().then(() => {
        if (worldMap) renderCountryLayer();
    });
    loadRoutes().then(() => {
        if (worldMap) renderRouteLayer();
    });
    loadPhotos().then(() => {
        if (worldMap) renderPhotoLayer();
    });
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
});



/* vendor/dompurify/purify.min.js */
/*! @license DOMPurify 3.2.4 | (c) Cure53 and other contributors | Released under the Apache license 2.0 and Mozilla Public License 2.0 | github.com/cure53/DOMPurify/blob/3.2.4/LICENSE */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):(e="undefined"!=typeof globalThis?globalThis:e||self).DOMPurify=t()}(this,(function(){"use strict";const{entries:e,setPrototypeOf:t,isFrozen:n,getPrototypeOf:o,getOwnPropertyDescriptor:r}=Object;let{freeze:i,seal:a,create:l}=Object,{apply:c,construct:s}="undefined"!=typeof Reflect&&Reflect;i||(i=function(e){return e}),a||(a=function(e){return e}),c||(c=function(e,t,n){return e.apply(t,n)}),s||(s=function(e,t){return new e(...t)});const u=R(Array.prototype.forEach),m=R(Array.prototype.lastIndexOf),p=R(Array.prototype.pop),f=R(Array.prototype.push),d=R(Array.prototype.splice),h=R(String.prototype.toLowerCase),g=R(String.prototype.toString),T=R(String.prototype.match),y=R(String.prototype.replace),E=R(String.prototype.indexOf),A=R(String.prototype.trim),_=R(Object.prototype.hasOwnProperty),S=R(RegExp.prototype.test),b=(N=TypeError,function(){for(var e=arguments.length,t=new Array(e),n=0;n<e;n++)t[n]=arguments[n];return s(N,t)});var N;function R(e){return function(t){for(var n=arguments.length,o=new Array(n>1?n-1:0),r=1;r<n;r++)o[r-1]=arguments[r];return c(e,t,o)}}function w(e,o){let r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:h;t&&t(e,null);let i=o.length;for(;i--;){let t=o[i];if("string"==typeof t){const e=r(t);e!==t&&(n(o)||(o[i]=e),t=e)}e[t]=!0}return e}function O(e){for(let t=0;t<e.length;t++){_(e,t)||(e[t]=null)}return e}function D(t){const n=l(null);for(const[o,r]of e(t)){_(t,o)&&(Array.isArray(r)?n[o]=O(r):r&&"object"==typeof r&&r.constructor===Object?n[o]=D(r):n[o]=r)}return n}function v(e,t){for(;null!==e;){const n=r(e,t);if(n){if(n.get)return R(n.get);if("function"==typeof n.value)return R(n.value)}e=o(e)}return function(){return null}}const L=i(["a","abbr","acronym","address","area","article","aside","audio","b","bdi","bdo","big","blink","blockquote","body","br","button","canvas","caption","center","cite","code","col","colgroup","content","data","datalist","dd","decorator","del","details","dfn","dialog","dir","div","dl","dt","element","em","fieldset","figcaption","figure","font","footer","form","h1","h2","h3","h4","h5","h6","head","header","hgroup","hr","html","i","img","input","ins","kbd","label","legend","li","main","map","mark","marquee","menu","menuitem","meter","nav","nobr","ol","optgroup","option","output","p","picture","pre","progress","q","rp","rt","ruby","s","samp","section","select","shadow","small","source","spacer","span","strike","strong","style","sub","summary","sup","table","tbody","td","template","textarea","tfoot","th","thead","time","tr","track","tt","u","ul","var","video","wbr"]),C=i(["svg","a","altglyph","altglyphdef","altglyphitem","animatecolor","animatemotion","animatetransform","circle","clippath","defs","desc","ellipse","filter","font","g","glyph","glyphref","hkern","image","line","lineargradient","marker","mask","metadata","mpath","path","pattern","polygon","polyline","radialgradient","rect","stop","style","switch","symbol","text","textpath","title","tref","tspan","view","vkern"]),x=i(["feBlend","feColorMatrix","feComponentTransfer","feComposite","feConvolveMatrix","feDiffuseLighting","feDisplacementMap","feDistantLight","feDropShadow","feFlood","feFuncA","feFuncB","feFuncG","feFuncR","feGaussianBlur","feImage","feMerge","feMergeNode","feMorphology","feOffset","fePointLight","feSpecularLighting","feSpotLight","feTile","feTurbulence"]),M=i(["animate","color-profile","cursor","discard","font-face","font-face-format","font-face-name","font-face-src","font-face-uri","foreignobject","hatch","hatchpath","mesh","meshgradient","meshpatch","meshrow","missing-glyph","script","set","solidcolor","unknown","use"]),k=i(["math","menclose","merror","mfenced","mfrac","mglyph","mi","mlabeledtr","mmultiscripts","mn","mo","mover","mpadded","mphantom","mroot","mrow","ms","mspace","msqrt","mstyle","msub","msup","msubsup","mtable","mtd","mtext","mtr","munder","munderover","mprescripts"]),I=i(["maction","maligngroup","malignmark","mlongdiv","mscarries","mscarry","msgroup","mstack","msline","msrow","semantics","annotation","annotation-xml","mprescripts","none"]),U=i(["#text"]),z=i(["accept","action","align","alt","autocapitalize","autocomplete","autopictureinpicture","autoplay","background","bgcolor","border","capture","cellpadding","cellspacing","checked","cite","class","clear","color","cols","colspan","controls","controlslist","coords","crossorigin","datetime","decoding","default","dir","disabled","disablepictureinpicture","disableremoteplayback","download","draggable","enctype","enterkeyhint","face","for","headers","height","hidden","high","href","hreflang","id","inputmode","integrity","ismap","kind","label","lang","list","loading","loop","low","max","maxlength","media","method","min","minlength","multiple","muted","name","nonce","noshade","novalidate","nowrap","open","optimum","pattern","placeholder","playsinline","popover","popovertarget","popovertargetaction","poster","preload","pubdate","radiogroup","readonly","rel","required","rev","reversed","role","rows","rowspan","spellcheck","scope","selected","shape","size","sizes","span","srclang","start","src","srcset","step","style","summary","tabindex","title","translate","type","usemap","valign","value","width","wrap","xmlns","slot"]),P=i(["accent-height","accumulate","additive","alignment-baseline","amplitude","ascent","attributename","attributetype","azimuth","basefrequency","baseline-shift","begin","bias","by","class","clip","clippathunits","clip-path","clip-rule","color","color-interpolation","color-interpolation-filters","color-profile","color-rendering","cx","cy","d","dx","dy","diffuseconstant","direction","display","divisor","dur","edgemode","elevation","end","exponent","fill","fill-opacity","fill-rule","filter","filterunits","flood-color","flood-opacity","font-family","font-size","font-size-adjust","font-stretch","font-style","font-variant","font-weight","fx","fy","g1","g2","glyph-name","glyphref","gradientunits","gradienttransform","height","href","id","image-rendering","in","in2","intercept","k","k1","k2","k3","k4","kerning","keypoints","keysplines","keytimes","lang","lengthadjust","letter-spacing","kernelmatrix","kernelunitlength","lighting-color","local","marker-end","marker-mid","marker-start","markerheight","markerunits","markerwidth","maskcontentunits","maskunits","max","mask","media","method","mode","min","name","numoctaves","offset","operator","opacity","order","orient","orientation","origin","overflow","paint-order","path","pathlength","patterncontentunits","patterntransform","patternunits","points","preservealpha","preserveaspectratio","primitiveunits","r","rx","ry","radius","refx","refy","repeatcount","repeatdur","restart","result","rotate","scale","seed","shape-rendering","slope","specularconstant","specularexponent","spreadmethod","startoffset","stddeviation","stitchtiles","stop-color","stop-opacity","stroke-dasharray","stroke-dashoffset","stroke-linecap","stroke-linejoin","stroke-miterlimit","stroke-opacity","stroke","stroke-width","style","surfacescale","systemlanguage","tabindex","tablevalues","targetx","targety","transform","transform-origin","text-anchor","text-decoration","text-rendering","textlength","type","u1","u2","unicode","values","viewbox","visibility","version","vert-adv-y","vert-origin-x","vert-origin-y","width","word-spacing","wrap","writing-mode","xchannelselector","ychannelselector","x","x1","x2","xmlns","y","y1","y2","z","zoomandpan"]),H=i(["accent","accentunder","align","bevelled","close","columnsalign","columnlines","columnspan","denomalign","depth","dir","display","displaystyle","encoding","fence","frame","height","href","id","largeop","length","linethickness","lspace","lquote","mathbackground","mathcolor","mathsize","mathvariant","maxsize","minsize","movablelimits","notation","numalign","open","rowalign","rowlines","rowspacing","rowspan","rspace","rquote","scriptlevel","scriptminsize","scriptsizemultiplier","selection","separator","separators","stretchy","subscriptshift","supscriptshift","symmetric","voffset","width","xmlns"]),F=i(["xlink:href","xml:id","xlink:title","xml:space","xmlns:xlink"]),B=a(/\{\{[\w\W]*|[\w\W]*\}\}/gm),W=a(/<%[\w\W]*|[\w\W]*%>/gm),G=a(/\$\{[\w\W]*/gm),Y=a(/^data-[\-\w.\u00B7-\uFFFF]+$/),j=a(/^aria-[\-\w]+$/),X=a(/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i),q=a(/^(?:\w+script|data):/i),$=a(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g),K=a(/^html$/i),V=a(/^[a-z][.\w]*(-[.\w]+)+$/i);var Z=Object.freeze({__proto__:null,ARIA_ATTR:j,ATTR_WHITESPACE:$,CUSTOM_ELEMENT:V,DATA_ATTR:Y,DOCTYPE_NAME:K,ERB_EXPR:W,IS_ALLOWED_URI:X,IS_SCRIPT_OR_DATA:q,MUSTACHE_EXPR:B,TMPLIT_EXPR:G});const J=1,Q=3,ee=7,te=8,ne=9,oe=function(){return"undefined"==typeof window?null:window};var re=function t(){let n=arguments.length>0&&void 0!==arguments[0]?arguments[0]:oe();const o=e=>t(e);if(o.version="3.2.4",o.removed=[],!n||!n.document||n.document.nodeType!==ne||!n.Element)return o.isSupported=!1,o;let{document:r}=n;const a=r,c=a.currentScript,{DocumentFragment:s,HTMLTemplateElement:N,Node:R,Element:O,NodeFilter:B,NamedNodeMap:W=n.NamedNodeMap||n.MozNamedAttrMap,HTMLFormElement:G,DOMParser:Y,trustedTypes:j}=n,q=O.prototype,$=v(q,"cloneNode"),V=v(q,"remove"),re=v(q,"nextSibling"),ie=v(q,"childNodes"),ae=v(q,"parentNode");if("function"==typeof N){const e=r.createElement("template");e.content&&e.content.ownerDocument&&(r=e.content.ownerDocument)}let le,ce="";const{implementation:se,createNodeIterator:ue,createDocumentFragment:me,getElementsByTagName:pe}=r,{importNode:fe}=a;let de={afterSanitizeAttributes:[],afterSanitizeElements:[],afterSanitizeShadowDOM:[],beforeSanitizeAttributes:[],beforeSanitizeElements:[],beforeSanitizeShadowDOM:[],uponSanitizeAttribute:[],uponSanitizeElement:[],uponSanitizeShadowNode:[]};o.isSupported="function"==typeof e&&"function"==typeof ae&&se&&void 0!==se.createHTMLDocument;const{MUSTACHE_EXPR:he,ERB_EXPR:ge,TMPLIT_EXPR:Te,DATA_ATTR:ye,ARIA_ATTR:Ee,IS_SCRIPT_OR_DATA:Ae,ATTR_WHITESPACE:_e,CUSTOM_ELEMENT:Se}=Z;let{IS_ALLOWED_URI:be}=Z,Ne=null;const Re=w({},[...L,...C,...x,...k,...U]);let we=null;const Oe=w({},[...z,...P,...H,...F]);let De=Object.seal(l(null,{tagNameCheck:{writable:!0,configurable:!1,enumerable:!0,value:null},attributeNameCheck:{writable:!0,configurable:!1,enumerable:!0,value:null},allowCustomizedBuiltInElements:{writable:!0,configurable:!1,enumerable:!0,value:!1}})),ve=null,Le=null,Ce=!0,xe=!0,Me=!1,ke=!0,Ie=!1,Ue=!0,ze=!1,Pe=!1,He=!1,Fe=!1,Be=!1,We=!1,Ge=!0,Ye=!1,je=!0,Xe=!1,qe={},$e=null;const Ke=w({},["annotation-xml","audio","colgroup","desc","foreignobject","head","iframe","math","mi","mn","mo","ms","mtext","noembed","noframes","noscript","plaintext","script","style","svg","template","thead","title","video","xmp"]);let Ve=null;const Ze=w({},["audio","video","img","source","image","track"]);let Je=null;const Qe=w({},["alt","class","for","id","label","name","pattern","placeholder","role","summary","title","value","style","xmlns"]),et="http://www.w3.org/1998/Math/MathML",tt="http://www.w3.org/2000/svg",nt="http://www.w3.org/1999/xhtml";let ot=nt,rt=!1,it=null;const at=w({},[et,tt,nt],g);let lt=w({},["mi","mo","mn","ms","mtext"]),ct=w({},["annotation-xml"]);const st=w({},["title","style","font","a","script"]);let ut=null;const mt=["application/xhtml+xml","text/html"];let pt=null,ft=null;const dt=r.createElement("form"),ht=function(e){return e instanceof RegExp||e instanceof Function},gt=function(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};if(!ft||ft!==e){if(e&&"object"==typeof e||(e={}),e=D(e),ut=-1===mt.indexOf(e.PARSER_MEDIA_TYPE)?"text/html":e.PARSER_MEDIA_TYPE,pt="application/xhtml+xml"===ut?g:h,Ne=_(e,"ALLOWED_TAGS")?w({},e.ALLOWED_TAGS,pt):Re,we=_(e,"ALLOWED_ATTR")?w({},e.ALLOWED_ATTR,pt):Oe,it=_(e,"ALLOWED_NAMESPACES")?w({},e.ALLOWED_NAMESPACES,g):at,Je=_(e,"ADD_URI_SAFE_ATTR")?w(D(Qe),e.ADD_URI_SAFE_ATTR,pt):Qe,Ve=_(e,"ADD_DATA_URI_TAGS")?w(D(Ze),e.ADD_DATA_URI_TAGS,pt):Ze,$e=_(e,"FORBID_CONTENTS")?w({},e.FORBID_CONTENTS,pt):Ke,ve=_(e,"FORBID_TAGS")?w({},e.FORBID_TAGS,pt):{},Le=_(e,"FORBID_ATTR")?w({},e.FORBID_ATTR,pt):{},qe=!!_(e,"USE_PROFILES")&&e.USE_PROFILES,Ce=!1!==e.ALLOW_ARIA_ATTR,xe=!1!==e.ALLOW_DATA_ATTR,Me=e.ALLOW_UNKNOWN_PROTOCOLS||!1,ke=!1!==e.ALLOW_SELF_CLOSE_IN_ATTR,Ie=e.SAFE_FOR_TEMPLATES||!1,Ue=!1!==e.SAFE_FOR_XML,ze=e.WHOLE_DOCUMENT||!1,Fe=e.RETURN_DOM||!1,Be=e.RETURN_DOM_FRAGMENT||!1,We=e.RETURN_TRUSTED_TYPE||!1,He=e.FORCE_BODY||!1,Ge=!1!==e.SANITIZE_DOM,Ye=e.SANITIZE_NAMED_PROPS||!1,je=!1!==e.KEEP_CONTENT,Xe=e.IN_PLACE||!1,be=e.ALLOWED_URI_REGEXP||X,ot=e.NAMESPACE||nt,lt=e.MATHML_TEXT_INTEGRATION_POINTS||lt,ct=e.HTML_INTEGRATION_POINTS||ct,De=e.CUSTOM_ELEMENT_HANDLING||{},e.CUSTOM_ELEMENT_HANDLING&&ht(e.CUSTOM_ELEMENT_HANDLING.tagNameCheck)&&(De.tagNameCheck=e.CUSTOM_ELEMENT_HANDLING.tagNameCheck),e.CUSTOM_ELEMENT_HANDLING&&ht(e.CUSTOM_ELEMENT_HANDLING.attributeNameCheck)&&(De.attributeNameCheck=e.CUSTOM_ELEMENT_HANDLING.attributeNameCheck),e.CUSTOM_ELEMENT_HANDLING&&"boolean"==typeof e.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements&&(De.allowCustomizedBuiltInElements=e.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements),Ie&&(xe=!1),Be&&(Fe=!0),qe&&(Ne=w({},U),we=[],!0===qe.html&&(w(Ne,L),w(we,z)),!0===qe.svg&&(w(Ne,C),w(we,P),w(we,F)),!0===qe.svgFilters&&(w(Ne,x),w(we,P),w(we,F)),!0===qe.mathMl&&(w(Ne,k),w(we,H),w(we,F))),e.ADD_TAGS&&(Ne===Re&&(Ne=D(Ne)),w(Ne,e.ADD_TAGS,pt)),e.ADD_ATTR&&(we===Oe&&(we=D(we)),w(we,e.ADD_ATTR,pt)),e.ADD_URI_SAFE_ATTR&&w(Je,e.ADD_URI_SAFE_ATTR,pt),e.FORBID_CONTENTS&&($e===Ke&&($e=D($e)),w($e,e.FORBID_CONTENTS,pt)),je&&(Ne["#text"]=!0),ze&&w(Ne,["html","head","body"]),Ne.table&&(w(Ne,["tbody"]),delete ve.tbody),e.TRUSTED_TYPES_POLICY){if("function"!=typeof e.TRUSTED_TYPES_POLICY.createHTML)throw b('TRUSTED_TYPES_POLICY configuration option must provide a "createHTML" hook.');if("function"!=typeof e.TRUSTED_TYPES_POLICY.createScriptURL)throw b('TRUSTED_TYPES_POLICY configuration option must provide a "createScriptURL" hook.');le=e.TRUSTED_TYPES_POLICY,ce=le.createHTML("")}else void 0===le&&(le=function(e,t){if("object"!=typeof e||"function"!=typeof e.createPolicy)return null;let n=null;const o="data-tt-policy-suffix";t&&t.hasAttribute(o)&&(n=t.getAttribute(o));const r="dompurify"+(n?"#"+n:"");try{return e.createPolicy(r,{createHTML:e=>e,createScriptURL:e=>e})}catch(e){return console.warn("TrustedTypes policy "+r+" could not be created."),null}}(j,c)),null!==le&&"string"==typeof ce&&(ce=le.createHTML(""));i&&i(e),ft=e}},Tt=w({},[...C,...x,...M]),yt=w({},[...k,...I]),Et=function(e){f(o.removed,{element:e});try{ae(e).removeChild(e)}catch(t){V(e)}},At=function(e,t){try{f(o.removed,{attribute:t.getAttributeNode(e),from:t})}catch(e){f(o.removed,{attribute:null,from:t})}if(t.removeAttribute(e),"is"===e)if(Fe||Be)try{Et(t)}catch(e){}else try{t.setAttribute(e,"")}catch(e){}},_t=function(e){let t=null,n=null;if(He)e="<remove></remove>"+e;else{const t=T(e,/^[\r\n\t ]+/);n=t&&t[0]}"application/xhtml+xml"===ut&&ot===nt&&(e='<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>'+e+"</body></html>");const o=le?le.createHTML(e):e;if(ot===nt)try{t=(new Y).parseFromString(o,ut)}catch(e){}if(!t||!t.documentElement){t=se.createDocument(ot,"template",null);try{t.documentElement.innerHTML=rt?ce:o}catch(e){}}const i=t.body||t.documentElement;return e&&n&&i.insertBefore(r.createTextNode(n),i.childNodes[0]||null),ot===nt?pe.call(t,ze?"html":"body")[0]:ze?t.documentElement:i},St=function(e){return ue.call(e.ownerDocument||e,e,B.SHOW_ELEMENT|B.SHOW_COMMENT|B.SHOW_TEXT|B.SHOW_PROCESSING_INSTRUCTION|B.SHOW_CDATA_SECTION,null)},bt=function(e){return e instanceof G&&("string"!=typeof e.nodeName||"string"!=typeof e.textContent||"function"!=typeof e.removeChild||!(e.attributes instanceof W)||"function"!=typeof e.removeAttribute||"function"!=typeof e.setAttribute||"string"!=typeof e.namespaceURI||"function"!=typeof e.insertBefore||"function"!=typeof e.hasChildNodes)},Nt=function(e){return"function"==typeof R&&e instanceof R};function Rt(e,t,n){u(e,(e=>{e.call(o,t,n,ft)}))}const wt=function(e){let t=null;if(Rt(de.beforeSanitizeElements,e,null),bt(e))return Et(e),!0;const n=pt(e.nodeName);if(Rt(de.uponSanitizeElement,e,{tagName:n,allowedTags:Ne}),e.hasChildNodes()&&!Nt(e.firstElementChild)&&S(/<[/\w]/g,e.innerHTML)&&S(/<[/\w]/g,e.textContent))return Et(e),!0;if(e.nodeType===ee)return Et(e),!0;if(Ue&&e.nodeType===te&&S(/<[/\w]/g,e.data))return Et(e),!0;if(!Ne[n]||ve[n]){if(!ve[n]&&Dt(n)){if(De.tagNameCheck instanceof RegExp&&S(De.tagNameCheck,n))return!1;if(De.tagNameCheck instanceof Function&&De.tagNameCheck(n))return!1}if(je&&!$e[n]){const t=ae(e)||e.parentNode,n=ie(e)||e.childNodes;if(n&&t){for(let o=n.length-1;o>=0;--o){const r=$(n[o],!0);r.__removalCount=(e.__removalCount||0)+1,t.insertBefore(r,re(e))}}}return Et(e),!0}return e instanceof O&&!function(e){let t=ae(e);t&&t.tagName||(t={namespaceURI:ot,tagName:"template"});const n=h(e.tagName),o=h(t.tagName);return!!it[e.namespaceURI]&&(e.namespaceURI===tt?t.namespaceURI===nt?"svg"===n:t.namespaceURI===et?"svg"===n&&("annotation-xml"===o||lt[o]):Boolean(Tt[n]):e.namespaceURI===et?t.namespaceURI===nt?"math"===n:t.namespaceURI===tt?"math"===n&&ct[o]:Boolean(yt[n]):e.namespaceURI===nt?!(t.namespaceURI===tt&&!ct[o])&&!(t.namespaceURI===et&&!lt[o])&&!yt[n]&&(st[n]||!Tt[n]):!("application/xhtml+xml"!==ut||!it[e.namespaceURI]))}(e)?(Et(e),!0):"noscript"!==n&&"noembed"!==n&&"noframes"!==n||!S(/<\/no(script|embed|frames)/i,e.innerHTML)?(Ie&&e.nodeType===Q&&(t=e.textContent,u([he,ge,Te],(e=>{t=y(t,e," ")})),e.textContent!==t&&(f(o.removed,{element:e.cloneNode()}),e.textContent=t)),Rt(de.afterSanitizeElements,e,null),!1):(Et(e),!0)},Ot=function(e,t,n){if(Ge&&("id"===t||"name"===t)&&(n in r||n in dt))return!1;if(xe&&!Le[t]&&S(ye,t));else if(Ce&&S(Ee,t));else if(!we[t]||Le[t]){if(!(Dt(e)&&(De.tagNameCheck instanceof RegExp&&S(De.tagNameCheck,e)||De.tagNameCheck instanceof Function&&De.tagNameCheck(e))&&(De.attributeNameCheck instanceof RegExp&&S(De.attributeNameCheck,t)||De.attributeNameCheck instanceof Function&&De.attributeNameCheck(t))||"is"===t&&De.allowCustomizedBuiltInElements&&(De.tagNameCheck instanceof RegExp&&S(De.tagNameCheck,n)||De.tagNameCheck instanceof Function&&De.tagNameCheck(n))))return!1}else if(Je[t]);else if(S(be,y(n,_e,"")));else if("src"!==t&&"xlink:href"!==t&&"href"!==t||"script"===e||0!==E(n,"data:")||!Ve[e]){if(Me&&!S(Ae,y(n,_e,"")));else if(n)return!1}else;return!0},Dt=function(e){return"annotation-xml"!==e&&T(e,Se)},vt=function(e){Rt(de.beforeSanitizeAttributes,e,null);const{attributes:t}=e;if(!t||bt(e))return;const n={attrName:"",attrValue:"",keepAttr:!0,allowedAttributes:we,forceKeepAttr:void 0};let r=t.length;for(;r--;){const i=t[r],{name:a,namespaceURI:l,value:c}=i,s=pt(a);let m="value"===a?c:A(c);if(n.attrName=s,n.attrValue=m,n.keepAttr=!0,n.forceKeepAttr=void 0,Rt(de.uponSanitizeAttribute,e,n),m=n.attrValue,!Ye||"id"!==s&&"name"!==s||(At(a,e),m="user-content-"+m),Ue&&S(/((--!?|])>)|<\/(style|title)/i,m)){At(a,e);continue}if(n.forceKeepAttr)continue;if(At(a,e),!n.keepAttr)continue;if(!ke&&S(/\/>/i,m)){At(a,e);continue}Ie&&u([he,ge,Te],(e=>{m=y(m,e," ")}));const f=pt(e.nodeName);if(Ot(f,s,m)){if(le&&"object"==typeof j&&"function"==typeof j.getAttributeType)if(l);else switch(j.getAttributeType(f,s)){case"TrustedHTML":m=le.createHTML(m);break;case"TrustedScriptURL":m=le.createScriptURL(m)}try{l?e.setAttributeNS(l,a,m):e.setAttribute(a,m),bt(e)?Et(e):p(o.removed)}catch(e){}}}Rt(de.afterSanitizeAttributes,e,null)},Lt=function e(t){let n=null;const o=St(t);for(Rt(de.beforeSanitizeShadowDOM,t,null);n=o.nextNode();)Rt(de.uponSanitizeShadowNode,n,null),wt(n),vt(n),n.content instanceof s&&e(n.content);Rt(de.afterSanitizeShadowDOM,t,null)};return o.sanitize=function(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},n=null,r=null,i=null,l=null;if(rt=!e,rt&&(e="\x3c!--\x3e"),"string"!=typeof e&&!Nt(e)){if("function"!=typeof e.toString)throw b("toString is not a function");if("string"!=typeof(e=e.toString()))throw b("dirty is not a string, aborting")}if(!o.isSupported)return e;if(Pe||gt(t),o.removed=[],"string"==typeof e&&(Xe=!1),Xe){if(e.nodeName){const t=pt(e.nodeName);if(!Ne[t]||ve[t])throw b("root node is forbidden and cannot be sanitized in-place")}}else if(e instanceof R)n=_t("\x3c!----\x3e"),r=n.ownerDocument.importNode(e,!0),r.nodeType===J&&"BODY"===r.nodeName||"HTML"===r.nodeName?n=r:n.appendChild(r);else{if(!Fe&&!Ie&&!ze&&-1===e.indexOf("<"))return le&&We?le.createHTML(e):e;if(n=_t(e),!n)return Fe?null:We?ce:""}n&&He&&Et(n.firstChild);const c=St(Xe?e:n);for(;i=c.nextNode();)wt(i),vt(i),i.content instanceof s&&Lt(i.content);if(Xe)return e;if(Fe){if(Be)for(l=me.call(n.ownerDocument);n.firstChild;)l.appendChild(n.firstChild);else l=n;return(we.shadowroot||we.shadowrootmode)&&(l=fe.call(a,l,!0)),l}let m=ze?n.outerHTML:n.innerHTML;return ze&&Ne["!doctype"]&&n.ownerDocument&&n.ownerDocument.doctype&&n.ownerDocument.doctype.name&&S(K,n.ownerDocument.doctype.name)&&(m="<!DOCTYPE "+n.ownerDocument.doctype.name+">\n"+m),Ie&&u([he,ge,Te],(e=>{m=y(m,e," ")})),le&&We?le.createHTML(m):m},o.setConfig=function(){gt(arguments.length>0&&void 0!==arguments[0]?arguments[0]:{}),Pe=!0},o.clearConfig=function(){ft=null,Pe=!1},o.isValidAttribute=function(e,t,n){ft||gt({});const o=pt(e),r=pt(t);return Ot(o,r,n)},o.addHook=function(e,t){"function"==typeof t&&f(de[e],t)},o.removeHook=function(e,t){if(void 0!==t){const n=m(de[e],t);return-1===n?void 0:d(de[e],n,1)[0]}return p(de[e])},o.removeHooks=function(e){de[e]=[]},o.removeAllHooks=function(){de={afterSanitizeAttributes:[],afterSanitizeElements:[],afterSanitizeShadowDOM:[],beforeSanitizeAttributes:[],beforeSanitizeElements:[],beforeSanitizeShadowDOM:[],uponSanitizeAttribute:[],uponSanitizeElement:[],uponSanitizeShadowNode:[]}},o}();return re}));
//# sourceMappingURL=purify.min.js.map



/* js/sanitize.js */
// Shared sanitization utilities for XSS prevention

/**
 * Escape HTML special characters in text strings.
 * Use for ANY text data injected via innerHTML (titles, authors, categories, etc.)
 */
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Sanitize HTML content that intentionally contains markup.
 * Use for rich content fields (essay.content, adventure.content, skill.fullContent).
 * Requires DOMPurify to be loaded first.
 */
function sanitizeHTML(html) {
    if (!html) return '';
    if (typeof DOMPurify !== 'undefined') {
        return DOMPurify.sanitize(html, {
            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li',
                           'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
                           'img', 'figure', 'figcaption', 'div', 'span', 'hr', 'table', 'thead',
                           'tbody', 'tr', 'th', 'td', 'sup', 'sub', 'mark'],
            ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'class', 'id',
                           'width', 'height', 'loading', 'decoding'],
            ALLOW_DATA_ATTR: false,
            ADD_ATTR: ['target'],
        });
    }
    // Fallback: strip all tags if DOMPurify not loaded
    return html.replace(/<script[\s\S]*?<\/script>/gi, '')
               .replace(/on\w+\s*=/gi, 'data-removed=');
}

/**
 * Escape a string for safe use inside an HTML attribute value.
 * Use when interpolating into onclick, href, data-*, etc.
 */
function escapeAttr(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Return a safe, escaped URL for href/src-like attributes.
 * Allows http(s), mailto, tel, #hash, and relative paths.
 */
function sanitizeUrl(url, fallback = '#') {
    const raw = String(url || '').trim();
    if (!raw) return fallback;

    if (raw.startsWith('#') || raw.startsWith('/') || raw.startsWith('./') || raw.startsWith('../')) {
        return escapeAttr(raw);
    }

    try {
        const parsed = new URL(raw, window.location.origin);
        const protocol = parsed.protocol.toLowerCase();
        if (protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:' || protocol === 'tel:') {
            return escapeAttr(raw);
        }
    } catch {
        return fallback;
    }

    return fallback;
}



/* js/theme.js */
// Theme Toggle and Wisdom Ticker Functionality

(function() {
    'use strict';

    // Theme Toggle
    const THEME_KEY = 'jg-theme';

    function getPreferredTheme() {
        const stored = localStorage.getItem(THEME_KEY);
        if (stored) return stored;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_KEY, theme);
        updateToggleButton(theme);
    }

    function updateToggleButton(theme) {
        const btn = document.querySelector('.theme-toggle');
        if (!btn) return;
        const label = btn.querySelector('span');
        if (label) {
            label.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
        }
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        setTheme(next);
    }

    // Initialize theme on page load
    function initTheme() {
        const theme = getPreferredTheme();
        setTheme(theme);

        // Add click handler to toggle button
        const toggleBtn = document.querySelector('.theme-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggleTheme);
        }
    }

    // Wisdom Ticker - Short quotes that cycle through
    // Fallback quotes in case JSON fetch fails
    const fallbackQuotes = [
        "Stay curious, stay humble",
        "Build for decades, not quarters",
        "First principles thinking",
        "Actions reveal priorities",
        "Compound interest in all things",
        "Learn in public",
        "Question assumptions",
        "Simple is harder than complex",
        "The obstacle is the way",
        "Be so good they can't ignore you",
        "Comfort is the enemy of progress"
    ];

    function renderWisdomTicker(quotes) {
        const track = document.querySelector('.wisdom-ticker-track');
        if (!track) return;

        // Shuffle quotes
        const shuffled = [...quotes].sort(() => Math.random() - 0.5);

        // Take first 5 unique items, then add first one at end for seamless loop
        // This creates exactly 6 items to match the CSS animation (6 positions)
        const selected = shuffled.slice(0, 5);
        selected.push(selected[0]);

        // Build HTML with clickable links to quotes page
        track.innerHTML = selected.map(phrase =>
            `<a href="quotes.html" class="wisdom-item">${typeof escapeHTML === 'function' ? escapeHTML(phrase) : phrase}</a>`
        ).join('');
    }

    async function initWisdomTicker() {
        const track = document.querySelector('.wisdom-ticker-track');
        if (!track) return;

        try {
            // Try to fetch quotes from JSON file
            const response = await fetch('data/quotes.json');
            if (response.ok) {
                const data = await response.json();
                // Use tickerQuotes array from JSON
                if (data.tickerQuotes && data.tickerQuotes.length >= 5) {
                    renderWisdomTicker(data.tickerQuotes);
                    return;
                }
            }
        } catch (e) {
            // Fetch failed, use fallback
        }

        // Use fallback quotes if fetch failed
        renderWisdomTicker(fallbackQuotes);
    }

    // Logo video hover effect (lazy-load video source on first interaction)
    function initLogoVideo() {
        const logo = document.querySelector('.logo');
        const video = document.querySelector('.logo-video');
        if (!logo || !video) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        let sourceLoaded = false;

        function supportsVideoType(type) {
            return Boolean(video.canPlayType && video.canPlayType(type).replace('no', ''));
        }

        function densityKey() {
            const dpr = window.devicePixelRatio || 1;
            if (dpr >= 2.75) return '3x';
            if (dpr >= 1.5) return '2x';
            return '1x';
        }

        function videoSourceForDisplay() {
            const density = densityKey();
            const webm = video.getAttribute(`data-webm-${density}`);
            const mp4 = video.getAttribute(`data-mp4-${density}`);
            if (webm && supportsVideoType('video/webm; codecs="vp9"')) return webm;
            return mp4 || webm;
        }

        function ensureVideoSource() {
            if (sourceLoaded) return;
            const dataSrc = videoSourceForDisplay();
            if (!dataSrc) return;
            video.src = dataSrc;
            video.preload = 'auto';
            video.load();
            sourceLoaded = true;
        }

        function playVideo() {
            ensureVideoSource();
            if (video.readyState >= 2) {
                video.currentTime = 0;
                video.play().catch(() => {});
                return;
            }
            const playOnReady = () => {
                video.currentTime = 0;
                video.play().catch(() => {});
                video.removeEventListener('canplay', playOnReady);
            };
            video.addEventListener('canplay', playOnReady);
        }

        logo.addEventListener('mouseenter', playVideo);
        logo.addEventListener('mouseleave', () => {
            video.pause();
        });
        logo.addEventListener('touchstart', ensureVideoSource, { passive: true });
    }

    // Mobile Navigation
    function initMobileNav() {
        const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
        const navLinks = document.querySelector('.nav-links');
        const dropdowns = document.querySelectorAll('.nav-dropdown');

        if (!mobileMenuToggle || !navLinks) return;

        mobileMenuToggle.addEventListener('click', () => {
            mobileMenuToggle.classList.toggle('active');
            navLinks.classList.toggle('mobile-open');
            document.body.style.overflow = navLinks.classList.contains('mobile-open') ? 'hidden' : '';
        });

        // Handle dropdown toggles on mobile
        dropdowns.forEach(dropdown => {
            const trigger = dropdown.querySelector('.dropdown-trigger');
            if (trigger) {
                const handleDropdownClick = (e) => {
                    if (window.innerWidth <= 968) {
                        e.preventDefault();
                        e.stopPropagation();
                        // Close other dropdowns
                        dropdowns.forEach(d => {
                            if (d !== dropdown) {
                                d.classList.remove('mobile-dropdown-open');
                            }
                        });
                        dropdown.classList.toggle('mobile-dropdown-open');
                    }
                };
                trigger.addEventListener('click', handleDropdownClick);
                trigger.addEventListener('touchend', (e) => {
                    if (window.innerWidth <= 968) {
                        e.preventDefault();
                        handleDropdownClick(e);
                    }
                });
            }
        });

        // Close mobile menu when clicking a non-dropdown link
        navLinks.querySelectorAll('a:not(.dropdown-trigger)').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 968) {
                    mobileMenuToggle.classList.remove('active');
                    navLinks.classList.remove('mobile-open');
                    document.body.style.overflow = '';
                    dropdowns.forEach(d => d.classList.remove('mobile-dropdown-open'));
                }
            });
        });

        // Close menu when resizing to desktop
        window.addEventListener('resize', () => {
            if (window.innerWidth > 968) {
                mobileMenuToggle.classList.remove('active');
                navLinks.classList.remove('mobile-open');
                document.body.style.overflow = '';
                dropdowns.forEach(d => d.classList.remove('mobile-dropdown-open'));
            }
        });
    }

    // Track navbar height as a CSS variable so sticky sidebars align with the nav
    // regardless of compact/non-compact nav or resize changes.
    function syncNavHeight() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;
        const h = Math.round(navbar.getBoundingClientRect().height);
        if (h > 0) document.documentElement.style.setProperty('--nav-height', `${h}px`);
    }

    function initNavHeight() {
        syncNavHeight();
        window.addEventListener('resize', syncNavHeight);
        if (window.ResizeObserver) {
            const navbar = document.querySelector('.navbar');
            if (navbar) new ResizeObserver(syncNavHeight).observe(navbar);
        }
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initTheme();
            initWisdomTicker();
            initLogoVideo();
            initMobileNav();
            initNavHeight();
        });
    } else {
        initTheme();
        initWisdomTicker();
        initLogoVideo();
        initMobileNav();
        initNavHeight();
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(THEME_KEY)) {
            setTheme(e.matches ? 'dark' : 'light');
        }
    });
})();



/* js/analytics.js */
(function () {
  const endpoint = document.querySelector('meta[name="analytics-endpoint"]')?.content || window.JG_ANALYTICS_ENDPOINT || '';
  const queueKey = 'jg_analytics_events';

  function eventPayload(name, details) {
    return {
      name,
      details: details || {},
      path: window.location.pathname,
      search: window.location.search,
      referrer: document.referrer || '',
      timestamp: new Date().toISOString()
    };
  }

  function store(payload) {
    try {
      const existing = JSON.parse(window.localStorage.getItem(queueKey) || '[]');
      existing.push(payload);
      window.localStorage.setItem(queueKey, JSON.stringify(existing.slice(-50)));
    } catch {
      // Analytics must never affect the public site experience.
    }
  }

  function plausibleName(name) {
    return name.split('_').map(function (part) {
      return part.charAt(0).toUpperCase() + part.slice(1);
    }).join(' ');
  }

  function send(payload) {
    if (window.plausible) {
      window.plausible(plausibleName(payload.name), { props: payload.details });
    }

    if (!endpoint) {
      store(payload);
      return;
    }

    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
      return;
    }

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true
    }).catch(function () {
      store(payload);
    });
  }

  function track(name, details) {
    const payload = eventPayload(name, details);
    window.dispatchEvent(new CustomEvent('jg:analytics', { detail: payload }));
    send(payload);
  }

  function datasetDetails(element) {
    const details = {};
    for (const key of Object.keys(element.dataset || {})) {
      if (key === 'analytics') continue;
      details[key] = element.dataset[key];
    }
    return details;
  }

  function classifyLink(link) {
    const href = link.getAttribute('href') || '';
    if (link.dataset.analytics) return link.dataset.analytics;
    if (/^mailto:/i.test(href)) return 'contact';
    if (/^https?:\/\//i.test(href) && !href.includes(window.location.hostname)) return 'outbound';
    if (link.matches('.product-cta, .resource-link, .btn-primary, .btn-newsletter, .navbar-contact-btn')) return 'cta';
    if (href.includes('contact.html') || href.includes('meet.html')) return 'contact';
    if (href.includes('products.html')) return 'product';
    if (href.includes('free-resources.html')) return 'resource';
    return '';
  }

  document.addEventListener('click', function (event) {
    const link = event.target.closest && event.target.closest('a[href]');
    if (!link) return;
    const type = classifyLink(link);
    if (!type) return;

    const eventName = {
      cta: 'cta_click',
      contact: 'contact_click',
      product: 'product_click',
      resource: 'resource_click',
      outbound: 'outbound_click'
    }[type] || 'link_click';

    track(eventName, {
      ...datasetDetails(link),
      type,
      href: link.getAttribute('href'),
      label: link.textContent.trim().replace(/\s+/g, ' ').slice(0, 120)
    });
  });

  document.addEventListener('submit', function (event) {
    const form = event.target;
    if (!form || !form.matches('form')) return;
    track(form.matches('[data-newsletter-form]') ? 'newsletter_submit' : 'form_submit', {
      id: form.id || '',
      className: form.className || '',
      action: form.getAttribute('action') || ''
    });
  });

  document.addEventListener('DOMContentLoaded', function () {
    track('page_view', {
      title: document.title,
      section: document.body?.dataset?.section || ''
    });
  });

  window.JGAnalytics = { track, flushDebugEvents: function () {
    const events = JSON.parse(window.localStorage.getItem(queueKey) || '[]');
    window.localStorage.removeItem(queueKey);
    return events;
  } };
}());


