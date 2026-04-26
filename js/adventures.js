// ============================================
// Adventures Page JavaScript
// ============================================

// Configuration
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
    poiCategories: {}, // populated from data on load
    basemap: 'satellite',
    routeSet: 'all' // 'all' | 'mine' | 'bucket'
};

// State
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
let activeFilters = new Set(); // legacy region filter Set, kept for compat
let mapFilters = { ...DEFAULT_FILTERS, layers: { ...DEFAULT_FILTERS.layers }, poiCategories: {} };
let lightboxImages = [];
let lightboxIndex = 0;
let worldMap = null;
let adventureMaps = {};
let adventureMarkers = {}; // Store markers by adventure ID
let leafletPromise = null;
let markerClusterPromise = null;
let worldMapRequested = false;

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

// ============================================
// Data Loading
// ============================================
async function loadAdventures() {
    try {
        const response = await fetch(ADVENTURES_DATA_URL);
        if (!response.ok) throw new Error('Failed to load adventures');

        const data = await response.json();
        allAdventures = data.adventures.filter(a => a.status === 'published');

        // Sort by date, newest first
        allAdventures.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

        renderAdventures(allAdventures);
        populateSidebar(allAdventures);
        setupWorldMapLazyLoad(allAdventures);
        updateAdventureCount(allAdventures.length);

    } catch (error) {
        console.error('Error loading adventures:', error);
        showErrorMessage();
    }
}

async function loadPlacesOfInterest() {
    try {
        const response = await fetch(PLACES_DATA_URL);
        if (!response.ok) return;
        const data = await response.json();
        allPlaces = Array.isArray(data.places) ? data.places : [];
        placeCategories = Array.isArray(data.categories) ? data.categories : [];
        for (const cat of placeCategories) {
            if (mapFilters.poiCategories[cat.id] === undefined) {
                mapFilters.poiCategories[cat.id] = true;
            }
        }
        saveFilters();
    } catch (error) {
        console.error('Error loading places of interest:', error);
    }
}

async function loadCountriesData() {
    try {
        const [geoRes, visRes] = await Promise.all([
            fetch(COUNTRIES_GEO_URL),
            fetch(COUNTRIES_VISITED_URL)
        ]);
        if (geoRes.ok) countryGeo = await geoRes.json();
        if (visRes.ok) {
            const v = await visRes.json();
            visitedIso = new Set(Array.isArray(v.iso) ? v.iso : []);
        }
    } catch (error) {
        console.error('Error loading country data:', error);
    }
}

async function loadRoutes() {
    const merged = [];
    try {
        const response = await fetch(ROUTES_DATA_URL);
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data.routes)) merged.push(...data.routes);
        }
    } catch (_err) { /* optional */ }
    try {
        const response = await fetch(POPULAR_ROUTES_URL);
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data.routes)) merged.push(...data.routes);
        }
    } catch (_err) { /* optional */ }
    allRoutes = merged;
}

async function loadPhotos() {
    try {
        const response = await fetch(PHOTOS_DATA_URL);
        if (!response.ok) return;
        const data = await response.json();
        allPhotos = Array.isArray(data.photos) ? data.photos : [];
    } catch (error) {
        // Optional file; ignore quietly
        allPhotos = [];
    }
}

function loadMarkerCluster() {
    if (window.L && window.L.markerClusterGroup) return Promise.resolve();
    if (markerClusterPromise) return markerClusterPromise;
    markerClusterPromise = new Promise((resolve, reject) => {
        const linkBase = document.createElement('link');
        linkBase.rel = 'stylesheet';
        linkBase.href = 'vendor/leaflet.markercluster/MarkerCluster.css';
        document.head.appendChild(linkBase);
        const linkDef = document.createElement('link');
        linkDef.rel = 'stylesheet';
        linkDef.href = 'vendor/leaflet.markercluster/MarkerCluster.Default.css';
        document.head.appendChild(linkDef);
        const script = document.createElement('script');
        script.src = 'vendor/leaflet.markercluster/leaflet.markercluster.js';
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = reject;
        document.head.appendChild(script);
    });
    return markerClusterPromise;
}

// ============================================
// Rendering - Compact Cards for Split Layout
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

    adventures.forEach(adventure => {
        const card = createCompactCard(adventure);
        container.appendChild(card);
    });
}

// Create compact card for sidebar
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

// Select an adventure - highlight on map and show detail overlay
let selectedAdventureId = null;

