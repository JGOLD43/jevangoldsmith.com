#!/usr/bin/env node
// Read data/sources/countries.geo.json, drop unused properties, round
// every coordinate to 4 decimals (~11m precision), write to
// data/countries.slim.generated.json.
//
// 4 decimals is well below the resolution of any zoom level the world map
// renders at (the smallest visible feature is ~50km on a typical screen),
// but cuts JSON size ~40-50%.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'data/sources/countries.geo.json');
const OUT = path.join(ROOT, 'data/countries.slim.generated.json');

const round = (n) => Math.round(n * 10000) / 10000;

function trim(coord) {
  if (typeof coord[0] === 'number') return [round(coord[0]), round(coord[1])];
  return coord.map(trim);
}

const src = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const features = src.features.map((f) => {
  const p = f.properties || {};
  return {
    type: 'Feature',
    properties: { iso: p.ADM0_A3 || p.ADM0_A3_US || p.SOV_A3 || f.id || p.iso, name: p.NAME || p.ADMIN || p.SOVEREIGNT || p.name },
    geometry: { type: f.geometry.type, coordinates: trim(f.geometry.coordinates) }
  };
});

const out = JSON.stringify({ type: 'FeatureCollection', features });
const before = fs.existsSync(OUT) ? fs.statSync(OUT).size : 0;
fs.writeFileSync(OUT, out);
const after = out.length;
console.log(`[slim-countries] ${(before/1024).toFixed(1)}KB → ${(after/1024).toFixed(1)}KB`);
