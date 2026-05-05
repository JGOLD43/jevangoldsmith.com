// Phase 4 slice 4.3 (Tier 1+2 plan): ambient types for the window-mounted
// namespaces that the legacy script files set + read. Quiet the
// ts(2568) hints from `astro check` without TS-converting every file.

// Phase 3.2: bare-identifier reads in adventures.ts / adventures-map.ts
// resolve via globalThis. Declare them as ambient globals so the TS
// compiler stops complaining about ts(2304) "Cannot find name". The
// values are still set + read through globalThis at runtime; this is
// only the type declaration surface.
declare global {
  // Leaflet — loaded via vendor bundle.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const L: any;

  // Adventures page state — set by adventures.ts on bootstrap, read
  // by adventures-map.ts.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let worldMap: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mapFilters: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let allAdventures: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let allPlaces: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let allRoutes: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let allPhotos: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let placeCategories: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let placeMarkers: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let countryGeo: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let countryLayer: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let visitedIso: Set<string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let routeLayer: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let photoLayer: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let basemapTileLayer: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let leafletPromise: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let markerClusterPromise: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mapDataPromise: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let worldMapRequested: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let activeFilters: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lightboxImages: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lightboxIndex: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let adventureMarkers: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let selectedAdventureId: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const FAST_BASEMAP_LAND: any;

  // Constants from the eager script that adventures-map.ts reads as
  // bare identifiers via globalThis.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const WEB_MERCATOR_MAX_LAT: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const HORIZONTAL_WRAP_BOUND: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ROUTE_TYPE_COLORS: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const BASEMAPS: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const FILTERS_STORAGE_KEY: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const DEFAULT_FILTERS: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ADVENTURES_DATA_URL: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const PLACES_DATA_URL: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ROUTES_DATA_URL: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const POPULAR_ROUTES_URL: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const POPULAR_ROUTES_INDEX_URL: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const PHOTOS_DATA_URL: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const COUNTRIES_GEO_URL: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const COUNTRIES_VISITED_URL: any;

  // Free fetch helpers (legacy bare-identifier reads in *-map / detail).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function fetchJson(url: string, fallback?: any): Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function escapeHTML(s: any): string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function escapeAttr(s: any): string;

  interface Window {
    // Adventures pile (set by site-astro/src/scripts/adventures.ts +
    // adventures-map.js).
    AdventuresMap?: {
      ensureWorldMap: (adventures: unknown) => Promise<unknown> | unknown;
      highlightAdventureOnMap?: (adventure: unknown) => unknown;
      clearMapHighlight?: () => unknown;
    };
    AdventuresState?: Record<string, unknown>;
    AdventuresUrls?: Record<string, string>;
    AdventuresConstants?: Record<string, unknown>;

    // Sanitize helpers exposed for legacy bare-identifier reads.
    escapeHTML?: (s: unknown) => string;
    escapeAttr?: (s: unknown) => string;
    sanitizeUrl?: (s: unknown, fallback?: string) => string;
    sanitizeHTML?: (s: string) => string;

    MovieStats?: { render: (movies: unknown) => void; compute: (movies: unknown) => unknown };

    // Legacy JG namespaces (still referenced by some consumers).
    JGActions?: { register: (handlers: unknown) => unknown };
    JGAnalytics?: { track: (name: string, details?: unknown) => unknown };
    JGCollectionUI?: Record<string, unknown>;
    JGCollectionRuntime?: { create: (config: unknown) => unknown };
    JGCollectionHelpers?: Record<string, unknown>;
    JGDataFetch?: { fetchJson: (url: string, opts?: unknown) => Promise<unknown>; fetchJsonWithFallback: (urls: string[], opts?: unknown) => Promise<unknown>; versionedUrl: (url: string) => Promise<string> };
    JGGridZoom?: { init: (config: unknown) => unknown; release: (grid: unknown) => unknown };
    JGTaskList?: { create: (config: unknown) => unknown };

    // Plausible (analytics).
    plausible?: (event: string, opts?: { props?: Record<string, unknown> }) => void;

    // Analytics endpoint hint (set on home pages for routing).
    JG_ANALYTICS_ENDPOINT?: string;
  }
}

export {};
