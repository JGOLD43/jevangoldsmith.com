const fs = require('fs');
const path = require('path');
const booleanPointInPolygon = require('@turf/boolean-point-in-polygon').default;

function build({ root, writeGenerated, log }) {
  const adventures = readJson(path.join(root, 'data', 'adventures.json'), { adventures: [] });
  const photos = readJson(path.join(root, 'data', 'photos.generated.json'), { photos: [] });
  const countries = readJson(path.join(root, 'data', 'countries.geo.json'), null);

  if (!countries || !Array.isArray(countries.features)) {
    if (log) log('countries.geo.json missing or malformed; skipping countries-visited derivation');
    return;
  }

  const points = [];
  for (const a of adventures.adventures || []) {
    if (a.mapCenter && typeof a.mapCenter.lat === 'number' && typeof a.mapCenter.lng === 'number') {
      points.push({ lat: a.mapCenter.lat, lng: a.mapCenter.lng });
    }
  }
  for (const p of photos.photos || []) {
    if (typeof p.lat === 'number' && typeof p.lng === 'number') {
      points.push({ lat: p.lat, lng: p.lng });
    }
  }

  const visited = new Set();
  for (const point of points) {
    const turfPoint = { type: 'Feature', geometry: { type: 'Point', coordinates: [point.lng, point.lat] }, properties: {} };
    for (const feature of countries.features) {
      const iso = feature.properties && (feature.properties.ISO_A3 || feature.properties.ADM0_A3);
      if (!iso || iso === '-99') continue;
      if (visited.has(iso)) continue;
      try {
        if (booleanPointInPolygon(turfPoint, feature)) {
          visited.add(iso);
          break;
        }
      } catch (_err) {
        // ignore malformed geometry
      }
    }
  }

  const slim = {
    type: 'FeatureCollection',
    features: countries.features.map((f) => ({
      type: 'Feature',
      properties: {
        iso: (f.properties && (f.properties.ISO_A3 || f.properties.ADM0_A3)) || null,
        name: (f.properties && (f.properties.NAME || f.properties.NAME_LONG)) || null
      },
      geometry: f.geometry
    })).filter((f) => f.properties.iso && f.properties.iso !== '-99')
  };

  writeGenerated(path.join('data', 'countries.slim.generated.json'), JSON.stringify(slim));
  writeGenerated(
    path.join('data', 'countries-visited.generated.json'),
    JSON.stringify({ iso: [...visited].sort() }, null, 2)
  );

  if (log) log(`countries-visited: ${visited.size} countries from ${points.length} points`);
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (_err) { return fallback; }
}

module.exports = { build };
