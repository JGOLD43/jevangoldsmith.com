#!/usr/bin/env node
// Snap popular-routes waypoints to OSM road/path network via public OSRM.
// Idempotent: routes already marked `_snapped: <profile>` are skipped.
// To force a re-snap: delete the `_snapped` field on that route.
//
// Foot profile is intentionally NOT supported — OSM trail data on remote
// alpine/wilderness routes is too sparse, OSRM detours via roads producing
// 2-6x bogus distances. Hike geometry stays as coarse waypoints.
//
// Runs as `prebuild` step. Fails gracefully on network errors so offline
// builds still work.

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'popular-routes.json');
const PROFILE_BY_TYPE = {
  drive: 'driving',
  bike: 'cycling'
};
const POLITE_DELAY_MS = 1100;
const REQUEST_TIMEOUT_MS = 20000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const serializeRoutes = (json) => `${JSON.stringify(json)}\n`;

async function snap(coords, profile) {
  const coordStr = coords.map(([lng, lat]) => `${lng},${lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/${profile}/${coordStr}?overview=full&geometries=geojson`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'jg-website-build/1.0' },
      signal: controller.signal
    });
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]?.geometry) throw new Error(`OSRM ${data.code}`);
    return {
      geometry: data.routes[0].geometry,
      distanceKm: Number((data.routes[0].distance / 1000).toFixed(1))
    };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  if (!fs.existsSync(FILE)) {
    console.log('snap-popular-routes: no popular-routes.json, skipping');
    return;
  }
  const json = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const todo = json.routes.filter((r) => {
    const profile = PROFILE_BY_TYPE[r.type];
    if (!profile) return false;
    if (r._snapped === profile) return false;
    if (!Array.isArray(r.geometry?.coordinates) || r.geometry.coordinates.length < 2) return false;
    return true;
  });

  if (todo.length === 0) {
    console.log('snap-popular-routes: all drive/bike routes already snapped');
    return;
  }

  console.log(`snap-popular-routes: ${todo.length} route(s) to snap`);
  let snapped = 0, failed = 0;

  for (const route of todo) {
    const profile = PROFILE_BY_TYPE[route.type];
    try {
      const result = await snap(route.geometry.coordinates, profile);
      route.geometry = result.geometry;
      route.distanceKm = result.distanceKm;
      route._snapped = profile;
      snapped++;
      console.log(`  ✓ ${route.id} (${profile}, ${result.distanceKm} km)`);
      fs.writeFileSync(FILE, serializeRoutes(json)); // checkpoint per success
    } catch (err) {
      failed++;
      console.warn(`  ✗ ${route.id}: ${err.message} — keeping waypoints`);
    }
    if (todo.indexOf(route) < todo.length - 1) await sleep(POLITE_DELAY_MS);
  }

  console.log(`snap-popular-routes: snapped=${snapped} failed=${failed}`);
}

main().catch((err) => {
  console.warn(`snap-popular-routes: ${err.message} — skipping (build continues)`);
  process.exit(0); // never fail the build
});
