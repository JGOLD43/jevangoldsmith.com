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

// mtime gate: if every output file is newer than the source, the split
// outputs are still in sync with the input. Skip the work entirely
// (~200ms saved on every incremental rebuild).
function isStale() {
  if (!fs.existsSync(INDEX)) return true;
  const sourceMtime = fs.statSync(SOURCE).mtimeMs;
  if (fs.statSync(INDEX).mtimeMs < sourceMtime) return true;
  if (!fs.existsSync(OUT_DIR)) return true;
  for (const entry of fs.readdirSync(OUT_DIR)) {
    if (!entry.endsWith('.json')) continue;
    if (fs.statSync(path.join(OUT_DIR, entry)).mtimeMs < sourceMtime) return true;
  }
  return false;
}
if (!isStale()) {
  console.log('[routes:split] outputs are up to date, skipping');
  process.exit(0);
}

const data = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
const routes = Array.isArray(data.routes) ? data.routes : [];

// Round to 5 decimal places (~1m precision) and decimate via
// Douglas-Peucker. Drive/bike routes have hundreds of densely-packed
// waypoints from OSRM snapping; at the zoom levels the world map renders,
// 0.0005° tolerance (~50m) is visually identical to the source.
const COORD_PRECISION = 1e5;
const DOUGLAS_PEUCKER_TOLERANCE = 0.0005;

function roundCoord(n) {
  return Number.isFinite(n) ? Math.round(n * COORD_PRECISION) / COORD_PRECISION : n;
}

// Perpendicular distance from point p to the line through a..b.
function perpDistance(p, a, b) {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) {
    const ex = px - ax;
    const ey = py - ay;
    return Math.sqrt(ex * ex + ey * ey);
  }
  const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  const ex = px - cx;
  const ey = py - cy;
  return Math.sqrt(ex * ex + ey * ey);
}

function douglasPeucker(points, tolerance) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop();
    let maxDist = 0;
    let idx = -1;
    for (let i = start + 1; i < end; i++) {
      const d = perpDistance(points[i], points[start], points[end]);
      if (d > maxDist) { maxDist = d; idx = i; }
    }
    if (idx !== -1 && maxDist > tolerance) {
      keep[idx] = 1;
      stack.push([start, idx], [idx, end]);
    }
  }
  const out = [];
  for (let i = 0; i < points.length; i++) {
    if (keep[i]) out.push(points[i]);
  }
  return out;
}

function trimGeometry(geom) {
  if (!geom || !Array.isArray(geom.coordinates)) return geom;
  // GeoJSON LineString: array of [lng, lat] pairs.
  const rounded = geom.coordinates.map((pair) => Array.isArray(pair) ? pair.map(roundCoord) : pair);
  const decimated = douglasPeucker(rounded, DOUGLAS_PEUCKER_TOLERANCE);
  return { ...geom, coordinates: decimated };
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
