#!/usr/bin/env node
// Derive data/adventures.generated.json from data/adventures.json with every
// image URL localized to its generated local raster (from the remote-asset
// manifest). The adventures DETAIL view + map fetch this at runtime
// (adventures.ts → ADVENTURES_DATA_URL); previously it fetched the raw source
// with external Unsplash URLs, which load slowly/unreliably and are blocked by
// the production CSP (images.unsplash.com isn't in img-src). Serving local
// copies makes trip images load fast and every time.
//
// Mirrors remoteAssetFor() in adventures.astro. Runs in build.js (and the dev
// script) before the runtime needs it.

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'data', 'adventures.json');
const MANIFEST = path.join(ROOT, 'data', 'remote-assets.generated.json');
const OUT = path.join(ROOT, 'data', 'adventures.generated.json');

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));

function localize(url, preferredWidth, format = 'jpg') {
  if (!url || !/^https?:\/\//i.test(url)) return url;
  const entry = manifest[url.replace(/&amp;/g, '&')];
  if (!entry || !entry.formats) return url; // not optimized → leave as-is (img-src has an Unsplash fallback)
  const widths = (entry.widths ?? Object.keys(entry.formats).map(Number)).sort((a, b) => a - b);
  const width = widths.find((w) => w >= preferredWidth) ?? widths[widths.length - 1];
  const slot = entry.formats[String(width)];
  const local = slot?.[format] ?? slot?.jpg ?? slot?.avif;
  return local ? `/${String(local).replace(/^\//, '')}` : url;
}

const data = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const adventures = (data.adventures ?? []).map((a) => ({
  ...a,
  heroImage: localize(a.heroImage, 1200),
  gallery: Array.isArray(a.gallery)
    ? a.gallery.map((g) => ({
        ...g,
        src: localize(g.src, 1200),
        thumbnail: localize(g.thumbnail || g.src, 480)
      }))
    : a.gallery
}));

const out = { ...data, adventures };
fs.writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);

const localized = adventures.reduce(
  (n, a) => n + (/^\/images\//.test(a.heroImage) ? 1 : 0) + (a.gallery || []).filter((g) => /^\/images\//.test(g.src)).length,
  0
);
console.log(`[build-adventures-runtime] wrote ${OUT} (${adventures.length} trips, ${localized} images localized)`);
