// @ts-nocheck — Phase 3.2: legacy script ported from .js by mechanical rename. window-types.d.ts declares ambient globals so cross-module ReferenceError still trips, but DOM narrowing in event handlers + dynamic dictionary indexing would need pervasive casts. Per-file opt-in to strict typing is incremental work.
// ============================================
// Adventures Page Data + Map Runtime
// ============================================

import {
    state, fetchJson, updateLightboxImage,
    saveFilters, loadFilters, matchesAdventureFilters,
    matchesRegionFilter, adventureYear,
    ROUTE_TYPE_COLORS, BASEMAPS, FAST_BASEMAP_LAND,
    WEB_MERCATOR_MAX_LAT, HORIZONTAL_WRAP_BOUND
} from './adventures-state';
import { loadLeaflet, loadMarkerCluster } from './adventures-map-vendor';
import {
    loadCountriesData, loadMapDatasets,
    schedulePopularRoutes, setRouteRerender
} from './adventures-map-data';

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

function refreshMapDatasets() {
    if (!state.worldMap || !window.L) return;
    renderPlaceMarkers();
    renderCountryLayer();
    renderRouteLayer();
    renderPhotoLayer();
    applyAdventureMarkerFilter();
    buildMapControlStack();
}

function nearestWrappedLongitude(lng, referenceLng) {
    let wrappedLng = lng;
    while (wrappedLng - referenceLng > 180) wrappedLng -= 360;
    while (wrappedLng - referenceLng < -180) wrappedLng += 360;
    return wrappedLng;
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
    setBasemap(map, state.mapFilters.basemap || 'satellite');
}

function setBasemap(map, name) {
    if (!window.L || !map) return;
    const def = BASEMAPS[name] || BASEMAPS.satellite;

    if (state.basemapTileLayer && map === state.worldMap) {
        if (Array.isArray(state.basemapTileLayer)) state.basemapTileLayer.forEach((layer) => map.removeLayer(layer));
        else map.removeLayer(state.basemapTileLayer);
        state.basemapTileLayer = null;
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

    if (map === state.worldMap) state.basemapTileLayer = overlayLayer ? [layer, overlayLayer] : layer;
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

    const load = () => ensureWorldMap(adventures);
    const opts = { once: true, passive: true };
    mapContainer.addEventListener('pointerenter', load, opts);
    mapContainer.addEventListener('pointerdown', load, opts);
    mapContainer.addEventListener('touchstart', load, opts);
    mapContainer.addEventListener('focusin', load, { once: true });
}

async function ensureWorldMap(adventures = state.allAdventures) {
    if (state.worldMapRequested || state.worldMap) return;
    state.worldMapRequested = true;
    await loadLeaflet();
    initWorldMap(adventures);
    setTimeout(() => {
        loadMapDatasets()
            .then(() => {
                refreshMapDatasets();
                // defer popular-routes (~2MB) until idle so the
                // initial Total Bytes drops. The route layer renders again
                // once these resolve.
                schedulePopularRoutes();
            })
            .catch((error) => console.error('Error loading map overlays', error));
    }, 900);
}

function initWorldMap(adventures) {
    const mapContainer = document.getElementById('world-map');
    if (!mapContainer || state.worldMap || !window.L) return;
    mapContainer.classList.add('map-loaded');
    mapContainer.classList.remove('map-loading');
    mapContainer.querySelector('[data-map-load-shell]')?.remove();

    const adventuresWithLocation = adventures.filter((adventure) => adventure.mapCenter);
    if (adventuresWithLocation.length === 0) {
        mapContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#666;">No location data available</div>';
        return;
    }

    const verticalBounds = L.latLngBounds(
        [-WEB_MERCATOR_MAX_LAT, -HORIZONTAL_WRAP_BOUND],
        [WEB_MERCATOR_MAX_LAT, HORIZONTAL_WRAP_BOUND]
    );

    state.worldMap = L.map('world-map', {
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

    addFastBaseMap(state.worldMap);
    addSatelliteTiles(state.worldMap);

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
                layer: state.worldMap
            });
            if (index === 1) state.adventureMarkers[adventure.id] = marker;
        });
    });

    applyAdventureMarkerFilter();
    buildMapControlStack();

    const markerBounds = L.latLngBounds(adventuresWithLocation.map((adventure) => [
        adventure.mapCenter.lat,
        adventure.mapCenter.lng
    ]));
    state.worldMap.fitBounds(markerBounds.pad(0.28), { animate: false, maxZoom: 3 });

    requestAnimationFrame(() => {
        state.worldMap.invalidateSize();
        state.worldMap.fitBounds(markerBounds.pad(0.28), { animate: false, maxZoom: 3 });
    });

    if ('ResizeObserver' in window) {
        let resizeRaf = 0;
        const observer = new ResizeObserver(() => {
            if (resizeRaf) cancelAnimationFrame(resizeRaf);
            resizeRaf = requestAnimationFrame(() => {
                resizeRaf = 0;
                if (state.worldMap) state.worldMap.invalidateSize();
            });
        });
        observer.observe(mapContainer);
    }

    const split = document.querySelector('.adventures-page-split');
    if (split) {
        split.addEventListener('transitionend', (event) => {
            if (event.propertyName === 'grid-template-columns' && state.worldMap) {
                state.worldMap.invalidateSize();
            }
        });
    }
}

