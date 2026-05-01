const { renderDocument } = require('./document');

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
  const main = `<main class="adventure-detail-page">
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
    </div>`;

  const detailData = JSON.stringify({
    mapCenter: { lat: Number(adventure.mapCenter?.lat || 0), lng: Number(adventure.mapCenter?.lng || 0) },
    mapZoom: Number(adventure.mapZoom || 8),
    photoMarkers,
    galleryImages: lightboxImages
  });
  const scripts = `<script src="vendor/leaflet/leaflet.js"></script>
    <script src="js/theme.js"></script>
    <script type="application/json" id="adventure-detail-data">${detailData.replace(/</g, '\\u003c')}</script>
    <script src="js/adventure-detail.js" defer></script>`;

  return renderDocument({
    title: `${adventure.title} - ${siteName}`,
    nav,
    main,
    footer,
    scripts,
    bodyAttributes: 'class="nav-compact"',
    extraHead: '<link rel="stylesheet" href="vendor/leaflet/leaflet.css" />'
  });
}

module.exports = { renderAdventurePageTemplate };
