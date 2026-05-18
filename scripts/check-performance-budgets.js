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
const { distDir } = require('./_lib/paths');
const { walk } = require('./_lib/walk');

const DIST = distDir();

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

// Phase 5 (slice 12): adventures + its map runtime are Vite-emitted as
// a single chunk. (Previously the map module was split via dynamic
// import; the static import in adventures.ts inlines it for one less
// network round-trip on the only page that uses it.)
const adventuresChunk = findOne('_astro', /^_astro\/adventures\.astro_astro_type_script[^/]+\.js$/);

if (!adventuresChunk) fail('Missing Vite-emitted adventures page-script chunk under dist/_astro/');
else assertMax(adventuresChunk, 120 * KB);

const chromeCss = findOne('css', /^css\/chrome\.[a-f0-9]+\.css$/);
if (!chromeCss) fail('Missing hashed chrome CSS');
// Bumped from 45KB → 60KB through the May 2026 dark-mode/mobile passes
// (people detail, projects/challenges cards, movie stats, shelf zoom,
// /now → trips map, sidebar fixes, map-controls + leaflet zoom dark
// mode) and the purge-safelist for runtime classes (map-controls-*,
// now-marker-*, leaflet-popup-*) which kept JS-injected styling alive
// on production. Real-world chrome.css is ~55.6KB; leaving ~4KB headroom.
else assertMax(chromeCss, 75 * KB);
// Index now carries inline payload for tiny chunks (paddle, sail, ski,
// hike — each well under 5KB). Budget allows for that plus headroom.
assertMax('data/popular-routes.index.json', 12 * KB);

// slim-runtime-json strips searchText + id from search-index records.
// Budget at 90KB locks the win; without slim the file is ~170KB.
assertMax('api/v1/search-index.json', 90 * KB);

const routeChunks = walk(path.join(DIST, 'data/popular-routes')).filter((file) => file.endsWith('.json'));
if (routeChunks.length === 0) fail('Missing popular route chunks');

// Phase 6 runtime data budgets. These are the JSON files browser code
// fetches at runtime; growth here directly hits page load. Numbers chosen
// from current measured sizes + ~25% headroom so adding new content does
// not silently regress payload size. Build-time-only data files
// (quotes/projects/products/essays/podcasts/books.json source) are pruned
// from dist by prune-dist-assets.js, so they're not budgeted here.
const RUNTIME_JSON_BUDGETS = {
  // Filtered to ONLY visited countries by scripts/slim-countries.js;
  // unrendered geometry never shipped (was 244KB).
  'data/countries.slim.generated.json': 32 * KB,
  'data/remote-assets.generated.json': 240 * KB,
  'data/books.generated.json': 70 * KB,
  'data/placeofinterest.json': 60 * KB,
  'data/adventures.json': 25 * KB
};
for (const [rel, max] of Object.entries(RUNTIME_JSON_BUDGETS)) {
  if (exists(rel)) assertMax(rel, max);
}

// Theme-guard inline assertion. The first inline <script> in <head> sets
// data-theme synchronously before first paint to prevent a flash of light
// theme on dark-mode users. Externalizing it would defeat the FOUC fix.
{
  const indexHtml = path.join(DIST, 'index.html');
  if (fs.existsSync(indexHtml)) {
    const text = fs.readFileSync(indexHtml, 'utf8');
    const headBlock = text.split('</head>')[0] || '';
    if (!/document\.documentElement\.setAttribute\('data-theme'/.test(headBlock)) {
      fail('Theme guard no longer inline in <head> — risk of dark-mode flash');
    }
  }
}

for (const html of walk(DIST).filter((file) => file.endsWith('.html'))) {
  const text = fs.readFileSync(html, 'utf8');
  // Phase 2.1: a <link rel="preconnect"> hint to images.unsplash.com is
  // a DNS pre-resolution, not a runtime image fetch. Strip preconnect
  // tags before scanning so the budget catches real <img>/CSS refs.
  // Also strip dns-prefetch for the same reason.
  const stripped = text
    .replace(/<link[^>]+rel=["']preconnect["'][^>]*>/g, '')
    .replace(/<link[^>]+rel=["']dns-prefetch["'][^>]*>/g, '');
  if (stripped.includes('images.unsplash.com')) fail(`${path.relative(DIST, html)} references Unsplash at runtime`);
  // Guard previously enforced by scripts/normalize-astro-html.js. SSR
  // should be self-sufficient on legacy hard-coded image paths; remote
  // covers (OpenLibrary, Letterboxd) are intentionally allowed as
  // graceful-degradation fallbacks when an asset is missing from the
  // generated manifest.
  if (/\bimages\/(?:logo\.png|profile\.jpg|zen-nature\.jpg|logo-animated\.mp4)\b/.test(stripped)) {
    fail(`${path.relative(DIST, html)} references legacy non-generated image path`);
  }
  if (/<script[^>]*src=["'][^"']*\/js\/adventures-map\.js["']/.test(text)) fail(`${path.relative(DIST, html)} eagerly references adventures-map.js`);
}

if (failures.length) {
  console.error('[perf:budget] failed');
  for (const message of failures) console.error(`  - ${message}`);
  process.exit(1);
}

console.log(`[perf:budget] ok: dist ${(distBytes / MB).toFixed(1)}MB, ${routeChunks.length} route chunk(s)`);
