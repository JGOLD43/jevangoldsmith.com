// ============================================
// Adventures Page Data + Map Runtime
// ============================================

async function loadAdventures() {
    try {
        const response = await fetch(ADVENTURES_DATA_URL);
        if (!response.ok) throw new Error('Failed to load adventures');

        const data = await response.json();
        allAdventures = data.adventures.filter((item) => item.status === 'published');
        allAdventures.sort((left, right) => new Date(right.startDate) - new Date(left.startDate));

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
        for (const category of placeCategories) {
            if (mapFilters.poiCategories[category.id] === undefined) {
                mapFilters.poiCategories[category.id] = true;
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
            const visited = await visRes.json();
            visitedIso = new Set(Array.isArray(visited.iso) ? visited.iso : []);
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
    } catch (_error) {
    }
    try {
        const response = await fetch(POPULAR_ROUTES_URL);
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data.routes)) merged.push(...data.routes);
        }
    } catch (_error) {
    }
    allRoutes = merged;
}

async function loadPhotos() {
    try {
        const response = await fetch(PHOTOS_DATA_URL);
        if (!response.ok) return;
        const data = await response.json();
        allPhotos = Array.isArray(data.photos) ? data.photos : [];
    } catch (_error) {
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

function nearestWrappedLongitude(lng, referenceLng) {
    let wrappedLng = lng;
    while (wrappedLng - referenceLng > 180) wrappedLng -= 360;
    while (wrappedLng - referenceLng < -180) wrappedLng += 360;
    return wrappedLng;
}

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
            marker.on('click', () => openPhotoLightbox(index));
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
