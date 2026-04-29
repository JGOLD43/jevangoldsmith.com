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
