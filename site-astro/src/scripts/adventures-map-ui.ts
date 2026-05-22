import { state } from './adventures-state';
import type { AdventureRecord } from './adventures-types';

function loadAdventuresMapBundle(): Promise<AnyObj> {
    if (state.adventuresMapBundlePromise) return state.adventuresMapBundlePromise;
    state.adventuresMapBundlePromise = import('./adventures-map').then((mod) => {
        if (typeof mod.ensureWorldMap !== 'function') throw new Error('adventures-map module did not export ensureWorldMap');
        return mod;
    });
    return state.adventuresMapBundlePromise;
}

export async function ensureWorldMap(adventures = state.allAdventures) {
    const mapContainer = document.getElementById('world-map');
    mapContainer?.classList.add('map-loading');
    const api = await loadAdventuresMapBundle();
    return api.ensureWorldMap(adventures);
}

export function setupWorldMapLazyLoad(adventures: AdventureRecord[]) {
    const mapContainer = document.getElementById('world-map');
    if (!mapContainer) return;

    const split = document.querySelector('.adventures-page-split');
    const mobileToggle = document.querySelector('.adventures-mobile-toggle');
    const isMobileTabs = mobileToggle && getComputedStyle(mobileToggle).display !== 'none';
    if (isMobileTabs && !split?.classList.contains('map-view')) {
        const load = () => ensureWorldMap(adventures);
        mapContainer.addEventListener('pointerdown', load, { once: true, passive: true });
        mapContainer.addEventListener('touchstart', load, { once: true, passive: true });
        return;
    }

    ensureWorldMap(adventures);
}

export function nearestWrappedLongitude(lng: number, referenceLng: number) {
    let wrappedLng = lng;
    while (wrappedLng - referenceLng > 180) wrappedLng -= 360;
    while (wrappedLng - referenceLng < -180) wrappedLng += 360;
    return wrappedLng;
}

export function highlightAdventureOnMap(adventure: AdventureRecord) {
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

export function clearMapHighlight() {
    if (!state.worldMap) {
        if (state.adventuresMapBundlePromise) {
            state.adventuresMapBundlePromise.then((api: AnyObj) => api.ensureWorldMap()).then(clearMapHighlight);
        }
        return;
    }
    state.worldMap.setView([20, 0], 2, {
        animate: true,
        duration: 0.5
    });
}
