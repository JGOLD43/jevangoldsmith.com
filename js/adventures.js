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
// Rendering
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
        const card = createAdventureCard(adventure);
        container.appendChild(card);
    });
}

function createAdventureCard(adventure) {
    const card = document.createElement('article');
    card.className = 'adventure-card';
    card.id = adventure.id;

    const formattedDate = formatDateRange(adventure.startDate, adventure.endDate);
    const highlightsHTML = adventure.highlights
        .map(h => `<span class="highlight-tag">${h}</span>`)
        .join('');

    const galleryHTML = createGalleryHTML(adventure.gallery, adventure.id);

    card.innerHTML = `
        <!-- Collapsed View -->
        <div class="adventure-card-collapsed" onclick="expandAdventure('${adventure.id}', event)">
            <img src="${adventure.heroImage}" alt="${adventure.title}" class="adventure-hero-image" loading="lazy">
            <div class="adventure-card-content">
                <div class="adventure-meta">
                    <span class="adventure-location">${adventure.location}</span>
                    <span class="adventure-date">${formattedDate}</span>
                    <span class="adventure-duration">${adventure.duration}</span>
                </div>
                <h2 class="adventure-title">${adventure.title}</h2>
                ${adventure.subtitle ? `<p class="adventure-subtitle">${adventure.subtitle}</p>` : ''}
                <p class="adventure-description">${adventure.shortDescription}</p>
                <div class="adventure-highlights">${highlightsHTML}</div>
                <button class="expand-adventure-btn" onclick="expandAdventure('${adventure.id}', event)">
                    View Full Story
                </button>
            </div>
        </div>

        <!-- Expanded View -->
        <div class="adventure-expanded">
            <img src="${adventure.heroImage}" alt="${adventure.title}" class="adventure-expanded-hero">
            <div class="adventure-expanded-content">
                <button class="collapse-btn" onclick="collapseAdventure('${adventure.id}', event)">
                    &times; Close
                </button>
                <div class="adventure-meta">
                    <span class="adventure-location">${adventure.location}</span>
                    <span class="adventure-date">${formattedDate}</span>
                    <span class="adventure-duration">${adventure.duration}</span>
                </div>
                <h1 class="adventure-title">${adventure.title}</h1>
                ${adventure.subtitle ? `<p class="adventure-subtitle">${adventure.subtitle}</p>` : ''}

                <div class="adventure-body">
                    ${adventure.content}
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
        <div class="gallery-item" onclick="openLightbox('${adventureId}', ${index})">
            <img src="${photo.thumbnail || photo.src}" alt="${photo.caption}" loading="lazy">
            <div class="gallery-item-overlay">${photo.caption}</div>
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

    // Scroll back to card position
    setTimeout(() => {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
}

// ============================================
// Map Integration (Leaflet)
// ============================================
function initWorldMap(adventures) {
    const mapContainer = document.getElementById('world-map');
    if (!mapContainer || worldMap) return;

    // Check if there are any adventures with locations
    const adventuresWithLocation = adventures.filter(a => a.mapCenter);
    if (adventuresWithLocation.length === 0) {
        mapContainer.parentElement.style.display = 'none';
        return;
    }

    // Create map with controls (CSS hides them until hover)
    worldMap = L.map('world-map', {
        zoomControl: true,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        keyboard: false
    }).setView([30, 0], 1);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}').addTo(worldMap);

    // Add markers with popups for each adventure
    adventures.forEach(adventure => {
        if (adventure.mapCenter) {
            const marker = L.circleMarker([adventure.mapCenter.lat, adventure.mapCenter.lng], {
                radius: 6,
                fillColor: '#6B8E23',
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.9
            }).addTo(worldMap);

            marker.bindPopup(`
                <div style="min-width: 150px; text-align: center;">
                    <strong>${adventure.title}</strong><br>
                    <span style="color: #666;">${adventure.location}</span><br>
                    <a href="#${adventure.id}" onclick="expandAdventure('${adventure.id}'); return false;"
                       style="color: #6B8E23; font-weight: 500;">View Adventure →</a>
                </div>
            `);
        }
    });

    // Click to expand/collapse
    mapContainer.addEventListener('click', (e) => {
        // Don't collapse if clicking on a popup or control
        if (e.target.closest('.leaflet-popup') || e.target.closest('.leaflet-control')) {
            return;
        }

        const isExpanded = mapContainer.classList.contains('expanded');

        if (isExpanded) {
            collapseWorldMap(mapContainer);
        } else {
            expandWorldMap(mapContainer);
        }
    });

    // Click outside to close
    document.addEventListener('click', (e) => {
        if (!mapContainer.contains(e.target) && mapContainer.classList.contains('expanded')) {
            collapseWorldMap(mapContainer);
        }
    });
}

function expandWorldMap(mapContainer) {
    mapContainer.classList.add('expanded');
    worldMap.dragging.enable();
    worldMap.scrollWheelZoom.enable();
    worldMap.doubleClickZoom.enable();
    setTimeout(() => {
        worldMap.invalidateSize();
        worldMap.setView([30, 0], 2);
    }, 350);
}

function collapseWorldMap(mapContainer) {
    mapContainer.classList.remove('expanded');
    worldMap.dragging.disable();
    worldMap.scrollWheelZoom.disable();
    worldMap.doubleClickZoom.disable();
    worldMap.closePopup();
    setTimeout(() => {
        worldMap.invalidateSize();
        worldMap.setView([30, 0], 1);
    }, 350);
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
                        <img src="${photo.thumbnail || photo.src}" class="map-popup-image" alt="${photo.caption}">
                        <p class="map-popup-caption">${photo.caption}</p>
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
    const btn = document.querySelector(`.region-btn[data-region="${region}"]`);
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

    // Remove active class from all region buttons
    document.querySelectorAll('.region-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Add active class to All button
    buttonEl.classList.add('active');

    // Show all adventures
    renderAdventures(allAdventures);
    updateAdventureCount(allAdventures.length);
}

// Update the All button state based on active filters
function updateAllButtonState() {
    const allBtn = document.querySelector('.all-btn');
    if (activeFilters.size === 0) {
        allBtn.classList.add('active');
    } else {
        allBtn.classList.remove('active');
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
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', loadAdventures);
