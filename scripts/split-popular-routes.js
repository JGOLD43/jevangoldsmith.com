#!/usr/bin/env node
/**
 * Split the large popular-routes dataset into cacheable route-type chunks.
 *
 * The map still hydrates all route data in parallel, but browsers no longer
 * need to receive one ~2MB JSON response before route rendering can start.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const SOURCE = path.join(DATA_DIR, 'sources', 'popular-routes.json');
const OUT_DIR = path.join(DATA_DIR, 'popular-routes');
const INDEX = path.join(DATA_DIR, 'popular-routes.index.json');

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
fs.mkdirSync(OUT_DIR, { recursive: true });

const groups = new Map();
for (const route of routes) {
  const key = slug(route.type);
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(route);
}

const chunks = [];
for (const [type, group] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  const filename = `${type}.json`;
  const file = path.join(OUT_DIR, filename);
  const payload = {
    generatedAt: data.generatedAt || null,
    routeType: type,
    routes: group
  };
  fs.writeFileSync(file, `${JSON.stringify(payload)}\n`);
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

const totalBytes = chunks.reduce((sum, chunk) => sum + chunk.bytes, 0) + byteSize(INDEX);
console.log(`[routes:split] ${routes.length} route(s), ${chunks.length} chunk(s), ${(totalBytes / 1024).toFixed(1)}KB total`);
