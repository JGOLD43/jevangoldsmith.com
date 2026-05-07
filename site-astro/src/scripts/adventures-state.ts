// shared state + constants for the adventures page. Replaces
// the globalThis.X assignments that adventures.ts and adventures-map.ts
// previously used to communicate. Both files import from this module;
// ES module caching gives them the same `state` instance and the same
// constant values without leaking onto window.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import FAST_BASEMAP_LAND_DATA from '../../../data/fast-basemap-land.json';

type AnyObj = any;

// All fields are typed `any` because the runtime mutates them with values
// from the leaflet vendor bundle (no shipped types) + dynamic JSON. The
// goal of this slice is to remove globalThis pollution, not to add full
// type coverage to adventures-map.ts (that's tracked separately).
export const state: Record<string, AnyObj> = {
  allAdventures: [],
  allPlaces: [],
  placeCategories: [],
  allRoutes: [],
  allPhotos: [],
  countryGeo: null,
  visitedIso: new Set<string>(),
  placesVisible: true,
  placeMarkers: [],
  routeLayer: null,
  photoLayer: null,
  countryLayer: null,
  basemapTileLayer: null,
  activeFilters: new Set<string>(),
  mapFilters: null,
  lightboxImages: [],
  lightboxIndex: 0,
  worldMap: null,
  adventureMaps: {},
  adventureMarkers: {},
  leafletPromise: null,
  markerClusterPromise: null,
  mapDataPromise: null,
  worldMapRequested: false,
  selectedAdventureId: null,
  currentAdventureView: 'list',
  adventuresMapBundlePromise: null,
  countriesPromise: null,
  popularRoutesPromise: null
};

export const ADVENTURES_DATA_URL = 'data/adventures.json';
export const PLACES_DATA_URL = 'data/placeofinterest.json';
export const ROUTES_DATA_URL = 'data/routes.generated.json';
export const POPULAR_ROUTES_INDEX_URL = 'data/popular-routes.index.json';
export const PHOTOS_DATA_URL = 'data/photos.generated.json';
export const COUNTRIES_GEO_URL = 'data/countries.slim.generated.json';
export const COUNTRIES_VISITED_URL = 'data/countries-visited.generated.json';
export const FILTERS_STORAGE_KEY = 'adventures-map-filters-v1';
export const WEB_MERCATOR_MAX_LAT = 85.05112878;
export const HORIZONTAL_WRAP_BOUND = 1000000;

export const ROUTE_TYPE_COLORS: Record<string, string> = {
  hike: '#38a169',
  drive: '#dd6b20',
  bike: '#d69e2e',
  flight: '#9f7aea',
  sail: '#3182ce',
  paddle: '#0987a0',
  run: '#e53e3e',
  walk: '#4a5568',
  ski: '#63b3ed',
  track: '#C9A86C'
};

export const BASEMAPS: Record<string, AnyObj> = {
  streets: { label: 'Streets', tile: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', maxZoom: 19, subdomains: 'abc' },
  satellite: { label: 'Satellite', tile: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', maxZoom: 19 },
  hybrid: { label: 'Satellite + Labels', tile: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', maxZoom: 19, overlay: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}' },
  terrain: { label: 'Terrain', tile: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', maxZoom: 19 },
  dark: { label: 'Dark', tile: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png', maxZoom: 19, subdomains: 'abcd' },
  light: { label: 'Light', tile: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png', maxZoom: 19, subdomains: 'abcd' }
};

// First-visit default: every map data layer OFF. The map opens to a
// clean world-map background and the user enables only what they want
// to see from the controls panel. Saved preferences (localStorage
// adventures-map-filters-v1) override these on subsequent visits.
export const DEFAULT_FILTERS = {
  year: 'all',
  region: 'all',
  layers: { adventures: false, routes: false, photos: false, pois: false, countries: false },
  poiCategories: {},
  basemap: 'satellite',
  routeSet: 'all'
};

state.mapFilters = { ...DEFAULT_FILTERS, layers: { ...DEFAULT_FILTERS.layers }, poiCategories: {} };

export { fetchJsonOr } from './data-fetch';

import { tryRead, tryWrite } from '../lib/storage';

export function loadFilters(): void {
  const stored = tryRead<AnyObj>(FILTERS_STORAGE_KEY, null);
  if (!stored || typeof stored !== 'object') return;
  state.mapFilters = {
    year: stored.year || 'all',
    region: stored.region || 'all',
    layers: { ...DEFAULT_FILTERS.layers, ...(stored.layers || {}) },
    poiCategories: { ...(stored.poiCategories || {}) },
    basemap: stored.basemap || 'satellite',
    routeSet: stored.routeSet || 'all'
  };
  state.placesVisible = state.mapFilters.layers.pois;
}

export function saveFilters(): void {
  tryWrite(FILTERS_STORAGE_KEY, state.mapFilters);
}

export function adventureYear(adventure: { startDate?: string }): number | null {
  if (!adventure || !adventure.startDate) return null;
  const date = new Date(adventure.startDate);
  return Number.isNaN(date.getTime()) ? null : date.getUTCFullYear();
}

function matchesYearFilter(year: number | null | string): boolean {
  if (state.mapFilters.year === 'all' || state.mapFilters.year === null) return true;
  return String(year) === String(state.mapFilters.year);
}

export function matchesRegionFilter(region?: string | null): boolean {
  if (state.mapFilters.region === 'all' || !state.mapFilters.region) return true;
  if (!region) return false;
  return String(region).toLowerCase() === String(state.mapFilters.region).toLowerCase();
}

export function matchesAdventureFilters(adventure: { startDate?: string; region?: string }): boolean {
  return matchesYearFilter(adventureYear(adventure)) && matchesRegionFilter(adventure.region);
}

export function updateLightboxImage(): void {
  const photo = state.lightboxImages[state.lightboxIndex];
  if (!photo) return;
  const img = document.getElementById('lightbox-image') as HTMLImageElement | null;
  const cap = document.getElementById('lightbox-caption');
  const counter = document.getElementById('lightbox-counter');
  if (img) img.src = photo.src;
  if (cap) cap.textContent = photo.caption || '';
  if (counter) counter.textContent = `${state.lightboxIndex + 1} / ${state.lightboxImages.length}`;
}

export const FAST_BASEMAP_LAND: number[][][] = FAST_BASEMAP_LAND_DATA;
