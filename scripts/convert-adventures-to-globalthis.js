#!/usr/bin/env node
// One-shot codemod for Phase 5 slice 12: convert top-level `let X = Y;`
// state declarations in adventures*.js to `globalThis.X = Y;` so the
// state lives on the global object. Then convert bare reassignments
// `X = Y;` to `globalThis.X = Y;` so strict-mode ES modules don't
// ReferenceError on the LHS. Bare reads (X.foo, X[i]) still resolve
// via global property lookup so we leave them alone.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const TARGETS = [
  path.resolve(__dirname, '..', 'site-astro/src/scripts/adventures.js'),
  path.resolve(__dirname, '..', 'site-astro/src/scripts/adventures-map.js')
];

// State variables that live on globalThis after the conversion.
const STATE_NAMES = [
  'allAdventures', 'allPlaces', 'placeCategories', 'allRoutes', 'allPhotos',
  'countryGeo', 'visitedIso', 'placesVisible', 'placeMarkers', 'routeLayer',
  'photoLayer', 'countryLayer', 'basemapTileLayer', 'activeFilters',
  'mapFilters', 'lightboxImages', 'lightboxIndex', 'worldMap', 'adventureMaps',
  'adventureMarkers', 'leafletPromise', 'markerClusterPromise', 'mapDataPromise',
  'worldMapRequested', 'selectedAdventureId', 'currentAdventureView',
  'adventuresMapBundlePromise'
];

function transform(source) {
  let out = source;

  // 1. Top-level `let X = Y;` → `globalThis.X = Y;` (only at start of line, no
  //    indentation to avoid touching local lets inside functions).
  for (const name of STATE_NAMES) {
    const re = new RegExp(`^let\\s+${name}(\\s*=\\s*[^;]+)?;`, 'm');
    out = out.replace(re, (_match, init) => `globalThis.${name}${init || ' = undefined'};`);
  }

  // 2. Indented bare reassignments `    X = Y;` → `    globalThis.X = Y;`.
  //    Only target single-identifier LHS (no dot access, no bracket access).
  for (const name of STATE_NAMES) {
    const re = new RegExp(`^(\\s+)${name}(\\s*=\\s*)`, 'mg');
    out = out.replace(re, (_match, indent, op) => `${indent}globalThis.${name}${op}`);
  }

  return out;
}

let totalChanged = 0;
for (const file of TARGETS) {
  const before = fs.readFileSync(file, 'utf8');
  const after = transform(before);
  if (after !== before) {
    fs.writeFileSync(file, after);
    totalChanged += 1;
    process.stdout.write(`[convert] rewrote ${path.relative(path.resolve(__dirname, '..'), file)}\n`);
  }
}
process.stdout.write(`[convert] ${totalChanged} file(s) updated\n`);