function renderPlaceMarkers() {
    if (!state.worldMap || !window.L) return;

    state.placeMarkers.forEach((marker) => state.worldMap.removeLayer(marker));
    state.placeMarkers = [];

    if (!state.mapFilters.layers.pois || state.allPlaces.length === 0) return;

    const worldCopyOffsets = [-360, 0, 360];
    const categoryColor = (id) => {
        const category = state.placeCategories.find((item) => item.id === id);
        return (category && category.color) || '#2b6cb0';
    };
    const categoryLabel = (id) => {
        const category = state.placeCategories.find((item) => item.id === id);
        return (category && category.label) || 'Place of interest';
    };

    state.allPlaces.forEach((place) => {
        if (typeof place.lat !== 'number' || typeof place.lng !== 'number') return;
        if (!matchesRegionFilter(place.region)) return;

        const category = place.category || 'wishlist';
        if (state.mapFilters.poiCategories[category] === false) return;

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
                layer: state.worldMap
            });
            state.placeMarkers.push(marker);
        });
    });
}

function togglePlacesOfInterest(buttonEl) {
    state.mapFilters.layers.pois = !state.mapFilters.layers.pois;
    state.placesVisible = state.mapFilters.layers.pois;
    if (buttonEl) buttonEl.classList.toggle('active', state.mapFilters.layers.pois);
    saveFilters();
    renderPlaceMarkers();
}

function applyAllFilters() {
    saveFilters();
    // enabling the routes layer kicks off popular-routes
    // fetch if it hasn't run yet. No-op if already loading or routeSet
    // is "mine".
    schedulePopularRoutes();
    applyAdventureMarkerFilter();
    renderPlaceMarkers();
    renderRouteLayer();
    renderPhotoLayer();
    renderCountryLayer();
}

function applyAdventureMarkerFilter() {
    if (!state.worldMap) return;
    Object.entries(state.adventureMarkers).forEach(([id, marker]) => {
        const adventure = state.allAdventures.find((item) => item.id === id);
        const visible = state.mapFilters.layers.adventures && adventure && matchesAdventureFilters(adventure);
        if (visible) {
            if (!state.worldMap.hasLayer(marker)) state.worldMap.addLayer(marker);
            return;
        }
        if (state.worldMap.hasLayer(marker)) state.worldMap.removeLayer(marker);
    });
}

function renderCountryLayer() {
    if (!state.worldMap || !window.L) return;
    if (state.countryLayer) {
        state.worldMap.removeLayer(state.countryLayer);
        state.countryLayer = null;
    }
    if (!state.mapFilters.layers.countries) return;
    // lazy-fetch countries data on first toggle. Re-renders
    // once the geometry resolves.
    if (!state.countryGeo) {
        loadCountriesData()
            .then(() => renderCountryLayer())
            .catch((error) => console.error('Error loading countries data', error));
        return;
    }

    state.countryLayer = L.geoJSON(state.countryGeo, {
        renderer: L.svg(),
        pane: 'overlayPane',
        filter: (feature) => state.visitedIso.has(feature.properties.iso),
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
    }).addTo(state.worldMap);
}

function renderRouteLayer() {
    if (!state.worldMap || !window.L) return;
    if (state.routeLayer) {
        state.worldMap.removeLayer(state.routeLayer);
        state.routeLayer = null;
    }
    if (!state.mapFilters.layers.routes || state.allRoutes.length === 0) return;

    const group = L.layerGroup();
    const routeSet = state.mapFilters.routeSet || 'all';

    state.allRoutes.forEach((route) => {
        const isBucket = route.adventureId === 'popular-routes';
        if (routeSet === 'mine' && isBucket) return;
        if (routeSet === 'bucket' && !isBucket) return;

        const adventure = state.allAdventures.find((item) => item.id === route.adventureId);
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
                    state.worldMap.fitBounds(bounds.pad(0.25), { animate: true, duration: 0.6, maxZoom: 13 });
                }
            });
            group.addLayer(polyline);
        });
    });

    state.routeLayer = group.addTo(state.worldMap);
}

