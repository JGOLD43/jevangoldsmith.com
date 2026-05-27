// Single source of truth for the /now page's "currently here" pin.
// now.astro renders the map thumb from this data; Base.astro preloads
// the same arcgis tile on every non-Now page so tap-to-now shows the
// satellite image instantly instead of waiting on a third-party fetch.

export const NOW_LAST_UPDATED = 'May 12, 2026';
export const NOW_LOCATION_LABEL = 'Ayr, QLD';
export const NOW_LAT = -19.5765;
export const NOW_LNG = 147.4035;
export const NOW_MAP_ZOOM = 10;

function tileCoords(lat: number, lng: number, zoom: number) {
    const xFrac = (lng + 180) / 360 * Math.pow(2, zoom);
    const yFrac = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom);
    return {
        xFrac,
        yFrac,
        tileX: Math.floor(xFrac),
        tileY: Math.floor(yFrac),
    };
}

export function nowMapThumbUrl() {
    const { tileX, tileY } = tileCoords(NOW_LAT, NOW_LNG, NOW_MAP_ZOOM);
    return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${NOW_MAP_ZOOM}/${tileY}/${tileX}`;
}

export function nowMapPinOffset() {
    const { xFrac, yFrac, tileX, tileY } = tileCoords(NOW_LAT, NOW_LNG, NOW_MAP_ZOOM);
    return {
        leftPct: ((xFrac - tileX) * 100).toFixed(2),
        topPct: ((yFrac - tileY) * 100).toFixed(2),
    };
}
