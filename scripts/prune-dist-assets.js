#!/usr/bin/env node
/**
 * Remove source/original media from the deploy output after Astro copies the
 * broad public asset symlinks. Runtime HTML is normalized to generated assets
 * before this runs, so production should only ship web-ready variants.
 */
const fs = require('node:fs');
const path = require('node:path');
const { distDir } = require('./_lib/paths');
const { walk } = require('./_lib/walk');

const DIST = distDir();

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
    // /api/v1/people-modal.json (slim) or, in fallback, the merged copy.
    'data/people.profiles.json',
    'data/people.json',
    // Build-time only — books.ts and people lazy-fetch their slim runtime
    // counterparts under /data/ and /api/v1/ respectively.
    'data/people.merged.generated.json',
    // Astro SSR-time imports only. Runtime never fetches these — the
    // canonical externally-advertised copies live under /api/v1/, and
    // every consumer is either a build-time `import` or one of the
    // explicit runtime fetches in adventures/books/movies/podcasts.
    // Saves ~70KB of redundant edge-cache payload that misled future
    // maintainers about which file is the source of truth.
    'data/books.json',
    'data/quotes.json',
    'data/projects.json',
    'data/products.json',
    'data/essays.json',
    'data/podcasts.json',
    'data/cool-shit.json',
    'data/challenges.json',
    'data/resources.json',
    'data/skills.json',
    'data/site.json',
    'data/site.config.json',
    'data/newsletter.json'
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
    bytes += sizeOf(file);
    fs.rmSync(file, { force: true });
    removed++;
  }
}

console.log(`[prune-dist] removed ${removed} production-excluded asset path(s), ${(bytes / 1024 / 1024).toFixed(1)}MB`);
