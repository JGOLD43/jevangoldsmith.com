import { tryReadString, tryWrite } from '../lib/storage';
import { registerActions } from './action-dispatcher';
import {
    ADVENTURES_DATA_URL, loadFilters, saveFilters,
    state
} from './adventures-state';
import { renderMapCarousel } from './adventures-carousel';
import { bindLightboxEvents, closeLightbox, nextImage, openLightbox, prevImage } from './adventures-lightbox';
import {
    clearMapHighlight,
    ensureWorldMap,
    highlightAdventureOnMap,
    setupWorldMapLazyLoad
} from './adventures-map-ui';
import { fetchJsonOr } from './data-fetch';
import { cloneTemplateElement } from './dom-template';
import { URL_PARAMS } from './url-params';
import type { AdventureGalleryItem, AdventureRecord } from './adventures-types';


// ============================================
// Adventures Page UI
// ============================================

let hasAdoptedSsrAdventures = false;
function renderAdventures(adventures: AdventureRecord[]) {
    const container = document.getElementById('adventures-container');
    if (!container) return;

    if (adventures.length === 0) {
        container.replaceChildren(createStatusMessage('No adventures found in this region.', 'var(--text-light)'));
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
    container.replaceChildren();
    adventures.forEach((adventure) => {
        container.appendChild(createCompactCard(adventure));
    });
}

function createCompactCard(adventure: AdventureRecord) {
    const card = document.createElement('div');
    card.className = 'adventure-compact-card';
    card.id = `card-${adventure.id}`;
    card.setAttribute('data-adventure-id', adventure.id);

    const formattedDate = formatDateRange(adventure.startDate, adventure.endDate);
    const image = document.createElement('img');
    image.src = adventure.heroImage || '';
    image.alt = adventure.title || '';
    image.className = 'adventure-compact-image';
    image.width = 80;
    image.height = 80;
    image.loading = 'eager';
    image.decoding = 'async';

    const info = document.createElement('div');
    info.className = 'adventure-compact-info';
    const location = document.createElement('div');
    location.className = 'adventure-compact-location';
    location.textContent = adventure.location || '';
    const title = document.createElement('h3');
    title.className = 'adventure-compact-title';
    title.textContent = adventure.title || '';
    const meta = document.createElement('div');
    meta.className = 'adventure-compact-meta';
    meta.textContent = `${formattedDate} · ${adventure.duration || ''}`;
    info.append(location, title, meta);
    card.append(image, info);

    card.addEventListener('click', () => selectAdventure(adventure.id));
    return card;
}

function selectAdventure(id: string) {
    const adventure = (state.allAdventures as AdventureRecord[]).find((item) => item.id === id);
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

function showAdventureDetail(adventure: AdventureRecord) {
    const overlay = document.getElementById('adventure-detail-overlay');
    const hero = document.getElementById('adventure-detail-hero') as HTMLImageElement | null;
    const location = document.getElementById('adventure-detail-location');
    const title = document.getElementById('adventure-detail-title');
    const date = document.getElementById('adventure-detail-date');
    const duration = document.getElementById('adventure-detail-duration');
    const description = document.getElementById('adventure-detail-description');
    if (!overlay || !hero || !location || !title || !date || !duration || !description) return;

    const formattedDate = formatDateRange(adventure.startDate, adventure.endDate);
    hero.src = adventure.heroImage || '';
    hero.alt = adventure.title || '';
    location.textContent = adventure.location || '';
    title.textContent = adventure.title || '';
    date.textContent = formattedDate;
    duration.textContent = adventure.duration || '';
    description.textContent = adventure.shortDescription || '';
    overlay.classList.add('active');
}

function renderInlineStory(adventure: AdventureRecord) {
    const section = document.getElementById('adventure-story-inline');
    const inner = document.getElementById('adventure-story-inner');
    if (!section || !inner) return;

    const formattedDate = formatDateRange(adventure.startDate, adventure.endDate);
    const highlights = Array.isArray(adventure.highlights) ? adventure.highlights : [];
    const gallery = Array.isArray(adventure.gallery) ? adventure.gallery : [];

    const hero = document.getElementById('adventure-story-hero-image') as HTMLImageElement | null;
    const location = document.getElementById('adventure-story-location');
    const title = document.getElementById('adventure-story-title');
    const subtitle = document.getElementById('adventure-story-subtitle');
    const date = document.getElementById('adventure-story-date');
    const duration = document.getElementById('adventure-story-duration');
    const content = document.getElementById('adventure-story-content');
    const highlightsSection = document.getElementById('adventure-story-highlights');
    const highlightsList = document.getElementById('adventure-story-highlights-list');
    const gallerySection = document.getElementById('adventure-story-gallery');
    const galleryGrid = document.getElementById('adventure-story-gallery-grid');
    if (!hero || !location || !title || !subtitle || !date || !duration || !content || !highlightsSection || !highlightsList || !gallerySection || !galleryGrid) return;

    hero.src = adventure.heroImage || '';
    hero.alt = adventure.title || '';
    location.textContent = adventure.location || '';
    title.textContent = adventure.title || '';
    subtitle.textContent = adventure.subtitle || '';
    subtitle.hidden = !adventure.subtitle;
    date.textContent = formattedDate;
    duration.textContent = adventure.duration || '';
    content.innerHTML = adventure.content || '';

    highlightsSection.hidden = highlights.length === 0;
    highlightsList.replaceChildren(...highlights.map((item) => {
        const li = cloneTemplateElement<HTMLLIElement>('adventure-highlight-template');
        if (!li) return document.createTextNode('');
        li.textContent = String(item || '');
        return li;
    }));

    gallerySection.hidden = gallery.length === 0;
    galleryGrid.replaceChildren(...gallery.map((item: AdventureGalleryItem, index: number) => {
        const figure = cloneTemplateElement<HTMLElement>('adventure-gallery-item-template');
        if (!figure) return document.createTextNode('');
        figure.dataset.adventureId = String(adventure.id || '');
        figure.dataset.index = String(index);
        const image = figure.querySelector('img') as HTMLImageElement | null;
        const caption = figure.querySelector('figcaption') as HTMLElement | null;
        if (image) {
            image.src = item.thumbnail || item.src || '';
            image.alt = item.caption || '';
        }
        if (caption) {
            caption.hidden = !item.caption;
            caption.textContent = item.caption;
        }
        return figure;
    }));

    section.hidden = false;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    armScrollUpToDismiss(section);
}

// Scroll-up-to-dismiss: only fires on upward scroll, and only once the
// user has first pushed the hero fully out of view. After that, while
// scrolling back up toward the map, dismiss when ~1/4 of the hero is
// visible again. Scrolling DOWN past the hero never dismisses — that
// would steal the page from a reader trying to get into the story.
function armScrollUpToDismiss(section: HTMLElement) {
    const hero = section.querySelector('.adventure-story-hero') as HTMLElement | null;
    if (!hero) return;
    let armed = false;
    let scrolledPast = false;
    let lastY = window.scrollY;
    const arm = () => { armed = true; window.removeEventListener('scroll', arm); };
    setTimeout(() => window.addEventListener('scroll', arm, { passive: true, once: true }), 600);

    const onScroll = () => {
        const y = window.scrollY;
        const goingUp = y < lastY;
        lastY = y;
        if (!armed || section.hidden) return;
        const rect = hero.getBoundingClientRect();
        // Latch once the hero is fully above the viewport.
        if (rect.bottom <= 0) scrolledPast = true;
        // Only dismiss on upward scroll, after the user actually
        // pushed the hero out of view, when ~1/4 of it has come back.
        if (scrolledPast && goingUp && rect.top > -(rect.height * 0.75)) {
            window.removeEventListener('scroll', onScroll);
            closeAdventureDetail();
            document.getElementById('world-map')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    (section as AnyObj)._dismissCleanup = () => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('scroll', arm);
    };
}

function closeAdventureDetail() {
    const overlay = document.getElementById('adventure-detail-overlay');
    if (overlay) overlay.classList.remove('active');

    const inlineStory = document.getElementById('adventure-story-inline');
    if (inlineStory) {
        const cleanup = (inlineStory as AnyObj)._dismissCleanup;
        if (typeof cleanup === 'function') { cleanup(); delete (inlineStory as AnyObj)._dismissCleanup; }
        inlineStory.hidden = true;
    }

    document.querySelectorAll('.adventure-compact-card').forEach((card) => {
        card.classList.remove('active');
    });

    state.selectedAdventureId = null;
    clearMapHighlight();
}

function populateSidebar(adventures: AdventureRecord[]) {
    const regions: Record<string, number> = {
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
    renderAdventures(state.allAdventures as AdventureRecord[]);
    updateAdventureCount(state.allAdventures.length);
}

function updateAllButtonState() {
    const allBtn = document.querySelector('.filter-pill[data-region="all"]');
    if (!allBtn) return;
    allBtn.classList.toggle('active', state.activeFilters.size === 0);
}

function applyFilters() {
    let filtered = state.allAdventures as AdventureRecord[];

    if (state.activeFilters.size > 0) {
        filtered = (state.allAdventures as AdventureRecord[]).filter((adventure) => {
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
        const message = createStatusMessage('Unable to load adventures', 'var(--accent-color)');
        const hint = document.createElement('p');
        hint.style.color = 'var(--text-light)';
        hint.textContent = 'Please try refreshing the page.';
        message.appendChild(hint);
        container.replaceChildren(message);
    }

    const worldMapEl = document.getElementById('world-map');
    if (worldMapEl) (worldMapEl as HTMLElement).style.display = 'none';
}

function createStatusMessage(text: string, color: string) {
    const wrap = document.createElement('div');
    wrap.style.textAlign = 'center';
    wrap.style.padding = '3rem';
    const message = document.createElement('p');
    message.style.color = color;
    message.textContent = text;
    wrap.appendChild(message);
    return wrap;
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
            const adventure = (state.allAdventures as AdventureRecord[]).find((item) => item.id === state.selectedAdventureId);
            if (adventure) renderInlineStory(adventure);
            return;
        }

        if (action === 'closeInlineStory') {
            const section = document.getElementById('adventure-story-inline');
            if (section) section.hidden = true;
            const list = document.getElementById('adventures-container') || document.querySelector('.adventures-sidebar');
            list?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

async function loadAdventures() {
    const data = await fetchJsonOr(ADVENTURES_DATA_URL) as AnyObj;
    if (!data || !Array.isArray(data.adventures)) {
        console.error('Error loading adventures');
        showErrorMessage();
        return;
    }
    state.allAdventures = (data.adventures as AdventureRecord[]).filter((item) => item.status === 'published');
    state.allAdventures.sort((left: AdventureRecord, right: AdventureRecord) => new Date(right.startDate || '').getTime() - new Date(left.startDate || '').getTime());

    renderAdventures(state.allAdventures as AdventureRecord[]);
    populateSidebar(state.allAdventures as AdventureRecord[]);
    renderMapCarousel(state.allAdventures as AdventureRecord[], selectAdventure);
    setupWorldMapLazyLoad(state.allAdventures as AdventureRecord[]);
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
        const popup = `<div class="now-popup-card"><div class="now-popup-place">${now.place}</div>${now.date ? `<div class="now-popup-date">${now.date}</div>` : ''}<a href="/now.html" class="now-popup-btn">Now update</a></div>`;
        marker.bindPopup(popup, {
            closeButton: false,
            // Only one popup open at a time across the whole map.
            autoClose: true,
            closeOnClick: true,
            className: 'map-marker-popup map-marker-popup-now'
        });
        // Hover opens the popup; pointer can travel onto the popup itself
        // (e.g. to click the Now update button) without it closing thanks
        // to a small mouseleave grace period.
        let closeTimer: number | null = null;
        const cancel = () => { if (closeTimer !== null) { clearTimeout(closeTimer); closeTimer = null; } };
        const schedule = () => { cancel(); closeTimer = window.setTimeout(() => marker.closePopup(), 220); };
        marker.on('mouseover', () => { cancel(); marker.openPopup(); });
        marker.on('mouseout', schedule);
        marker.on('popupopen', (event: AnyObj) => {
            const el = event.popup?.getElement?.();
            if (!el) return;
            el.addEventListener('mouseenter', cancel);
            el.addEventListener('mouseleave', schedule);
        });
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
        // Stash on state so the LAYERS panel "Now" checkbox can
        // add/remove these from the map without recreating them.
        state.nowMarker = marker;
        state.nowCircle = circle;
        // Honour the current Now-layer toggle on first paint. Default
        // is ON (see DEFAULT_FILTERS in adventures-state.ts), but a
        // returning visitor's stored layers may have it off.
        if (state.mapFilters?.layers?.now !== false) {
            marker.addTo(state.worldMap);
            circle.addTo(state.worldMap);
        }
        // ?focus=now: the map already initialized with the focused
        // center+zoom in adventures-map.ts. Refine to the 25km circle
        // bounds without animating, open the popup, then fade the map
        // in. The world-map element starts at opacity 0 (set by the
        // inline script in adventures.astro) so any tile-load lag /
        // brief render at default zoom is invisible — the user only
        // ever sees the fully-focused map.
        // Default load (no param) → regional zoom centered on Now pin.
        const params = new URLSearchParams(window.location.search);
        if (params.get('focus') === 'now') {
            state.worldMap.fitBounds(circle.getBounds(), { padding: [40, 40], animate: false });
            marker.openPopup();
            // Single rAF + short fade — the map is already laid out
            // when this code runs (initial setView already happened in
            // adventures-map.ts). The 120ms fade is just enough to mask
            // any sub-frame Leaflet tile work without adding perceived
            // delay.
            requestAnimationFrame(() => {
                const el = document.getElementById('world-map');
                if (el) {
                    el.style.transition = 'opacity 120ms cubic-bezier(.22, 1, .36, 1)';
                    el.style.opacity = '1';
                }
            });
        } else {
            state.worldMap.setView([now.lat, now.lng], 4, { animate: false });
        }
    });
}

function initAdventuresPage() {
    loadFilters();
    bindAdventureActions();
    bindLightboxEvents();
    // Mobile lands on the map (SSR pre-applies .map-view to avoid flicker);
    // desktop strips it before paint via the inline script in adventures.astro
    // setting html.adv-desktop. JS just synchronizes button state and ensures
    // the world map mounts so the Now marker has something to attach to.
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const focusNow = new URLSearchParams(window.location.search).get(URL_PARAMS.focus) === 'now';
    if (isMobile) {
        // Sync the bottom toggle's "active" state to match the SSR class.
        const split = document.querySelector('.adventures-page-split');
        if (split?.classList.contains('map-view')) {
            document.querySelectorAll('.mobile-view-btn').forEach((btn) => {
                btn.classList.toggle('active', (btn as HTMLElement).dataset.view === 'map');
            });
        }
        loadAdventures().then(() => {
            ensureWorldMap();
            placeNowMarkerAndFocus();
        });
    } else if (focusNow) {
        loadAdventures().then(() => { ensureWorldMap(); placeNowMarkerAndFocus(); });
    } else {
        // Desktop strips the SSR'd .map-view (mobile-only hint); restore the
        // split layout state so JS sees clean classes.
        const split = document.querySelector('.adventures-page-split');
        split?.classList.remove('map-view');
        loadAdventures();
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
    closeAdventureDetail,
    closeLightbox,
    nextImage,
    prevImage,
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