function selectAdventure(id) {
    const adventure = allAdventures.find(a => a.id === id);
    if (!adventure) return;

    // Update selected state in sidebar
    document.querySelectorAll('.adventure-compact-card').forEach(card => {
        card.classList.remove('active');
    });
    const selectedCard = document.getElementById(`card-${id}`);
    if (selectedCard) {
        selectedCard.classList.add('active');
    }

    selectedAdventureId = id;

    // Highlight on map
    highlightAdventureOnMap(adventure);

    // Show detail overlay
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
                <ul>${highlights.map((h) => `<li>${escapeHTML(h)}</li>`).join('')}</ul>
            </div>` : ''}
            ${gallery.length ? `<div class="adventure-story-gallery">
                <h3>Gallery</h3>
                <div class="adventure-story-gallery-grid">
                    ${gallery.map((item, i) => `<figure class="adventure-story-gallery-item" data-action="open-adventure-lightbox" data-adventure-id="${escapeAttr(adventure.id)}" data-index="${i}">
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
    if (overlay) {
        overlay.classList.remove('active');
    }

    const inlineStory = document.getElementById('adventure-story-inline');
    const inlineInner = document.getElementById('adventure-story-inner');
    if (inlineStory) inlineStory.hidden = true;
    if (inlineInner) inlineInner.innerHTML = '';

    // Clear selection
    document.querySelectorAll('.adventure-compact-card').forEach(card => {
        card.classList.remove('active');
    });

    selectedAdventureId = null;

    // Clear map highlight
    clearMapHighlight();
}

function createAdventureCard(adventure) {
    const card = document.createElement('article');
    card.className = 'adventure-card';
    card.id = adventure.id;

    const formattedDate = formatDateRange(adventure.startDate, adventure.endDate);
    const highlightsHTML = adventure.highlights
        .map(h => `<span class="highlight-tag">${escapeHTML(h)}</span>`)
        .join('');

    const galleryHTML = createGalleryHTML(adventure.gallery, adventure.id);

    card.innerHTML = `
        <!-- Collapsed View -->
        <div class="adventure-card-collapsed" data-action="expand-adventure" data-adventure-id="${escapeAttr(adventure.id)}">
            <img src="${escapeAttr(adventure.heroImage)}" alt="${escapeAttr(adventure.title)}" class="adventure-hero-image" loading="lazy" decoding="async">
            <div class="adventure-card-content">
                <div class="adventure-meta">
                    <span class="adventure-location">${escapeHTML(adventure.location)}</span>
                    <span class="adventure-date">${escapeHTML(formattedDate)}</span>
                    <span class="adventure-duration">${escapeHTML(adventure.duration)}</span>
                </div>
                <h2 class="adventure-title">${escapeHTML(adventure.title)}</h2>
                ${adventure.subtitle ? `<p class="adventure-subtitle">${escapeHTML(adventure.subtitle)}</p>` : ''}
                <p class="adventure-description">${escapeHTML(adventure.shortDescription)}</p>
                <div class="adventure-highlights">${highlightsHTML}</div>
                <button class="expand-adventure-btn" data-action="expand-adventure" data-adventure-id="${escapeAttr(adventure.id)}">
                    View Full Story
                </button>
            </div>
        </div>

        <!-- Expanded View -->
        <div class="adventure-expanded">
            <img src="${escapeAttr(adventure.heroImage)}" alt="${escapeAttr(adventure.title)}" class="adventure-expanded-hero" loading="lazy" decoding="async">
            <div class="adventure-expanded-content">
                <button class="collapse-btn" data-action="collapse-adventure" data-adventure-id="${escapeAttr(adventure.id)}">
                    &times; Close
                </button>
                <div class="adventure-meta">
                    <span class="adventure-location">${escapeHTML(adventure.location)}</span>
                    <span class="adventure-date">${escapeHTML(formattedDate)}</span>
                    <span class="adventure-duration">${escapeHTML(adventure.duration)}</span>
                </div>
                <h1 class="adventure-title">${escapeHTML(adventure.title)}</h1>
                ${adventure.subtitle ? `<p class="adventure-subtitle">${escapeHTML(adventure.subtitle)}</p>` : ''}

                <div class="adventure-body">
                    ${sanitizeHTML(adventure.content)}
                </div>

                <!-- Interactive Map -->
                ${adventure.gallery && adventure.gallery.some(p => p.lat && p.lng) ? `
                <div class="adventure-map-section">
                    <h3>Photo Locations</h3>
                    <div class="adventure-map" id="map-${adventure.id}"></div>
                </div>
                ` : ''}

                <!-- Photo Gallery -->
                ${adventure.gallery && adventure.gallery.length > 0 ? `
                <div class="adventure-gallery">
                    <h3>Photo Gallery</h3>
                    <div class="gallery-grid" id="gallery-${adventure.id}">
                        ${galleryHTML}
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
    `;

    return card;
}

function createGalleryHTML(gallery, adventureId) {
    if (!gallery || gallery.length === 0) return '';

    return gallery.map((photo, index) => `
        <div class="gallery-item" data-action="open-adventure-lightbox" data-adventure-id="${escapeAttr(adventureId)}" data-index="${index}">
            <img src="${escapeAttr(photo.thumbnail || photo.src)}" alt="${escapeAttr(photo.caption)}" loading="lazy" decoding="async">
            <div class="gallery-item-overlay">${escapeHTML(photo.caption)}</div>
        </div>
    `).join('');
}

// ============================================
// Card Expand/Collapse
// ============================================
function expandAdventure(id, event) {
    if (event) {
        event.stopPropagation();
    }

    // Collapse any other expanded cards
    document.querySelectorAll('.adventure-card.expanded').forEach(card => {
        if (card.id !== id) {
            card.classList.remove('expanded');
        }
    });

    const card = document.getElementById(id);
    card.classList.add('expanded');

    // Initialize map for this adventure
    const adventure = allAdventures.find(a => a.id === id);
    if (adventure && !adventureMaps[id]) {
        setTimeout(() => {
            initAdventureMap(adventure);
        }, 100);
    }

    // Highlight location on world map
    highlightAdventureOnMap(adventure);

    // Smooth scroll to card
    setTimeout(() => {
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
}

function collapseAdventure(id, event) {
    if (event) {
        event.stopPropagation();
    }

    const card = document.getElementById(id);
    card.classList.remove('expanded');

    // Remove highlight from world map
    clearMapHighlight();

    // Scroll back to card position
    setTimeout(() => {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
}

// ============================================
// World Map Highlighting
// ============================================
function highlightAdventureOnMap(adventure) {
    if (!worldMap) {
        ensureWorldMap();
        return;
    }
    if (!adventure || !adventure.mapCenter) return;

    const targetLng = nearestWrappedLongitude(adventure.mapCenter.lng, worldMap.getCenter().lng);

    // Pan the map to center on this location with higher zoom
    worldMap.setView([adventure.mapCenter.lat, targetLng], 5, {
        animate: true,
        duration: 0.5
    });
}

function nearestWrappedLongitude(lng, referenceLng) {
    let wrappedLng = lng;
    while (wrappedLng - referenceLng > 180) wrappedLng -= 360;
    while (wrappedLng - referenceLng < -180) wrappedLng += 360;
    return wrappedLng;
}

function clearMapHighlight() {
    // Reset map view to default (showing more of the world)
    if (worldMap) {
        worldMap.setView([20, 0], 2, {
            animate: true,
            duration: 0.5
        });
    }
}

// ============================================
// Map Integration (Leaflet) - Large Interactive Map
// ============================================
function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (leafletPromise) return leafletPromise;

    leafletPromise = new Promise((resolve, reject) => {
        if (!document.querySelector('link[data-leaflet-css]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'vendor/leaflet/leaflet.css';
            link.dataset.leafletCss = 'true';
            document.head.appendChild(link);
        }

        const script = document.createElement('script');
        script.src = 'vendor/leaflet/leaflet.js';
        script.defer = true;
        script.onload = () => resolve(window.L);
        script.onerror = reject;
        document.head.appendChild(script);
    });

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
        if (Array.isArray(basemapTileLayer)) basemapTileLayer.forEach((l) => map.removeLayer(l));
        else map.removeLayer(basemapTileLayer);
        basemapTileLayer = null;
    }
    const opts = {
        maxZoom: def.maxZoom || 19,
        noWrap: false,
        detectRetina: false,
        updateWhenIdle: false,
        updateWhenZooming: true,
        keepBuffer: 6,
        crossOrigin: true
    };
    if (def.subdomains) opts.subdomains = def.subdomains;
    const layer = L.tileLayer(def.tile, opts).addTo(map);
    let overlayLayer = null;
    if (def.overlay) {
        overlayLayer = L.tileLayer(def.overlay, { ...opts, subdomains: '' }).addTo(map);
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

    // Check if there are any adventures with locations
    const adventuresWithLocation = adventures.filter(a => a.mapCenter);
    if (adventuresWithLocation.length === 0) {
        mapContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#666;">No location data available</div>';
        return;
    }

    const verticalBounds = L.latLngBounds(
        [-WEB_MERCATOR_MAX_LAT, -HORIZONTAL_WRAP_BOUND],
        [WEB_MERCATOR_MAX_LAT, HORIZONTAL_WRAP_BOUND]
    );

    // Create a horizontally wrapping world map while clamping the polar tile edges.
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

    // Add markers with popups for each adventure — duplicated across world copies
    const WORLD_COPY_OFFSETS = [-360, 0, 360];
    adventures.forEach(adventure => {
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

        WORLD_COPY_OFFSETS.forEach((offset, idx) => {
            const marker = L.marker(
                [adventure.mapCenter.lat, adventure.mapCenter.lng + offset],
                {
                    icon: L.divIcon({
                        className: 'adventure-marker-icon',
                        html: '<span class="adv-marker-pulse"></span><span class="adv-marker-ring"></span><span class="adv-marker-dot"></span>',
                        iconSize: [28, 28],
                        iconAnchor: [14, 14],
                        popupAnchor: [0, -14]
                    }),
                    riseOnHover: true
                }
            ).addTo(worldMap);

            marker.bindPopup(popupHtml);
            marker.on('click', () => selectAdventure(adventure.id));

            // Only keep the primary (offset 0) for highlight lookups
            if (idx === 1) adventureMarkers[adventure.id] = marker;
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
        const ro = new ResizeObserver(() => {
            if (resizeRaf) cancelAnimationFrame(resizeRaf);
            resizeRaf = requestAnimationFrame(() => {
                resizeRaf = 0;
                if (worldMap) worldMap.invalidateSize();
            });
        });
        ro.observe(mapContainer);
    }

    const split = document.querySelector('.adventures-page-split');
    if (split) {
        split.addEventListener('transitionend', (e) => {
            if (e.propertyName === 'grid-template-columns' && worldMap) {
                worldMap.invalidateSize();
            }
        });
    }
}

function renderPlaceMarkers() {
    if (!worldMap || !window.L) return;

    placeMarkers.forEach(m => worldMap.removeLayer(m));
    placeMarkers = [];

    if (!mapFilters.layers.pois || allPlaces.length === 0) return;

    const WORLD_COPY_OFFSETS = [-360, 0, 360];
    const categoryColor = (id) => {
        const cat = placeCategories.find((c) => c.id === id);
        return (cat && cat.color) || '#2b6cb0';
    };
    const categoryLabel = (id) => {
        const cat = placeCategories.find((c) => c.id === id);
        return (cat && cat.label) || 'Place of interest';
    };

    allPlaces.forEach(place => {
        if (typeof place.lat !== 'number' || typeof place.lng !== 'number') return;
        if (!matchesRegionFilter(place.region)) return;
        const cat = place.category || 'wishlist';
        if (mapFilters.poiCategories[cat] === false) return;

        const color = categoryColor(cat);
        const label = categoryLabel(cat);

        const popupHtml = `
            <div style="min-width: 180px; padding: 0.5rem;">
                <strong style="font-size: 0.95rem;">${escapeHTML(place.name)}</strong><br>
                ${place.location ? `<span style="color: #666; font-size: 0.8rem;">${escapeHTML(place.location)}</span><br>` : ''}
                ${place.notes ? `<p style="margin: 0.4rem 0 0; font-size: 0.85rem; color: #444;">${escapeHTML(place.notes)}</p>` : ''}
                <span style="display:inline-block;margin-top:0.4rem;padding:0.15rem 0.5rem;background:${color};color:#fff;border-radius:3px;font-size:0.7rem;letter-spacing:0.05em;text-transform:uppercase;">${escapeHTML(label)}</span>
            </div>
        `;

        WORLD_COPY_OFFSETS.forEach(offset => {
            const marker = L.marker(
                [place.lat, place.lng + offset],
                {
                    icon: L.divIcon({
                        className: 'place-marker-icon',
                        html: `<span class="place-marker-ring" style="--marker-color:${color}"></span><span class="place-marker-dot"></span>`,
                        iconSize: [18, 18],
                        iconAnchor: [9, 9],
                        popupAnchor: [0, -9]
                    }),
                    riseOnHover: true
                }
            ).addTo(worldMap);
            marker.bindPopup(popupHtml);
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

// ============================================
// Filter store (year + region + layer toggles, persisted)
// ============================================
function loadFilters() {
    try {
        const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
        if (!raw) return;
        const stored = JSON.parse(raw);
        if (stored && typeof stored === 'object') {
            mapFilters = {
                year: stored.year || 'all',
                region: stored.region || 'all',
                layers: { ...DEFAULT_FILTERS.layers, ...(stored.layers || {}) },
                poiCategories: { ...(stored.poiCategories || {}) },
                basemap: stored.basemap || 'satellite',
                routeSet: stored.routeSet || 'all'
            };
            placesVisible = mapFilters.layers.pois;
        }
    } catch (_err) {
        // ignore
    }
}

function saveFilters() {
    try { localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(mapFilters)); }
    catch (_err) { /* quota or disabled storage; ignore */ }
}

function adventureYear(adventure) {
    if (!adventure || !adventure.startDate) return null;
    const d = new Date(adventure.startDate);
    return Number.isNaN(d.getTime()) ? null : d.getUTCFullYear();
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
        const adv = allAdventures.find((a) => a.id === id);
        const visible = mapFilters.layers.adventures && adv && matchesAdventureFilters(adv);
        if (visible) {
            if (!worldMap.hasLayer(marker)) worldMap.addLayer(marker);
        } else if (worldMap.hasLayer(marker)) {
            worldMap.removeLayer(marker);
        }
    });
}

// ============================================
// Country fill layer
// ============================================
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

// ============================================
// Route polylines
// ============================================
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
        const adv = allAdventures.find((a) => a.id === route.adventureId);
        if (adv && !matchesAdventureFilters(adv)) return;
        if (!route.geometry) return;
        const coords = route.geometry.type === 'MultiLineString'
            ? route.geometry.coordinates
            : [route.geometry.coordinates];
        coords.forEach((line) => {
            const latlngs = line.map(([lng, lat]) => [lat, lng]);
            const color = ROUTE_TYPE_COLORS[route.type] || ROUTE_TYPE_COLORS.track;
            const poly = L.polyline(latlngs, {
                color,
                weight: 3,
                opacity: isBucket ? 0.7 : 0.85,
                dashArray: isBucket ? '6 6' : null,
                className: `route-line-${route.type || 'track'}${isBucket ? ' route-line-bucket' : ''}`
            });
            const label = isBucket
                ? `🪣 ${escapeHTML(route.name || 'Route')} · ${route.distanceKm || 0} km${route.country ? ` · ${escapeHTML(route.country)}` : ''}`
                : `${escapeHTML(route.name || 'Route')} · ${route.distanceKm || 0} km`;
            poly.bindTooltip(label, { sticky: true });
            poly.on('click', (e) => {
                if (e && e.originalEvent) L.DomEvent.stopPropagation(e);
                if (route.adventureId && !isBucket) selectAdventure(route.adventureId);
                const bounds = poly.getBounds();
                if (bounds.isValid()) {
                    worldMap.fitBounds(bounds.pad(0.25), { animate: true, duration: 0.6, maxZoom: 13 });
                }
            });
            group.addLayer(poly);
        });
    });
    routeLayer = group.addTo(worldMap);
}

// ============================================
// Photo cluster layer
// ============================================
function renderPhotoLayer() {
    if (!worldMap || !window.L) return;
    if (photoLayer) {
        worldMap.removeLayer(photoLayer);
        photoLayer = null;
    }
    if (!mapFilters.layers.photos || allPhotos.length === 0) return;

    const create = () => {
        const cluster = (window.L.markerClusterGroup ? L.markerClusterGroup({
            chunkedLoading: true,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            maxClusterRadius: 60
        }) : L.layerGroup());

        allPhotos.forEach((photo, idx) => {
            if (typeof photo.lat !== 'number' || typeof photo.lng !== 'number') return;
            const adv = allAdventures.find((a) => a.id === photo.adventureId);
            if (adv && !matchesAdventureFilters(adv)) return;

            const thumb = photo.thumb || photoUrl(photo.driveId, 200);
            const full = photo.full || photoUrl(photo.driveId, 1600);
            const marker = L.marker([photo.lat, photo.lng], {
                icon: L.divIcon({
                    className: 'photo-marker',
                    html: `<div class="photo-marker-bubble" style="background-image:url('${escapeAttr(thumb)}')"></div>`,
                    iconSize: [36, 36]
                })
            });
            marker.bindPopup(`
                <div class="photo-popup">
                    <img src="${escapeAttr(full)}" alt="${escapeAttr(photo.caption || '')}" style="max-width:260px;max-height:200px;display:block;border-radius:6px;">
                    ${photo.caption ? `<p style="margin:0.4rem 0 0;font-size:0.8rem;color:#444;">${escapeHTML(photo.caption)}</p>` : ''}
                </div>
            `);
            marker.on('click', () => openPhotoLightbox(idx));
            cluster.addLayer(marker);
        });

        photoLayer = cluster.addTo(worldMap);
    };

    if (window.L.markerClusterGroup) create();
    else loadMarkerCluster().then(create).catch(() => create());
}

function photoUrl(driveId, size) {
    if (!driveId) return '';
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w${size}`;
}

function openPhotoLightbox(index) {
    lightboxImages = allPhotos
        .filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number')
        .map((p) => ({
            src: p.full || photoUrl(p.driveId, 1600),
            caption: p.caption || ''
        }));
    lightboxIndex = Math.max(0, Math.min(index, lightboxImages.length - 1));
    updateLightboxImage();
    const lb = document.getElementById('lightbox');
    if (lb) {
        lb.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// ============================================
// Map control stack (layers, year, region, basemap)
// ============================================
function buildMapControlStack() {
    if (!worldMap) return;
    const mapEl = document.getElementById('world-map');
    if (!mapEl || mapEl.querySelector('.map-controls-stack')) return;

    const years = [...new Set(allAdventures.map(adventureYear).filter(Boolean))].sort((a, b) => b - a);
    const regions = [...new Set(allAdventures.map((a) => a.region).filter(Boolean))].sort();

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
                    ${years.map((y) => `<option value="${y}" ${String(mapFilters.year) === String(y) ? 'selected' : ''}>${y}</option>`).join('')}
                </select>
            </div>
            <div class="map-controls-group">
                <label class="map-controls-label" for="map-filter-region">Region</label>
                <select id="map-filter-region" class="map-controls-select">
                    <option value="all">All</option>
                    ${regions.map((r) => `<option value="${escapeAttr(r)}" ${String(mapFilters.region).toLowerCase() === String(r).toLowerCase() ? 'selected' : ''}>${escapeHTML(r)}</option>`).join('')}
                </select>
            </div>
            <div class="map-controls-group">
                <label class="map-controls-label" for="map-filter-basemap">Basemap</label>
                <select id="map-filter-basemap" class="map-controls-select">
                    ${Object.entries(BASEMAPS).map(([k, v]) => `<option value="${k}" ${mapFilters.basemap === k ? 'selected' : ''}>${escapeHTML(v.label)}</option>`).join('')}
                </select>
            </div>
        </div>
    `;
    mapEl.appendChild(wrapper);

    wrapper.addEventListener('click', (e) => {
        const t = e.target.closest('[data-action]');
        if (!t) return;
        const action = t.dataset.action;
        if (action === 'toggle-controls') {
            const body = wrapper.querySelector('.map-controls-body');
            const open = !body.hasAttribute('hidden');
            if (open) body.setAttribute('hidden', '');
            else body.removeAttribute('hidden');
            t.setAttribute('aria-expanded', String(!open));
        }
    });

    wrapper.addEventListener('change', (e) => {
        const target = e.target;
        if (target.matches('input[data-layer]')) {
            const layer = target.dataset.layer;
            mapFilters.layers[layer] = target.checked;
            applyAllFilters();
        } else if (target.matches('input[data-poi-category]')) {
            const cat = target.dataset.poiCategory;
            mapFilters.poiCategories[cat] = target.checked;
            saveFilters();
            renderPlaceMarkers();
        } else if (target.id === 'map-filter-year') {
            mapFilters.year = target.value;
            applyAllFilters();
        } else if (target.id === 'map-filter-region') {
            mapFilters.region = target.value;
            applyAllFilters();
        } else if (target.id === 'map-filter-basemap') {
            mapFilters.basemap = target.value;
            saveFilters();
            setBasemap(worldMap, target.value);
        } else if (target.id === 'map-filter-routeset') {
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
    return layers.map(([k, label]) => `
        <label class="map-controls-check">
            <input type="checkbox" data-layer="${k}" ${mapFilters.layers[k] ? 'checked' : ''}>
            <span>${escapeHTML(label)}</span>
        </label>
    `).join('');
}

function renderPoiToggles() {
    if (!placeCategories.length) return '<p class="map-controls-empty">No categories</p>';
    return placeCategories.map((cat) => `
        <label class="map-controls-check">
            <input type="checkbox" data-poi-category="${escapeAttr(cat.id)}" ${mapFilters.poiCategories[cat.id] !== false ? 'checked' : ''}>
            <span style="--poi-dot:${escapeAttr(cat.color || '#666')}">${escapeHTML(cat.label)}</span>
        </label>
    `).join('');
}

function initAdventureMap(adventure) {
    const mapContainer = document.getElementById(`map-${adventure.id}`);
    if (!mapContainer || adventureMaps[adventure.id]) return;

    // Check if there are photos with locations
    const photosWithLocation = adventure.gallery.filter(p => p.lat && p.lng);
    if (photosWithLocation.length === 0) return;

    if (!window.L) {
        loadLeaflet().then(() => initAdventureMap(adventure));
        return;
    }

    const map = L.map(`map-${adventure.id}`, {
        preferCanvas: true,
        attributionControl: false,
        minZoom: 2,
        maxZoom: 18
    }).setView(
        [adventure.mapCenter.lat, adventure.mapCenter.lng],
        adventure.mapZoom || 10
    );

    addFastBaseMap(map);
    addSatelliteTiles(map);

    // Add markers for each photo with location
    adventure.gallery.forEach(photo => {
        if (photo.lat && photo.lng) {
            const marker = L.marker([photo.lat, photo.lng])
                .addTo(map)
                .bindPopup(`
                    <div>
                        <img src="${escapeAttr(photo.thumbnail || photo.src)}" class="map-popup-image" alt="${escapeAttr(photo.caption)}" loading="lazy" decoding="async">
                        <p class="map-popup-caption">${escapeHTML(photo.caption)}</p>
                    </div>
                `);
        }
    });

    adventureMaps[adventure.id] = map;
}

// ============================================
// Lightbox
// ============================================
function openLightbox(adventureId, index) {
    const adventure = allAdventures.find(a => a.id === adventureId);
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
    document.getElementById('lightbox-counter').textContent =
        `${lightboxIndex + 1} / ${lightboxImages.length}`;
}

// Keyboard navigation for lightbox
document.addEventListener('keydown', function(e) {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox || !lightbox.classList.contains('active')) return;

    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'ArrowLeft') prevImage();
});

// Close lightbox on background click
document.addEventListener('click', function(e) {
    const lightbox = document.getElementById('lightbox');
    if (lightbox && e.target === lightbox) {
        closeLightbox();
    }
});

// ============================================
// Sidebar & Filtering
// ============================================
function populateSidebar(adventures) {
    const regions = {
        all: adventures.length,
        europe: 0,
        asia: 0,
        australia: 0,
        americas: 0,
        other: 0
    };

    adventures.forEach(adventure => {
        const region = (adventure.region || 'other').toLowerCase();
        if (regions.hasOwnProperty(region)) {
            regions[region]++;
        } else {
            regions.other++;
        }
    });

    // Update counts
    Object.keys(regions).forEach(region => {
        const countEl = document.getElementById(`count-${region}`);
        if (countEl) countEl.textContent = regions[region];
    });
}

// Toggle a region filter on/off
function toggleFilter(region, buttonEl) {
    if (activeFilters.has(region)) {
        // Already active - remove it
        activeFilters.delete(region);
        buttonEl.classList.remove('active');
    } else {
        // Not active - add it
        activeFilters.add(region);
        buttonEl.classList.add('active');
    }

    // Update All button state
    updateAllButtonState();

    // Apply filters
    applyFilters();
}

// Remove a specific filter (called by X button)
function removeFilter(region, event) {
    event.stopPropagation(); // Don't trigger the button click

    activeFilters.delete(region);

    // Update button state
    const btn = document.querySelector(`.filter-pill[data-region="${region}"]`);
    if (btn) btn.classList.remove('active');

    // Update All button state
    updateAllButtonState();

    // Apply filters
    applyFilters();
}

// Reset all filters (show all)
function resetFilters(buttonEl) {
    // Clear all active filters
    activeFilters.clear();

    // Remove active class from all filter pills except All
    document.querySelectorAll('.filter-pill:not([data-region="all"])').forEach(btn => {
        btn.classList.remove('active');
    });

    // Add active class to All button
    buttonEl.classList.add('active');

    // Close any open detail overlay
    closeAdventureDetail();

    // Show all adventures
    renderAdventures(allAdventures);
    updateAdventureCount(allAdventures.length);
}

// Update the All button state based on active filters
function updateAllButtonState() {
    const allBtn = document.querySelector('.filter-pill[data-region="all"]');
    if (activeFilters.size === 0) {
        if (allBtn) allBtn.classList.add('active');
    } else {
        if (allBtn) allBtn.classList.remove('active');
    }
}

// Apply current active filters
function applyFilters() {
    let filtered = allAdventures;

    if (activeFilters.size > 0) {
        filtered = allAdventures.filter(a => {
            const region = (a.region || 'other').toLowerCase();
            return activeFilters.has(region);
        });
    }

    renderAdventures(filtered);
    updateAdventureCount(filtered.length);
}

// ============================================
// Subnav Toggle
// ============================================
function toggleSubnav() {
    const subnav = document.querySelector('.adventures-subnav');
    subnav.classList.toggle('collapsed');
}

// ============================================
// Utilities
// ============================================
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

    // Hide the world map on error
    const worldMapEl = document.getElementById('world-map');
    if (worldMapEl) worldMapEl.style.display = 'none';
}

// ============================================
// View Toggle
// ============================================
let currentAdventureView = 'list';

function setAdventureViewMode(mode) {
    currentAdventureView = mode;
    const container = document.getElementById('adventures-container');
    const listBtn = document.getElementById('list-view-btn');
    const gridBtn = document.getElementById('grid-view-btn');

    if (mode === 'list') {
        container.classList.remove('adventures-grid');
        container.classList.add('adventures-list');
        listBtn.classList.add('active');
        gridBtn.classList.remove('active');
    } else {
        container.classList.remove('adventures-list');
        container.classList.add('adventures-grid');
        gridBtn.classList.add('active');
        listBtn.classList.remove('active');
    }
}

// ============================================
// Mobile View Toggle
// ============================================
function switchMobileView(view) {
    const pageContainer = document.querySelector('.adventures-page-split');
    const buttons = document.querySelectorAll('.mobile-view-btn');

    if (!pageContainer) return;

    // Update buttons
    buttons.forEach(btn => {
        if (btn.dataset.view === view) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Toggle view
    if (view === 'map') {
        pageContainer.classList.add('map-view');
        ensureWorldMap();
        // Invalidate map size to fix rendering issues
        if (worldMap) {
            setTimeout(() => worldMap.invalidateSize(), 100);
        }
    } else {
        pageContainer.classList.remove('map-view');
    }
}

function bindAdventureActions() {
    document.addEventListener('click', (event) => {
        const trigger = event.target.closest('[data-action]');
        if (!trigger) return;

        const action = trigger.dataset.action;
        if (action === 'expand-adventure') {
            const id = trigger.dataset.adventureId;
            if (id) expandAdventure(id, event);
            return;
        }

        if (action === 'collapse-adventure') {
            const id = trigger.dataset.adventureId;
            if (id) collapseAdventure(id, event);
            return;
        }

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
            const adventure = allAdventures.find((a) => a.id === selectedAdventureId);
            if (adventure) renderInlineStory(adventure);
        }
    });
}

// ============================================
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    loadFilters();
    bindAdventureActions();
    loadPlacesOfInterest().then(() => {
        if (worldMap) renderPlaceMarkers();
    });
    loadCountriesData().then(() => { if (worldMap) renderCountryLayer(); });
    loadRoutes().then(() => { if (worldMap) renderRouteLayer(); });
    loadPhotos().then(() => { if (worldMap) renderPhotoLayer(); });
    loadAdventures();

    const KEY = 'adventures-sidebar-collapsed';
    const split = document.querySelector('.adventures-page-split');
    const btn = document.getElementById('adventures-sidebar-toggle');
    if (!split || !btn) return;

    if (localStorage.getItem(KEY) !== '0') {
        split.classList.add('sidebar-collapsed');
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-label', 'Expand sidebar');
    }

    btn.addEventListener('click', function () {
        const collapsed = split.classList.toggle('sidebar-collapsed');
        localStorage.setItem(KEY, collapsed ? '1' : '0');
        btn.setAttribute('aria-expanded', String(!collapsed));
        btn.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    });
});
