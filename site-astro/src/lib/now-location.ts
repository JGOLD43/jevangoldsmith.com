// Single source of truth for the /now page lives in data/now.json (edit
// THAT to update what you're doing now — location, date, and the text
// sections). This module re-exports it as typed constants/helpers so pages
// don't each reach into the JSON shape.
//
// now.astro renders the current snapshot; Base.astro preloads the map tile
// on every non-Now page so tap-to-now shows the image instantly.
//
// The satellite tile is served LOCALLY (public/images/now-map.jpg), kept in
// sync by scripts/build-now-map.js. Every time data/now.json's `lastUpdated`
// changes, scripts/build-now-archive.js snapshots the whole update into
// data/now-history.json (powering /now/archive) — automatic in the build +
// dev pipeline.

import nowData from '../../../data/now.json';

export interface NowSection {
    title: string;
    body: string;
}

export const NOW_LAST_UPDATED: string = nowData.lastUpdated;
export const NOW_LOCATION_LABEL: string = nowData.location.label;
export const NOW_LAT: number = nowData.location.lat;
export const NOW_LNG: number = nowData.location.lng;
export const NOW_MAP_ZOOM: number = nowData.location.zoom;
export const NOW_SECTIONS: NowSection[] = nowData.sections;

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

// Local, same-origin satellite tile — paints with the page, no third-party
// round-trip, so the label + pin are never stranded over an empty box.
export function nowMapThumbUrl() {
    return '/images/now-map.jpg';
}

// The remote source for the local tile (used by build-now-map.js).
export function nowMapTileUrl() {
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
