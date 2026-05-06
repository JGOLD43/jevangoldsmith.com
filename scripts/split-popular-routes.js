#!/usr/bin/env node
/**
 * Split the large popular-routes dataset into cacheable route-type chunks.
 *
 * Heavy chunks (drive, bike) ship as separate JSON files so the browser can
 * fetch them in parallel after first map open. Tiny chunks (paddle, sail,
 * ski, hike — each well under 5KB) get inlined into the index file so we
 * skip the per-chunk HTTP overhead.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const SOURCE = path.join(DATA_DIR, 'sources', 'popular-routes.json');
const OUT_DIR = path.join(DATA_DIR, 'popular-routes');
const INDEX = path.join(DATA_DIR, 'popular-routes.index.json');

// Chunks under this size ride along inside the index payload instead of
// living as their own file. 5KB threshold trades ~5KB of index growth for
// one fewer HTTP request per chunk; net win for small route types.
const INLINE_THRESHOLD = 5 * 1024;

function slug(value) {
  return String(value || 'track').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'track';
}

function byteSize(file) {
  return fs.statSync(file).size;
}

if (!fs.existsSync(SOURCE)) {
  console.log('[routes:split] no popular-routes.json, skipping');
  process.exit(0);
}

const data = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
const routes = Array.isArray(data.routes) ? data.routes : [];

// Round route coordinates to 5 decimal places (~1m precision). Source
// data carries 6 decimals (~10cm) which is wasted detail at every map
// zoom level we render. Trims drive.json and bike.json by ~30-40%.
const COORD_PRECISION = 1e5;
function roundCoord(n) {
  return Number.isFinite(n) ? Math.round(n * COORD_PRECISION) / COORD_PRECISION : n;
}
function trimGeometry(geom) {
  if (!geom || !Array.isArray(geom.coordinates)) return geom;
  // GeoJSON LineString: array of [lng, lat] pairs.
  return {
    ...geom,
    coordinates: geom.coordinates.map((pair) => Array.isArray(pair) ? pair.map(roundCoord) : pair)
  };
}
for (const route of routes) {
  if (route?.geometry) route.geometry = trimGeometry(route.geometry);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

// Wipe stale chunk files (e.g. previously emitted small types now inlined).
for (const file of fs.readdirSync(OUT_DIR)) {
  fs.rmSync(path.join(OUT_DIR, file));
}

const groups = new Map();
for (const route of routes) {
  const key = slug(route.type);
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(route);
}

const chunks = [];
let inlinedCount = 0;
for (const [type, group] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  const payload = {
    generatedAt: data.generatedAt || null,
    routeType: type,
    routes: group
  };
  const serialized = JSON.stringify(payload);
  if (serialized.length < INLINE_THRESHOLD) {
    chunks.push({
      type,
      inline: true,
      routes: group.length,
      bytes: serialized.length,
      payload
    });
    inlinedCount++;
    continue;
  }
  const filename = `${type}.json`;
  const file = path.join(OUT_DIR, filename);
  fs.writeFileSync(file, `${serialized}\n`);
  chunks.push({
    type,
    href: `data/popular-routes/${filename}`,
    routes: group.length,
    bytes: byteSize(file)
  });
}

const indexPayload = {
  generatedAt: data.generatedAt || null,
  source: 'popular-routes.json',
  totalRoutes: routes.length,
  chunks
};
fs.writeFileSync(INDEX, `${JSON.stringify(indexPayload)}\n`);

const fileBytes = chunks.filter((c) => !c.inline).reduce((sum, c) => sum + c.bytes, 0);
const indexBytes = byteSize(INDEX);
console.log(`[routes:split] ${routes.length} route(s), ${chunks.length} chunk(s) (${inlinedCount} inlined), ${((fileBytes + indexBytes) / 1024).toFixed(1)}KB total`);
