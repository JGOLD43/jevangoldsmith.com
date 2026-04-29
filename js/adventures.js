// ============================================
// Adventures Page Bootstrap
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    loadFilters();
    bindAdventureActions();

    loadPlacesOfInterest().then(() => {
        if (worldMap) renderPlaceMarkers();
    });
    loadCountriesData().then(() => {
        if (worldMap) renderCountryLayer();
    });
    loadRoutes().then(() => {
        if (worldMap) renderRouteLayer();
    });
    loadPhotos().then(() => {
        if (worldMap) renderPhotoLayer();
    });
    loadAdventures();

    const key = 'adventures-sidebar-collapsed';
    const split = document.querySelector('.adventures-page-split');
    const button = document.getElementById('adventures-sidebar-toggle');
    if (!split || !button) return;

    if (localStorage.getItem(key) !== '0') {
        split.classList.add('sidebar-collapsed');
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-label', 'Expand sidebar');
    }

    button.addEventListener('click', () => {
        const collapsed = split.classList.toggle('sidebar-collapsed');
        localStorage.setItem(key, collapsed ? '1' : '0');
        button.setAttribute('aria-expanded', String(!collapsed));
        button.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    });
});
