#!/usr/bin/env node
// Keep site-astro/public/images/now-map.jpg in sync with the /now pin
// location. The thumb is served LOCALLY (fast, no third-party round-trip),
// but a static file won't follow the coords — so this step re-downloads the
// correct satellite tile whenever NOW_LAT/NOW_LNG/NOW_MAP_ZOOM change.
//
// Source of truth: data/now.json (location.lat/lng/zoom). Runs in build.js +
// the dev script, before Astro reads the image.
//
// Caching: a sidecar now-map.jpg.meta records the tile URL the current image
// came from. If the computed URL matches and the image exists, we skip the
// network entirely. On a failed download we keep the existing image (stale
// beats broken); we only hard-fail if there's no image at all.

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'data', 'now.json');
const OUT = path.join(ROOT, 'site-astro', 'public', 'images', 'now-map.jpg');
const META = `${OUT}.meta`;

function tileCoords(lat, lng, zoom) {
  const xFrac = ((lng + 180) / 360) * 2 ** zoom;
  const yFrac =
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
    2 ** zoom;
  return { tileX: Math.floor(xFrac), tileY: Math.floor(yFrac) };
}

async function main() {
  const now = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  const { lat, lng, zoom } = now.location;
  const { tileX, tileY } = tileCoords(lat, lng, zoom);
  const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${tileY}/${tileX}`;

  const prevMeta = fs.existsSync(META) ? fs.readFileSync(META, 'utf8').trim() : '';
  if (prevMeta === url && fs.existsSync(OUT)) {
    console.log('[now-map] up to date — tile unchanged, skipping download');
    return;
  }

  console.log(`[now-map] location changed → fetching tile ${zoom}/${tileY}/${tileX}`);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) throw new Error(`suspiciously small tile (${buf.length} bytes)`);
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, buf);
    fs.writeFileSync(META, url);
    console.log(`[now-map] wrote ${OUT} (${buf.length} bytes)`);
  } catch (err) {
    if (fs.existsSync(OUT)) {
      console.warn(`[now-map] download failed (${err.message}); keeping existing image`);
      return;
    }
    console.error(`[now-map] download failed and no local image exists: ${err.message}`);
    process.exit(1);
  }
}

main();
