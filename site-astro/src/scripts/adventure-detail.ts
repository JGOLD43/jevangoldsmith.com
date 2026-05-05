// @ts-nocheck — Phase 3.2: legacy script ported from .js by mechanical rename. window-types.d.ts declares ambient globals so cross-module ReferenceError still trips, but DOM narrowing in event handlers + dynamic dictionary indexing would need pervasive casts. Per-file opt-in to strict typing is incremental work.
(() => {
    const dataEl = document.getElementById('adventure-detail-data');
    if (!dataEl) return;
    let config;
    try {
        config = JSON.parse(dataEl.textContent || '{}');
    } catch (_error) {
        return;
    }

    const { mapCenter, mapZoom, photoMarkers = [], galleryImages = [] } = config;

    if (typeof L !== 'undefined' && document.getElementById('adventure-map')) {
        const map = L.map('adventure-map').setView(
            [Number(mapCenter?.lat || 0), Number(mapCenter?.lng || 0)],
            Number(mapZoom || 8)
        );
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}').addTo(map);

        photoMarkers.forEach((photo) => {
            L.circleMarker([photo.lat, photo.lng], {
                radius: 8, fillColor: '#C9A86C', color: '#fff', weight: 2, opacity: 1, fillOpacity: 0.9
            }).addTo(map).bindPopup(photo.caption);
        });
    }

    let currentIndex = 0;

    function updateLightbox() {
        const image = document.getElementById('lightbox-image');
        const caption = document.getElementById('lightbox-caption');
        const counter = document.getElementById('lightbox-counter');
        if (!image || !galleryImages[currentIndex]) return;
        image.src = galleryImages[currentIndex].src;
        if (caption) caption.textContent = galleryImages[currentIndex].caption;
        if (counter) counter.textContent = `${currentIndex + 1} / ${galleryImages.length}`;
    }

    function openLightbox(index) {
        currentIndex = index;
        updateLightbox();
        const lightbox = document.getElementById('lightbox');
        if (!lightbox) return;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        const lightbox = document.getElementById('lightbox');
        if (!lightbox) return;
        lightbox.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    function nextImage() {
        if (!galleryImages.length) return;
        currentIndex = (currentIndex + 1) % galleryImages.length;
        updateLightbox();
    }

    function prevImage() {
        if (!galleryImages.length) return;
        currentIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
        updateLightbox();
    }

    document.addEventListener('keydown', (e) => {
        const lightbox = document.getElementById('lightbox');
        if (!lightbox || !lightbox.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') nextImage();
        if (e.key === 'ArrowLeft') prevImage();
    });

    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('[data-action]');
        if (!trigger) return;
        const action = trigger.dataset.action;
        if (action === 'open-lightbox') {
            const idx = Number.parseInt(trigger.dataset.index || '0', 10);
            openLightbox(Number.isNaN(idx) ? 0 : idx);
            return;
        }
        if (action === 'lightbox-close') closeLightbox();
        else if (action === 'lightbox-next') nextImage();
        else if (action === 'lightbox-prev') prevImage();
    });
})();

export {};
