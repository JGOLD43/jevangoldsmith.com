import { escapeAttr, escapeHtml } from '../lib/html-escape';
import { tryReadString, tryWrite } from '../lib/storage';
import { registerActions } from './action-dispatcher';
import {
    ADVENTURES_DATA_URL, loadFilters, saveFilters,
    state, updateLightboxImage
} from './adventures-state';
import { fetchJsonOr } from './data-fetch';

// Async loader for the heavier Adventures map runtime. Vite/Astro emits
// a separate chunk for it, kept off the initial adventures bundle.
function loadAdventuresMapBundle(): Promise<AnyObj> {
    if (state.adventuresMapBundlePromise) return state.adventuresMapBundlePromise;
    state.adventuresMapBundlePromise = import('./adventures-map').then((mod) => {
        if (typeof mod.ensureWorldMap !== 'function') throw new Error('adventures-map module did not export ensureWorldMap');
        return mod;
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
            <div class="adventure-compact-location">${escapeHtml(adventure.location)}</div>
            <h3 class="adventure-compact-title">${escapeHtml(adventure.title)}</h3>
            <div class="adventure-compact-meta">${escapeHtml(formattedDate)} · ${escapeHtml(adventure.duration)}</div>
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
    // On mobile, skip the preview overlay — render the full inline story
    // immediately and scroll the user there. Desktop keeps the side-panel
    // preview because there's room for both panel + story side by side.
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) {
        renderInlineStory(adventure);
        requestAnimationFrame(() => {
            document.getElementById('adventure-story-inline')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    } else {
        showAdventureDetail(adventure);
    }
}

function showAdventureDetail(adventure: AnyObj) {
    const overlay = document.getElementById('adventure-detail-overlay');
    const content = document.getElementById('adventure-detail-content');
    if (!overlay || !content) return;

    const formattedDate = formatDateRange(adventure.startDate, adventure.endDate);

    content.innerHTML = `
        <img src="${escapeAttr(adventure.heroImage)}" alt="${escapeAttr(adventure.title)}" class="adventure-detail-hero" loading="lazy" decoding="async">
        <div class="adventure-detail-body">
            <div class="adventure-location">${escapeHtml(adventure.location)}</div>
            <h2 class="adventure-title">${escapeHtml(adventure.title)}</h2>
            <div class="adventure-meta">
                <span>${escapeHtml(formattedDate)}</span>
                <span>${escapeHtml(adventure.duration)}</span>
            </div>
            <p class="adventure-description">${escapeHtml(adventure.shortDescription)}</p>
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
        <button type="button" class="adventure-story-close" data-action="closeInlineStory" aria-label="Close story">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div class="adventure-story-hero">
            <img src="${escapeAttr(adventure.heroImage)}" alt="${escapeAttr(adventure.title)}" loading="lazy" decoding="async">
            <div class="adventure-story-hero-overlay">
                <div class="adventure-story-location">${escapeHtml(adventure.location)}</div>
                <h2 class="adventure-story-title">${escapeHtml(adventure.title)}</h2>
                ${adventure.subtitle ? `<p class="adventure-story-subtitle">${escapeHtml(adventure.subtitle)}</p>` : ''}
            </div>
        </div>
        <div class="adventure-story-body">
            <div class="adventure-story-meta">
                <span>${escapeHtml(formattedDate)}</span>
                <span>${escapeHtml(adventure.duration)}</span>
            </div>
            <div class="adventure-story-content">${adventure.content || ''}</div>
            ${highlights.length ? `<div class="adventure-story-highlights">
                <h3>Highlights</h3>
                <ul>${highlights.map((item: AnyObj) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
            </div>` : ''}
            ${gallery.length ? `<div class="adventure-story-gallery">
                <h3>Gallery</h3>
                <div class="adventure-story-gallery-grid">
                    ${gallery.map((item: AnyObj, index: number) => `<figure class="adventure-story-gallery-item" data-action="open-adventure-lightbox" data-adventure-id="${escapeAttr(adventure.id)}" data-index="${index}">
                        <img src="${escapeAttr(item.thumbnail || item.src)}" alt="${escapeAttr(item.caption || '')}" loading="lazy" decoding="async">
                        ${item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : ''}
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
        if (state.adventuresMapBundlePromise) {
            state.adventuresMapBundlePromise.then((api) => api.ensureWorldMap()).then(clearMapHighlight);
        }
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

function toggleFilter(buttonEl: HTMLElement) {
    // Region lives on data-region, not data-action-args (the markup ships
    // with empty args). Pull it from the button so we only have one source
    // of truth.
    const region = buttonEl?.dataset?.region || '';
    if (!region) return;
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

import { formatDateRange } from '../lib/dates';

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
    const data = await fetchJsonOr(ADVENTURES_DATA_URL) as AnyObj;
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

function readNowLocation() {
    const split = document.querySelector('.adventures-page-split');
    if (!split) return null;
    const lat = parseFloat((split as HTMLElement).dataset.nowLat || '');
    const lng = parseFloat((split as HTMLElement).dataset.nowLng || '');
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return {
        lat,
        lng,
        place: (split as HTMLElement).dataset.nowPlace || '',
        date: (split as HTMLElement).dataset.nowDate || ''
    };
}

function placeNowMarkerAndFocus() {
    // Wait for the worldMap + Leaflet to be ready, then drop a pulsing pin
    // for the latest /now location. If the user arrived with ?focus=now,
    // pan/zoom to ~50km radius (zoom 8).
    const now = readNowLocation();
    if (!now) return;
    const wait = (resolve: () => void) => {
        if ((window as AnyObj).L && state.worldMap) resolve();
        else setTimeout(() => wait(resolve), 80);
    };
    wait(() => {
        const L = (window as AnyObj).L;
        const html = '<span class="now-marker-pulse"></span><span class="now-marker-dot"></span>';
        const marker = L.marker([now.lat, now.lng], {
            icon: L.divIcon({
                className: 'now-marker',
                html,
                iconSize: [22, 22],
                iconAnchor: [11, 11],
                popupAnchor: [0, -10]
            }),
            riseOnHover: true,
            zIndexOffset: 9999
        });
        const popup = `<div style="font-family:Chivo,sans-serif;text-align:center"><div style="font-weight:600;margin:.15rem 0">${now.place}</div>${now.date ? `<div style="font-size:.78rem;color:#888;margin-bottom:.5rem">${now.date}</div>` : ''}<a href="/now.html" class="now-popup-btn">Now update</a></div>`;
        marker.bindPopup(popup);
        marker.addTo(state.worldMap);
        // 25km radius circle around the Now location.
        const circle = L.circle([now.lat, now.lng], {
            radius: 25000,
            color: '#ffd700',
            weight: 2,
            opacity: 0.95,
            fillColor: '#ffd700',
            fillOpacity: 0.14,
            interactive: false
        });
        circle.addTo(state.worldMap);
        // ?focus=now → fly close so the 25km circle fills the screen.
        // Default load (no param) → regional zoom centered on the Now pin so
        // the user immediately sees where I am in the world.
        const params = new URLSearchParams(window.location.search);
        if (params.get('focus') === 'now') {
            state.worldMap.fitBounds(circle.getBounds(), { padding: [40, 40], animate: true });
            setTimeout(() => marker.openPopup(), 600);
        } else {
            state.worldMap.setView([now.lat, now.lng], 4, { animate: false });
        }
    });
}

function initAdventuresPage() {
    loadFilters();
    bindAdventureActions();
    // On mobile, default to the map view — the list is always one tap away
    // via the bottom toggle but the map is the more visual entry point.
    // Wait for loadAdventures so the map has data to render.
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const focusNow = new URLSearchParams(window.location.search).get('focus') === 'now';
    if (isMobile || focusNow) {
        loadAdventures().then(() => {
            if (isMobile) switchMobileView('map');
            else ensureWorldMap();
            placeNowMarkerAndFocus();
        });
    } else {
        loadAdventures();
        // Drop the Now pin once the user lazily loads the map.
        setTimeout(placeNowMarkerAndFocus, 1500);
    }

    const key = 'adventures-sidebar-collapsed';
    const split = document.querySelector('.adventures-page-split');
    const button = document.getElementById('adventures-sidebar-toggle');
    if (!split || !button) return;

    if (tryReadString(key) !== '0') {
        split.classList.add('sidebar-collapsed');
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-label', 'Expand sidebar');
    }

    button.addEventListener('click', () => {
        const collapsed = split.classList.toggle('sidebar-collapsed');
        tryWrite(key, collapsed ? '1' : '0');
        button.setAttribute('aria-expanded', String(!collapsed));
        button.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    });
}

// Register data-action handlers used by HTML markup.
registerActions({
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
