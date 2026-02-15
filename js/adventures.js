// ============================================
// Adventures Page JavaScript
// ============================================

// Configuration
const ADVENTURES_DATA_URL = 'data/adventures.json';

// State
let allAdventures = [];
let activeFilters = new Set(); // Track active region filters
let lightboxImages = [];
let lightboxIndex = 0;
let worldMap = null;
let adventureMaps = {};
let adventureMarkers = {}; // Store markers by adventure ID

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
        initWorldMap(allAdventures);
        updateAdventureCount(allAdventures.length);

    } catch (error) {
        console.error('Error loading adventures:', error);
        showErrorMessage();
    }
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
    const highlightsHTML = adventure.highlights
        .map(h => `<span class="highlight-tag">${escapeHTML(h)}</span>`)
        .join('');

    content.innerHTML = `
        <img src="${escapeAttr(adventure.heroImage)}" alt="${escapeAttr(adventure.title)}" class="adventure-detail-hero" loading="lazy" decoding="async">
        <div class="adventure-detail-body">
            <div class="adventure-location">${escapeHTML(adventure.location)}</div>
            <h2 class="adventure-title">${escapeHTML(adventure.title)}</h2>
            ${adventure.subtitle ? `<p class="adventure-subtitle">${escapeHTML(adventure.subtitle)}</p>` : ''}
            <div class="adventure-meta">
                <span>${escapeHTML(formattedDate)}</span>
                <span>${escapeHTML(adventure.duration)}</span>
            </div>
            <p class="adventure-description">${escapeHTML(adventure.shortDescription)}</p>
            <div class="adventure-highlights">${highlightsHTML}</div>
            <a href="adventure-${escapeAttr(adventure.id)}.html" class="view-full-story-btn">View Full Story</a>
        </div>
    `;

    overlay.classList.add('active');
}

function closeAdventureDetail() {
    const overlay = document.getElementById('adventure-detail-overlay');
    if (overlay) {
        overlay.classList.remove('active');
    }

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
        <div class="adventure-card-collapsed" onclick="expandAdventure('${escapeAttr(adventure.id)}', event)">
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
                <button class="expand-adventure-btn" onclick="expandAdventure('${escapeAttr(adventure.id)}', event)">
                    View Full Story
                </button>
            </div>
        </div>

        <!-- Expanded View -->
        <div class="adventure-expanded">
            <img src="${escapeAttr(adventure.heroImage)}" alt="${escapeAttr(adventure.title)}" class="adventure-expanded-hero" loading="lazy" decoding="async">
            <div class="adventure-expanded-content">
                <button class="collapse-btn" onclick="collapseAdventure('${escapeAttr(adventure.id)}', event)">
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
        <div class="gallery-item" onclick="openLightbox('${escapeAttr(adventureId)}', ${index})">
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
    if (!worldMap || !adventure || !adventure.mapCenter) return;

    // Pan the map to center on this location with higher zoom
    worldMap.setView([adventure.mapCenter.lat, adventure.mapCenter.lng], 5, {
        animate: true,
        duration: 0.5
    });
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
function initWorldMap(adventures) {
    const mapContainer = document.getElementById('world-map');
    if (!mapContainer || worldMap) return;

    // Check if there are any adventures with locations
    const adventuresWithLocation = adventures.filter(a => a.mapCenter);
    if (adventuresWithLocation.length === 0) {
        mapContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#666;">No location data available</div>';
        return;
    }

    // Create fully interactive map for the large panel
    // Tight bounds to hide "no data" areas while showing all adventure markers
    const southWest = L.latLng(-50, -130);
    const northEast = L.latLng(65, 160);
    const bounds = L.latLngBounds(southWest, northEast);

    worldMap = L.map('world-map', {
        zoomControl: true,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        touchZoom: true,
        keyboard: true,
        minZoom: 3,
        maxZoom: 18,
        maxBounds: bounds,
        maxBoundsViscosity: 1.0
    }).setView([25, 40], 3);

    // Use ESRI World Imagery satellite tiles
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19
    }).addTo(worldMap);

    // Add markers with popups for each adventure
    adventures.forEach(adventure => {
        if (adventure.mapCenter) {
            const marker = L.circleMarker([adventure.mapCenter.lat, adventure.mapCenter.lng], {
                radius: 8,
                fillColor: '#C9A86C',
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.9
            }).addTo(worldMap);

            marker.bindPopup(`
                <div style="min-width: 180px; text-align: center; padding: 0.5rem;">
                    <strong style="font-size: 1rem;">${escapeHTML(adventure.title)}</strong><br>
                    <span style="color: #666; font-size: 0.85rem;">${escapeHTML(adventure.location)}</span><br>
                    <button onclick="selectAdventure('${escapeAttr(adventure.id)}')"
                       style="margin-top: 0.5rem; padding: 0.4rem 1rem; background: #C9A86C; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
                       View Details
                    </button>
                </div>
            `);

            // Store marker reference for highlighting
            adventureMarkers[adventure.id] = marker;

            // Click marker to select adventure
            marker.on('click', () => {
                selectAdventure(adventure.id);
            });
        }
    });

    // Invalidate size after a short delay to ensure proper rendering
    setTimeout(() => {
        worldMap.invalidateSize();
    }, 100);
}

function initAdventureMap(adventure) {
    const mapContainer = document.getElementById(`map-${adventure.id}`);
    if (!mapContainer || adventureMaps[adventure.id]) return;

    // Check if there are photos with locations
    const photosWithLocation = adventure.gallery.filter(p => p.lat && p.lng);
    if (photosWithLocation.length === 0) return;

    const map = L.map(`map-${adventure.id}`).setView(
        [adventure.mapCenter.lat, adventure.mapCenter.lng],
        adventure.mapZoom || 10
    );

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }).addTo(map);

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
        // Invalidate map size to fix rendering issues
        if (worldMap) {
            setTimeout(() => worldMap.invalidateSize(), 100);
        }
    } else {
        pageContainer.classList.remove('map-view');
    }
}

// ============================================
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', loadAdventures);
