#!/usr/bin/env node
// Read data/sources/countries.geo.json, filter to ONLY visited countries
// (data/countries-visited.json), round every coordinate to 4
// decimals (~11m precision), write to data/countries.slim.generated.json.
//
// Why filter: the runtime country layer filters to visitedIso anyway,
// so the rest of the world's geometry is dead weight on the wire (~210KB
// of un-rendered polygons). Shipping only what we render cuts the
// payload by ~95%.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'data/sources/countries.geo.json');
const VISITED = path.join(ROOT, 'data/countries-visited.json');
const OUT = path.join(ROOT, 'data/countries.slim.generated.json');

const round = (n) => Math.round(n * 10000) / 10000;
function trim(coord) {
  if (typeof coord[0] === 'number') return [round(coord[0]), round(coord[1])];
  return coord.map(trim);
}

const src = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const visitedRaw = fs.existsSync(VISITED) ? JSON.parse(fs.readFileSync(VISITED, 'utf8')) : { iso: [] };
const visited = new Set((Array.isArray(visitedRaw) ? visitedRaw : visitedRaw.iso) || []);

const features = [];
for (const f of src.features) {
  const p = f.properties || {};
  const iso = p.ADM0_A3 || p.ADM0_A3_US || p.SOV_A3 || f.id || p.iso;
  if (!visited.has(iso)) continue;
  features.push({
    type: 'Feature',
    properties: { iso, name: p.NAME || p.ADMIN || p.SOVEREIGNT || p.name },
    geometry: { type: f.geometry.type, coordinates: trim(f.geometry.coordinates) }
  });
}

const out = JSON.stringify({ type: 'FeatureCollection', features });
const before = fs.existsSync(OUT) ? fs.statSync(OUT).size : 0;
fs.writeFileSync(OUT, out);
console.log(`[slim-countries] ${features.length}/${src.features.length} features kept; ${(before/1024).toFixed(1)}KB → ${(out.length/1024).toFixed(1)}KB`);
