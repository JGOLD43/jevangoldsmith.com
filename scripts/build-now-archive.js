#!/usr/bin/env node
// Automatic Now archive. Snapshots the WHOLE current Now update (date,
// location, map tile, and every text section) into data/now-history.json the
// moment data/now.json's `lastUpdated` changes — so no past update is ever
// lost. Powers the /now/archive page.
//
// Identity of an update = its `lastUpdated` string. On each run:
//   • history empty, or its newest entry has a different date  → NEW update:
//       copy the current map tile to a dated snapshot and PREPEND a full
//       entry. The previous update stays frozen in the list forever.
//   • newest entry has the SAME date → same update, just edited → refresh
//       that entry in place (location/sections/map) so same-day tweaks don't
//       spawn duplicates.
//
// Must run AFTER build-now-map.js (which regenerates now-map.jpg for the
// current coords) and BEFORE astro:build (archive.astro imports the history).

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const NOW = path.join(ROOT, 'data', 'now.json');
const HISTORY = path.join(ROOT, 'data', 'now-history.json');
const MAP_SRC = path.join(ROOT, 'site-astro', 'public', 'images', 'now-map.jpg');
const ARCHIVE_DIR = path.join(ROOT, 'site-astro', 'public', 'images', 'now-archive');

function slugify(dateStr) {
  const d = new Date(dateStr);
  if (!Number.isNaN(d.getTime())) {
    // Use the parsed calendar date (local components) so the slug matches the
    // human date — toISOString() would shift it by the timezone offset.
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return String(dateStr).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Stable map snapshot for this update. Copy the current tile so the archive
// keeps how the map LOOKED at the time, independent of future tiles.
function snapshotMap(slug) {
  if (!fs.existsSync(MAP_SRC)) return null;
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  const destName = `now-map-${slug}.jpg`;
  fs.copyFileSync(MAP_SRC, path.join(ARCHIVE_DIR, destName));
  return `/images/now-archive/${destName}`;
}

function main() {
  const now = JSON.parse(fs.readFileSync(NOW, 'utf8'));
  const history = fs.existsSync(HISTORY) ? JSON.parse(fs.readFileSync(HISTORY, 'utf8')) : [];

  const slug = slugify(now.lastUpdated);
  const entry = {
    id: slug,
    lastUpdated: now.lastUpdated,
    location: now.location,
    sections: now.sections,
    map: snapshotMap(slug),
  };

  const newest = history[0];
  if (newest && newest.lastUpdated === now.lastUpdated) {
    // Same update, edited — refresh in place (preserve original archivedAt).
    entry.archivedAt = newest.archivedAt;
    history[0] = entry;
    console.log(`[now-archive] refreshed current entry "${now.lastUpdated}" (${history.length} total)`);
  } else {
    // New update — freeze the previous one, prepend this.
    entry.archivedAt = new Date().toISOString();
    history.unshift(entry);
    console.log(`[now-archive] archived NEW update "${now.lastUpdated}" (${history.length} total)`);
  }

  fs.writeFileSync(HISTORY, `${JSON.stringify(history, null, 2)}\n`);
}

main();
