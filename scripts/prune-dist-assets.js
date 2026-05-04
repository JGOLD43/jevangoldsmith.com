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
    'data/popular-routes.json'
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

console.log(`[prune-dist] removed ${removed} production-excluded asset path(s), ${(bytes / 1024 / 1024).toFixed(1)}MB`);
