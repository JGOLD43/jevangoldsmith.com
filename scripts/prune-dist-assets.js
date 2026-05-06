#!/usr/bin/env node
/**
 * Remove source/original media from the deploy output after Astro copies the
 * broad public asset symlinks. Runtime HTML is normalized to generated assets
 * before this runs, so production should only ship web-ready variants.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DIST = process.argv.find((a) => a.startsWith('--dist='))?.slice(7) || path.join(ROOT, 'dist');

if (!fs.existsSync(DIST)) {
  console.error(`[prune-dist] missing dir: ${DIST}`);
  process.exit(2);
}

const targets = [
  'images/source',
  'images/people',
  'images/products',
  'images/logo.png',
    'images/logo-animated.mp4',
    'images/profile.jpg',
    'images/zen-nature.jpg',
    'images/.DS_Store',
    'data/sources',
    'data/remote-assets.generated.json',
    // After purge-css runs, every page links chrome.HASH.css + inlines its
    // per-page slice. The original 187KB legacy-style.css is unreferenced.
    'css/legacy-style.css',
    // Build-time-only data files. Imported by lib/chrome.ts, lib/seo.ts,
    // collection-sections.ts at build; never fetched at runtime. The
    // canonical externally-advertised copies live under /api/v1/.
    'data/pages.json',
    'data/topics.json',
    'data/ctas.json',
    // Source-of-truth before merge-people.js. Runtime reads
    // people.merged.generated.json (or the SSR'd inline copy).
    'data/people.profiles.json',
    'data/people.json',
    // Inlined into HTML at SSR time (jg-books-data, people-merged-data
    // <script type=application/json> blocks). The runtime fallback
    // fetch was deleted; these files are no longer requested.
    'data/people.merged.generated.json',
    'data/books.generated.json'
];

let removed = 0;
let bytes = 0;

function sizeOf(target) {
  if (!fs.existsSync(target)) return 0;
  const stat = fs.statSync(target);
  if (stat.isFile()) return stat.size;
  let total = 0;
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    total += sizeOf(path.join(target, entry.name));
  }
  return total;
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

for (const rel of targets) {
  const full = path.join(DIST, rel);
  if (!fs.existsSync(full)) continue;
  bytes += sizeOf(full);
  fs.rmSync(full, { recursive: true, force: true });
  removed++;
}

const generatedDir = path.join(DIST, 'images', 'generated');
if (fs.existsSync(generatedDir)) {
  for (const file of walk(generatedDir)) {
    if (!file.endsWith('.webp')) continue;
    const rel = path.relative(generatedDir, file).split(path.sep).join('/');
    if (rel.startsWith('logo/')) continue;
    bytes += sizeOf(file);
    fs.rmSync(file, { force: true });
    removed++;
  }
}

console.log(`[prune-dist] removed ${removed} production-excluded asset path(s), ${(bytes / 1024 / 1024).toFixed(1)}MB`);