function renderPhotoLayer() {
    if (!state.worldMap || !window.L) return;
    if (state.photoLayer) {
        state.worldMap.removeLayer(state.photoLayer);
        state.photoLayer = null;
    }
    if (!state.mapFilters.layers.photos || state.allPhotos.length === 0) return;

    const createLayer = () => {
        const cluster = window.L.markerClusterGroup
            ? L.markerClusterGroup({
                chunkedLoading: true,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: false,
                maxClusterRadius: 60
            })
            : L.layerGroup();

        state.allPhotos.forEach((photo, index) => {
            if (typeof photo.lat !== 'number' || typeof photo.lng !== 'number') return;

            const adventure = state.allAdventures.find((item) => item.id === photo.adventureId);
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

        state.photoLayer = cluster.addTo(state.worldMap);
    };

    if (window.L.markerClusterGroup) createLayer();
    else loadMarkerCluster().then(createLayer).catch(() => createLayer());
}

function photoUrl(driveId, size) {
    if (!driveId) return '';
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w${size}`;
}

function openPhotoLightbox(index) {
    state.lightboxImages = state.allPhotos
        .filter((photo) => typeof photo.lat === 'number' && typeof photo.lng === 'number')
        .map((photo) => ({
            src: photo.full || photoUrl(photo.driveId, 1600),
            caption: photo.caption || ''
        }));

    state.lightboxIndex = Math.max(0, Math.min(index, state.lightboxImages.length - 1));
    updateLightboxImage();

    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function buildMapControlStack() {
    if (!state.worldMap) return;
    const mapEl = document.getElementById('world-map');
    if (!mapEl || mapEl.querySelector('.map-controls-stack')) return;

    const years = [...new Set(state.allAdventures.map(adventureYear).filter(Boolean))].sort((left, right) => right - left);
    const regions = [...new Set(state.allAdventures.map((adventure) => adventure.region).filter(Boolean))].sort();

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
                    <option value="all" ${state.mapFilters.routeSet === 'all' ? 'selected' : ''}>All routes</option>
                    <option value="mine" ${state.mapFilters.routeSet === 'mine' ? 'selected' : ''}>Mine only</option>
                    <option value="bucket" ${state.mapFilters.routeSet === 'bucket' ? 'selected' : ''}>Bucket list only</option>
                </select>
            </div>
            <div class="map-controls-group">
                <label class="map-controls-label" for="map-filter-year">Year</label>
                <select id="map-filter-year" class="map-controls-select">
                    <option value="all">All</option>
                    ${years.map((year) => `<option value="${year}" ${String(state.mapFilters.year) === String(year) ? 'selected' : ''}>${year}</option>`).join('')}
                </select>
            </div>
            <div class="map-controls-group">
                <label class="map-controls-label" for="map-filter-region">Region</label>
                <select id="map-filter-region" class="map-controls-select">
                    <option value="all">All</option>
                    ${regions.map((region) => `<option value="${escapeAttr(region)}" ${String(state.mapFilters.region).toLowerCase() === String(region).toLowerCase() ? 'selected' : ''}>${escapeHTML(region)}</option>`).join('')}
                </select>
            </div>
            <div class="map-controls-group">
                <label class="map-controls-label" for="map-filter-basemap">Basemap</label>
                <select id="map-filter-basemap" class="map-controls-select">
                    ${Object.entries(BASEMAPS).map(([key, value]) => `<option value="${key}" ${state.mapFilters.basemap === key ? 'selected' : ''}>${escapeHTML(value.label)}</option>`).join('')}
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
            state.mapFilters.layers[target.dataset.layer] = target.checked;
            applyAllFilters();
            return;
        }
        if (target.matches('input[data-poi-category]')) {
            state.mapFilters.poiCategories[target.dataset.poiCategory] = target.checked;
            saveFilters();
            renderPlaceMarkers();
            return;
        }
        if (target.id === 'map-filter-year') {
            state.mapFilters.year = target.value;
            applyAllFilters();
            return;
        }
        if (target.id === 'map-filter-region') {
            state.mapFilters.region = target.value;
            applyAllFilters();
            return;
        }
        if (target.id === 'map-filter-basemap') {
            state.mapFilters.basemap = target.value;
            saveFilters();
            setBasemap(state.worldMap, target.value);
            return;
        }
        if (target.id === 'map-filter-routeset') {
            state.mapFilters.routeSet = target.value;
            saveFilters();
            // switching the route filter is explicit user
            // intent — fire the fetch immediately rather than waiting
            // for a map gesture.
            schedulePopularRoutes(true);
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
            <input type="checkbox" data-layer="${key}" ${state.mapFilters.layers[key] ? 'checked' : ''}>
            <span>${escapeHTML(label)}</span>
        </label>
    `).join('');
}

function renderPoiToggles() {
    if (!state.placeCategories.length) return '<p class="map-controls-empty">No categories</p>';
    return state.placeCategories.map((category) => `
        <label class="map-controls-check">
            <input type="checkbox" data-poi-category="${escapeAttr(category.id)}" ${state.mapFilters.poiCategories[category.id] !== false ? 'checked' : ''}>
            <span style="--poi-dot:${escapeAttr(category.color || '#666')}">${escapeHTML(category.label)}</span>
        </label>
    `).join('');
}

setRouteRerender(() => renderRouteLayer());

window.AdventuresMap = {
    ensureWorldMap
};

export {};
