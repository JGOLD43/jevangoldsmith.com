// adventures map. Pure data layer — populates state.{allPlaces, allRoutes,
// allPhotos, countryGeo, ...} from network. The render module reads state;
// no circular dependency.
//
// The countries data is gated on the layer toggle (default off). Popular
// routes (~2MB across chunks) wait for the user's first map gesture so
// initial Total Bytes don't pay for them. Switching the routeSet filter
// forces the fetch immediately.
import {
  state, fetchJsonOr,
  PLACES_DATA_URL, ROUTES_DATA_URL, POPULAR_ROUTES_URL,
  POPULAR_ROUTES_INDEX_URL, PHOTOS_DATA_URL,
  COUNTRIES_GEO_URL, COUNTRIES_VISITED_URL,
  saveFilters
} from './adventures-state';

// schedulePopularRoutes needs to call back into the renderer once the
// data lands. Wired by the entry module via setRouteRerender so this
// file doesn't import from adventures-map-render.ts (avoids a render →
// data circular dep when the renderer itself wants to trigger a load).
let routeRerender: () => void = () => {};
export function setRouteRerender(fn: () => void) { routeRerender = fn; }

export async function loadPlacesOfInterest() {
  const data: any = await fetchJsonOr(PLACES_DATA_URL);
  if (!data) return;
  state.allPlaces = Array.isArray(data.places) ? data.places : [];
  state.placeCategories = Array.isArray(data.categories) ? data.categories : [];
  for (const category of state.placeCategories) {
    if (state.mapFilters.poiCategories[category.id] === undefined) {
      state.mapFilters.poiCategories[category.id] = true;
    }
  }
  saveFilters();
}

export async function loadCountriesData() {
  if (state.countriesPromise) return state.countriesPromise;
  state.countriesPromise = (async () => {
    const [geo, visited]: any = await Promise.all([
      fetchJsonOr(COUNTRIES_GEO_URL),
      fetchJsonOr(COUNTRIES_VISITED_URL)
    ]);
    if (geo) state.countryGeo = geo;
    if (visited) state.visitedIso = new Set(Array.isArray(visited.iso) ? visited.iso : []);
  })();
  return state.countriesPromise;
}

export async function loadRoutes() {
  const primary: any = await fetchJsonOr(ROUTES_DATA_URL, { routes: [] });
  state.allRoutes = Array.isArray(primary?.routes) ? primary.routes : [];
}

export async function loadPopularRoutes() {
  if (state.popularRoutesPromise) return state.popularRoutesPromise;
  state.popularRoutesPromise = (async () => {
    const index: any = await fetchJsonOr(POPULAR_ROUTES_INDEX_URL);
    const chunks = Array.isArray(index?.chunks) ? index.chunks : [];
    let payload: any;
    if (chunks.length === 0) {
      payload = await fetchJsonOr(POPULAR_ROUTES_URL, { routes: [] });
    } else {
      // Tiny chunks (paddle/sail/ski/hike) ship inline inside the index;
      // heavy chunks (drive/bike) live as separate cacheable JSON files.
      const inlineRoutes = chunks
        .filter((chunk: any) => chunk?.inline && chunk?.payload)
        .flatMap((chunk: any) => Array.isArray(chunk.payload.routes) ? chunk.payload.routes : []);
      const externalChunks = chunks.filter((chunk: any) => chunk?.href);
      const externalPayloads: any[] = await Promise.all(
        externalChunks.map((chunk: any) => fetchJsonOr(chunk.href, { routes: [] }))
      );
      payload = {
        routes: [
          ...inlineRoutes,
          ...externalPayloads.flatMap((p) => Array.isArray(p?.routes) ? p.routes : [])
        ]
      };
    }
    const additions = Array.isArray(payload?.routes) ? payload.routes : [];
    // Avoid duplicating if loadPopularRoutes runs twice via race.
    const have = new Set(state.allRoutes.map((r: any) => r.id || `${r.adventureId}:${r.name}`));
    for (const route of additions) {
      const key = route.id || `${route.adventureId}:${route.name}`;
      if (!have.has(key)) state.allRoutes.push(route);
    }
    return payload;
  })();
  return state.popularRoutesPromise;
}

export function shouldLoadPopularRoutes() {
  return state.mapFilters.layers.routes && state.mapFilters.routeSet !== 'mine';
}

export function schedulePopularRoutes(force = false) {
  if (!shouldLoadPopularRoutes()) return;
  if (state.popularRoutesPromise) return;
  const run = () => {
    loadPopularRoutes()
      .then(() => routeRerender())
      .catch((error) => console.error('Error loading popular routes', error));
  };
  if (force) { run(); return; }
  if (!state.worldMap) return;
  const onFirstInteraction = () => {
    state.worldMap.off('movestart', onFirstInteraction);
    state.worldMap.off('zoomstart', onFirstInteraction);
    state.worldMap.off('mousedown', onFirstInteraction);
    state.worldMap.off('touchstart', onFirstInteraction);
    run();
  };
  state.worldMap.on('movestart', onFirstInteraction);
  state.worldMap.on('zoomstart', onFirstInteraction);
  state.worldMap.on('mousedown', onFirstInteraction);
  state.worldMap.on('touchstart', onFirstInteraction);
}

export async function loadPhotos() {
  const data: any = await fetchJsonOr(PHOTOS_DATA_URL, { photos: [] });
  state.allPhotos = Array.isArray(data?.photos) ? data.photos : [];
}

export async function loadMapDatasets() {
  if (state.mapDataPromise) return state.mapDataPromise;
  // Eager set: places, primary routes, photos. Countries (~248KB) and
  // popular routes (~2MB) are gated — see renderCountryLayer +
  // schedulePopularRoutes.
  state.mapDataPromise = Promise.all([
    loadPlacesOfInterest(),
    loadRoutes(),
    loadPhotos()
  ]);
  return state.mapDataPromise;
}
