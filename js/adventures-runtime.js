// ============================================
// Adventures Page Runtime State
// ============================================

const ADVENTURES_DATA_URL = 'data/adventures.json';
const PLACES_DATA_URL = 'data/placeofinterest.json';
const ROUTES_DATA_URL = 'data/routes.generated.json';
const POPULAR_ROUTES_URL = 'data/popular-routes.json';
const PHOTOS_DATA_URL = 'data/photos.generated.json';
const COUNTRIES_GEO_URL = 'data/countries.slim.generated.json';
const COUNTRIES_VISITED_URL = 'data/countries-visited.generated.json';
const FILTERS_STORAGE_KEY = 'adventures-map-filters-v1';
const WEB_MERCATOR_MAX_LAT = 85.05112878;
const HORIZONTAL_WRAP_BOUND = 1000000;

const ROUTE_TYPE_COLORS = {
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

const BASEMAPS = {
    streets: { label: 'Streets', tile: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', maxZoom: 19, subdomains: 'abc' },
    satellite: { label: 'Satellite', tile: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', maxZoom: 19 },
    hybrid: { label: 'Satellite + Labels', tile: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', maxZoom: 19, overlay: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}' },
    terrain: { label: 'Terrain', tile: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', maxZoom: 19 },
    dark: { label: 'Dark', tile: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png', maxZoom: 19, subdomains: 'abcd' },
    light: { label: 'Light', tile: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png', maxZoom: 19, subdomains: 'abcd' }
};

const DEFAULT_FILTERS = {
    year: 'all',
    region: 'all',
    layers: { adventures: true, routes: true, photos: true, pois: true, countries: false },
    poiCategories: {},
    basemap: 'satellite',
    routeSet: 'all'
};

let allAdventures = [];
let allPlaces = [];
let placeCategories = [];
let allRoutes = [];
let allPhotos = [];
let countryGeo = null;
let visitedIso = new Set();
let placesVisible = true;
let placeMarkers = [];
let routeLayer = null;
let photoLayer = null;
let countryLayer = null;
let basemapTileLayer = null;
let activeFilters = new Set();
let mapFilters = { ...DEFAULT_FILTERS, layers: { ...DEFAULT_FILTERS.layers }, poiCategories: {} };
let lightboxImages = [];
let lightboxIndex = 0;
let worldMap = null;
let adventureMaps = {};
let adventureMarkers = {};
let leafletPromise = null;
let markerClusterPromise = null;
let worldMapRequested = false;
let selectedAdventureId = null;
let currentAdventureView = 'list';

const FAST_BASEMAP_LAND = [
    [[72, -168], [68, -52], [56, -58], [48, -70], [32, -81], [19, -105], [24, -125], [39, -124], [51, -134], [59, -151]],
    [[34, -116], [29, -95], [17, -88], [8, -80], [-4, -81], [-18, -75], [-35, -70], [-55, -66], [-52, -45], [-30, -39], [-7, -35], [8, -50], [18, -63], [24, -82]],
    [[72, -10], [70, 42], [62, 98], [55, 145], [42, 158], [28, 124], [8, 104], [6, 78], [21, 59], [31, 35], [40, 23], [45, 5], [54, -7]],
    [[35, -18], [30, 32], [14, 45], [-3, 40], [-20, 30], [-35, 19], [-34, 1], [-20, -12], [5, -17], [22, -16]],
    [[-11, 112], [-11, 154], [-28, 154], [-39, 145], [-35, 116]],
    [[-34, 166], [-36, 178], [-46, 170], [-43, 166]],
    [[37, 126], [45, 142], [31, 146]],
    [[-12, 45], [-25, 50], [-22, 43]]
];
