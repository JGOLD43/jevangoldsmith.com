#!/usr/bin/env node
/**
 * Production build budget checks.
 *
 * This is intentionally simple and repo-specific: it protects the performance
 * work that matters for this static site instead of pretending to be a full
 * Lighthouse replacement.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DIST = process.argv.find((a) => a.startsWith('--dist='))?.slice(7) || path.join(ROOT, 'dist');

const KB = 1024;
const MB = 1024 * KB;
const failures = [];

function fail(message) {
  failures.push(message);
}

function exists(rel) {
  return fs.existsSync(path.join(DIST, rel));
}

function size(rel) {
  return fs.statSync(path.join(DIST, rel)).size;
}

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function findOne(dir, pattern) {
  return walk(path.join(DIST, dir)).map((file) => path.relative(DIST, file)).find((rel) => pattern.test(rel));
}

function assertMax(rel, maxBytes) {
  if (!exists(rel)) {
    fail(`Missing ${rel}`);
    return;
  }
  const actual = size(rel);
  if (actual > maxBytes) {
    fail(`${rel} is ${(actual / KB).toFixed(1)}KB, budget ${(maxBytes / KB).toFixed(1)}KB`);
  }
}

const distBytes = walk(DIST).reduce((sum, file) => sum + fs.statSync(file).size, 0);
if (distBytes > 130 * MB) fail(`dist is ${(distBytes / MB).toFixed(1)}MB, budget 130MB`);

for (const rel of [
  'images/source',
  'images/people',
  'images/products',
  'images/logo.png',
  'images/logo-animated.mp4',
  'images/profile.jpg',
  'images/zen-nature.jpg',
  'data/sources'
]) {
  if (exists(rel)) fail(`Production-only dist should not include ${rel}`);
}

// Phase 5 (slice 12): adventures + its map runtime are Vite-emitted chunks.
// The adventures page-script chunk is named after the .astro file; the
// dynamically-imported map module gets its own `adventures-map.HASH.js`.
const adventuresChunk = findOne('_astro', /^_astro\/adventures\.astro_astro_type_script[^/]+\.js$/);
const adventuresMapChunk = findOne('_astro', /^_astro\/adventures-map\.[A-Za-z0-9_-]+\.js$/);

if (!adventuresChunk) fail('Missing Vite-emitted adventures page-script chunk under dist/_astro/');
else assertMax(adventuresChunk, 80 * KB);

if (!adventuresMapChunk) fail('Missing Vite-emitted adventures-map chunk under dist/_astro/');
else assertMax(adventuresMapChunk, 40 * KB);

const chromeCss = findOne('css', /^css\/chrome\.[a-f0-9]+\.css$/);
if (!chromeCss) fail('Missing hashed chrome CSS');
else assertMax(chromeCss, 45 * KB);
assertMax('data/popular-routes.index.json', 4 * KB);

// slim-runtime-json strips searchText + id from search-index records.
// Budget at 90KB locks the win; without slim the file is ~170KB.
assertMax('api/v1/search-index.json', 90 * KB);

const routeChunks = walk(path.join(DIST, 'data/popular-routes')).filter((file) => file.endsWith('.json'));
if (routeChunks.length === 0) fail('Missing popular route chunks');

// Phase 6 runtime data budgets. These are the JSON files browser code
// fetches at runtime; growth here directly hits page load. Numbers chosen
// from current measured sizes + ~25% headroom so adding new content does
// not silently regress payload size.
const RUNTIME_JSON_BUDGETS = {
  'data/countries.slim.generated.json': 320 * KB,
  'data/remote-assets.generated.json': 240 * KB,
  'data/pages.json': 130 * KB,
  'data/books.generated.json': 70 * KB,
  'data/placeofinterest.json': 60 * KB,
  'data/books.json': 50 * KB,
  'data/people.profiles.json': 30 * KB,
  'data/adventures.json': 25 * KB,
  'data/projects.json': 20 * KB,
  'data/products.json': 20 * KB,
  'data/quotes.json': 12 * KB,
  'data/people.json': 10 * KB,
  'data/podcasts.json': 10 * KB
};
for (const [rel, max] of Object.entries(RUNTIME_JSON_BUDGETS)) {
  if (exists(rel)) assertMax(rel, max);
}

for (const html of walk(DIST).filter((file) => file.endsWith('.html'))) {
  const text = fs.readFileSync(html, 'utf8');
  // Phase 2.1: a <link rel="preconnect"> hint to images.unsplash.com is
  // a DNS pre-resolution, not a runtime image fetch. Strip preconnect
  // tags before scanning so the budget catches real <img>/CSS refs.
  const stripped = text.replace(/<link[^>]+rel=["']preconnect["'][^>]*>/g, '');
  if (stripped.includes('images.unsplash.com')) fail(`${path.relative(DIST, html)} references Unsplash at runtime`);
  if (/<script[^>]*src=["'][^"']*\/js\/adventures-map\.js["']/.test(text)) fail(`${path.relative(DIST, html)} eagerly references adventures-map.js`);
}

if (failures.length) {
  console.error('[perf:budget] failed');
  for (const message of failures) console.error(`  - ${message}`);
  process.exit(1);
}

console.log(`[perf:budget] ok: dist ${(distBytes / MB).toFixed(1)}MB, ${routeChunks.length} route chunk(s)`);
