// Side-effect import: the page's data-action buttons need the
// dispatcher's document-level click listener installed.
import './action-dispatcher';

// Inject Leaflet (147KB JS + 15KB CSS) on demand when the map element
// enters the viewport. Avoids eagerly loading vendor code on adventure-
// detail pages — most users never scroll to the map. Pan/zoom behavior
// is preserved once Leaflet finishes loading.
function loadLeafletOnDemand(onReady: () => void) {
    const mapEl = document.getElementById('adventure-map');
    if (!mapEl) return;
    if (typeof (window as any).L !== 'undefined') {
        onReady();
        return;
    }
    let triggered = false;
    const trigger = () => {
        if (triggered) return;
        triggered = true;
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = '/vendor/leaflet/leaflet.css';
        document.head.appendChild(css);
        const script = document.createElement('script');
        script.src = '/vendor/leaflet/leaflet.js';
        script.defer = true;
        script.onload = () => onReady();
        document.head.appendChild(script);
    };
    if (typeof IntersectionObserver === 'function') {
        const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    observer.disconnect();
                    trigger();
                    return;
                }
            }
        }, { rootMargin: '200px' });
        observer.observe(mapEl);
        return;
    }
    // No IO support — fall back to immediate load.
    trigger();
}

(() => {
    const dataEl = document.getElementById('adventure-detail-data');
    if (!dataEl) return;
    let config: any;
    try {
        config = JSON.parse(dataEl.textContent || '{}');
    } catch (_error) {
        return;
    }

    const { mapCenter, mapZoom, photoMarkers = [], galleryImages = [] } = config as { mapCenter?: { lat: number; lng: number }; mapZoom?: number; photoMarkers?: any[]; galleryImages?: any[] };

    if (document.getElementById('adventure-map')) {
        loadLeafletOnDemand(() => {
            const map = L.map('adventure-map').setView(
                [Number(mapCenter?.lat || 0), Number(mapCenter?.lng || 0)],
                Number(mapZoom || 8)
            );
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}').addTo(map);
            photoMarkers.forEach((photo: any) => {
                L.circleMarker([photo.lat, photo.lng], {
                    radius: 8, fillColor: '#C9A86C', color: '#fff', weight: 2, opacity: 1, fillOpacity: 0.9
                }).addTo(map).bindPopup(photo.caption);
            });
        });
    }

    let currentIndex = 0;

    function updateLightbox() {
        const image = document.getElementById('lightbox-image') as HTMLImageElement | null;
        const caption = document.getElementById('lightbox-caption');
        const counter = document.getElementById('lightbox-counter');
        if (!image || !galleryImages[currentIndex]) return;
        image.src = galleryImages[currentIndex].src;
        if (caption) caption.textContent = galleryImages[currentIndex].caption;
        if (counter) counter.textContent = `${currentIndex + 1} / ${galleryImages.length}`;
    }

    function openLightbox(index: number) {
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
        const trigger = (e.target as Element | null)?.closest?.('[data-action]') as HTMLElement | null;
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
