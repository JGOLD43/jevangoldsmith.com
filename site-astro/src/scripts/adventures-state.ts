// Phase 3.3: shared state + constants for the adventures page. Replaces
// the globalThis.X assignments that adventures.ts and adventures-map.ts
// previously used to communicate. Both files import from this module;
// ES module caching gives them the same `state` instance and the same
// constant values without leaking onto window.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyValue = any;

// All fields are typed `any` because the runtime mutates them with values
// from the leaflet vendor bundle (no shipped types) + dynamic JSON. The
// goal of this slice is to remove globalThis pollution, not to add full
// type coverage to adventures-map.ts (that's tracked separately).
export const state: Record<string, AnyValue> = {
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
export const POPULAR_ROUTES_URL = 'data/popular-routes.json';
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

export const BASEMAPS: Record<string, AnyValue> = {
  streets: { label: 'Streets', tile: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', maxZoom: 19, subdomains: 'abc' },
  satellite: { label: 'Satellite', tile: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', maxZoom: 19 },
  hybrid: { label: 'Satellite + Labels', tile: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', maxZoom: 19, overlay: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}' },
  terrain: { label: 'Terrain', tile: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', maxZoom: 19 },
  dark: { label: 'Dark', tile: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png', maxZoom: 19, subdomains: 'abcd' },
  light: { label: 'Light', tile: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png', maxZoom: 19, subdomains: 'abcd' }
};

export const DEFAULT_FILTERS = {
  year: 'all',
  region: 'all',
  layers: { adventures: true, routes: true, photos: true, pois: true, countries: false },
  poiCategories: {},
  basemap: 'satellite',
  routeSet: 'all'
};

state.mapFilters = { ...DEFAULT_FILTERS, layers: { ...DEFAULT_FILTERS.layers }, poiCategories: {} };

// Shared helpers — used by both adventures.ts and adventures-map.ts.
// Kept here (not in either file) to avoid a cyclic import.
export async function fetchJson(url: string, fallback: unknown = null): Promise<unknown> {
  try {
    const response = await fetch(url);
    if (!response.ok) return fallback;
    return await response.json();
  } catch (_error) {
    return fallback;
  }
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

export const FAST_BASEMAP_LAND: number[][][] = [
  [[72, -168], [68, -52], [56, -58], [48, -70], [32, -81], [19, -105], [24, -125], [39, -124], [51, -134], [59, -151]],
  [[34, -116], [29, -95], [17, -88], [8, -80], [-4, -81], [-18, -75], [-35, -70], [-55, -66], [-52, -45], [-30, -39], [-7, -35], [8, -50], [18, -63], [24, -82]],
  [[72, -10], [70, 42], [62, 98], [55, 145], [42, 158], [28, 124], [8, 104], [6, 78], [21, 59], [31, 35], [40, 23], [45, 5], [54, -7]],
  [[35, -18], [30, 32], [14, 45], [-3, 40], [-20, 30], [-35, 19], [-34, 1], [-20, -12], [5, -17], [22, -16]],
  [[-11, 112], [-11, 154], [-28, 154], [-39, 145], [-35, 116]],
  [[-34, 166], [-36, 178], [-46, 170], [-43, 166]],
  [[37, 126], [45, 142], [31, 146]],
  [[-12, 45], [-25, 50], [-22, 43]]
];
