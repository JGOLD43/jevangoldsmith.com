#!/usr/bin/env node
/**
 * Post-build HTML normalizer for the Astro output.
 *
 * Wraps optimized <img> tags in <picture> with AVIF + WebP <source> siblings,
 * localizes remote unsplash/openlibrary references to local generated rasters,
 * strips static leaflet/font links, and rewrites the legacy hard-coded image
 * paths (images/profile.jpg, images/logo.png, images/zen-nature.jpg) to their
 * generated variants. Mirrors what the legacy build does in build-site.js
 * (steps 266-278 of buildPage), so the Astro output reaches parity without
 * each Astro page being rewritten by hand.
 *
 * Requires: data/remote-assets.generated.json (produced by snap:routes /
 * assets:optimize). Reuses scripts/legacy-build/build/html-normalize.js
 * directly so we don't fork the implementation.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

const DIST = process.argv.find((a) => a.startsWith('--dist='))?.slice(7)
  || path.join(ROOT, 'dist-astro');

if (!fs.existsSync(DIST)) {
  console.error(`[normalize] missing dir: ${DIST}`);
  process.exit(2);
}

const remoteAssetsPath = path.join(ROOT, 'data/remote-assets.generated.json');
const remoteAssets = fs.existsSync(remoteAssetsPath)
  ? JSON.parse(fs.readFileSync(remoteAssetsPath, 'utf8'))
  : {};

const SITE_ORIGIN = 'https://jevangoldsmith.com';

function escapeHtmlAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function absolutizeAsset(asset) {
  if (!asset) return `${SITE_ORIGIN}/images/logo.png`;
  if (/^https?:\/\//i.test(asset)) return asset;
  return `${SITE_ORIGIN}/${asset.replace(/^\//, '')}`;
}

const { createHtmlNormalizers } = require(
  path.join(ROOT, 'scripts/legacy-build/build/html-normalize.js')
);

const normalizers = createHtmlNormalizers({ remoteAssets, escapeHtmlAttr, absolutizeAsset });
const {
  optimizeLocalImageReferences,
  localizeRemainingRemoteAssetReferences,
  removeStaticLeafletTags,
  removeExternalFontLinks
} = normalizers;

function walkHtml(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkHtml(full));
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const files = walkHtml(DIST);

let changed = 0;
let totalDelta = 0;
const sample = [];

for (const file of files) {
  const before = fs.readFileSync(file, 'utf8');
  let after = before;

  // Adventures gets the static leaflet tags removed in the legacy build (the
  // map ships its own loader). Match: adventure-* detail pages too.
  const rel = path.relative(DIST, file);
  const isAdventure = rel === 'adventures.html' || /^adventure-/.test(rel);
  if (isAdventure) after = removeStaticLeafletTags(after);

  after = removeExternalFontLinks(after);
  after = optimizeLocalImageReferences(after);
  after = localizeRemainingRemoteAssetReferences(after);

  if (after !== before) {
    changed++;
    const delta = after.length - before.length;
    totalDelta += delta;
    if (sample.length < 5) sample.push({ rel, delta });
    fs.writeFileSync(file, after);
  }
}

console.log(`[normalize] processed ${files.length} files, mutated ${changed}, total delta ${totalDelta >= 0 ? '+' : ''}${totalDelta} bytes`);
for (const s of sample) console.log(`  ${s.rel} ${s.delta >= 0 ? '+' : ''}${s.delta}`);
