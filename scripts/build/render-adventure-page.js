function renderAdventurePageTemplate({
  nav,
  footer,
  adventure,
  gallery,
  photoMarkers,
  lightboxImages,
  siteName,
  formatDateRange,
  escapeHTML,
  escapeHtmlAttr
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHTML(`${adventure.title} - ${siteName}`)}</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="icon" type="image/svg+xml" href="images/favicon.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Chivo:wght@300;400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="vendor/leaflet/leaflet.css" />
</head>
<body class="nav-compact">
    ${nav}

    <main class="adventure-detail-page">
        <div class="adventure-hero">
            <img src="${escapeHtmlAttr(adventure.heroImage)}" alt="${escapeHtmlAttr(adventure.title)}" width="1200" height="800" decoding="async" fetchpriority="high">
            <div class="adventure-hero-overlay">
                <div class="adventure-hero-location">${escapeHTML(adventure.location)}</div>
                <h1 class="adventure-hero-title">${escapeHTML(adventure.title)}</h1>
                ${adventure.subtitle ? `<p class="adventure-hero-subtitle">${escapeHTML(adventure.subtitle)}</p>` : ''}
            </div>
        </div>

        <div class="adventure-content">
            <a href="adventures.html" class="adventure-back-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Back to Adventures
            </a>

            <div class="adventure-meta-bar">
                <div class="adventure-meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <span>${escapeHTML(formatDateRange(adventure.startDate, adventure.endDate))}</span>
                </div>
                <div class="adventure-meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span>${escapeHTML(adventure.duration)}</span>
                </div>
                <div class="adventure-meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span>${escapeHTML(adventure.location)}</span>
                </div>
            </div>

            <div class="adventure-story">
                ${adventure.content || ''}
            </div>

            <div class="adventure-highlights-section">
                <h3>Trip Highlights</h3>
                <div class="adventure-highlights-list">
                    ${(adventure.highlights || []).map((highlight) => `<span class="adventure-highlight-tag">${escapeHTML(highlight)}</span>`).join('\n                    ')}
                </div>
            </div>

            <div class="adventure-map-section">
                <h3>Photo Locations</h3>
                <div class="adventure-map-container" id="adventure-map"></div>
            </div>

            <div class="adventure-gallery-section">
                <h3>Photo Gallery</h3>
                <div class="adventure-gallery-grid">
                    ${gallery.map((photo, index) => `<div class="adventure-gallery-item" data-action="open-lightbox" data-index="${index}">
                        <img src="${escapeHtmlAttr(photo.src)}" alt="${escapeHtmlAttr(photo.caption || adventure.title)}" width="800" height="533" loading="lazy" decoding="async">
                        <div class="adventure-gallery-caption">${escapeHTML(photo.caption || adventure.title)}</div>
                    </div>`).join('\n                    ')}
                </div>
            </div>
        </div>
    </main>

    <div id="lightbox" class="lightbox">
        <span class="lightbox-close" data-action="lightbox-close">&times;</span>
        <span class="lightbox-prev" data-action="lightbox-prev">&#10094;</span>
        <img id="lightbox-image" src="" alt="">
        <span class="lightbox-next" data-action="lightbox-next">&#10095;</span>
        <div class="lightbox-caption" id="lightbox-caption"></div>
        <div class="lightbox-counter" id="lightbox-counter"></div>
    </div>

    ${footer}

    <script src="vendor/leaflet/leaflet.js"></script>
    <script src="js/theme.js"></script>
    <script>
        const map = L.map('adventure-map').setView([${Number(adventure.mapCenter?.lat || 0)}, ${Number(adventure.mapCenter?.lng || 0)}], ${Number(adventure.mapZoom || 8)});
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}').addTo(map);

        const photos = ${JSON.stringify(photoMarkers, null, 12)};

        photos.forEach(photo => {
            L.circleMarker([photo.lat, photo.lng], {
                radius: 8, fillColor: '#C9A86C', color: '#fff', weight: 2, opacity: 1, fillOpacity: 0.9
            }).addTo(map).bindPopup(photo.caption);
        });

        const galleryImages = ${JSON.stringify(lightboxImages, null, 12)};
        let currentIndex = 0;

        function openLightbox(index) {
            currentIndex = index;
            updateLightbox();
            document.getElementById('lightbox').classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeLightbox() {
            document.getElementById('lightbox').classList.remove('active');
            document.body.style.overflow = 'auto';
        }

        function nextImage() {
            currentIndex = (currentIndex + 1) % galleryImages.length;
            updateLightbox();
        }

        function prevImage() {
            currentIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
            updateLightbox();
        }

        function updateLightbox() {
            document.getElementById('lightbox-image').src = galleryImages[currentIndex].src;
            document.getElementById('lightbox-caption').textContent = galleryImages[currentIndex].caption;
            document.getElementById('lightbox-counter').textContent = \`\${currentIndex + 1} / \${galleryImages.length}\`;
        }

        document.addEventListener('keydown', (e) => {
            if (!document.getElementById('lightbox').classList.contains('active')) return;
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
            if (action === 'lightbox-close') {
                closeLightbox();
                return;
            }
            if (action === 'lightbox-next') {
                nextImage();
                return;
            }
            if (action === 'lightbox-prev') {
                prevImage();
            }
        });
    </script>
</body>
</html>
`;
}

module.exports = { renderAdventurePageTemplate };
