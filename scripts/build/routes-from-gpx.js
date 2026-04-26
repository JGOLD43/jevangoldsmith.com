const fs = require('fs');
const path = require('path');
const { DOMParser } = require('@xmldom/xmldom');
const togeojson = require('@tmcw/togeojson');
const simplify = require('@turf/simplify').default;
const length = require('@turf/length').default;

const TYPE_PREFIXES = ['hike', 'drive', 'bike', 'flight', 'sail', 'run', 'walk', 'paddle', 'ski'];

function inferType(filename) {
  const lower = filename.toLowerCase();
  for (const t of TYPE_PREFIXES) {
    if (lower.startsWith(`${t}-`) || lower.startsWith(`${t}.`) || lower.includes(`-${t}-`)) return t;
  }
  return 'track';
}

function build({ root, writeGenerated, log }) {
  const tracksRoot = path.join(root, '_src', 'tracks');
  const routes = [];

  if (!fs.existsSync(tracksRoot)) {
    writeGenerated(path.join('data', 'routes.generated.json'), JSON.stringify({ routes }, null, 2));
    if (log) log('routes-from-gpx: no _src/tracks/ directory; wrote empty routes file');
    return;
  }

  const adventureDirs = fs.readdirSync(tracksRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const adventureId of adventureDirs) {
    const dir = path.join(tracksRoot, adventureId);
    const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.gpx'));
    for (const filename of files) {
      const fullPath = path.join(dir, filename);
      try {
        const xml = fs.readFileSync(fullPath, 'utf8');
        const dom = new DOMParser({
          errorHandler: { warning: () => {}, error: () => {}, fatalError: () => {} }
        }).parseFromString(xml, 'application/xml');
        const geojson = togeojson.gpx(dom);
        const lineFeatures = (geojson.features || []).filter(
          (f) => f.geometry && (f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString')
        );
        for (let i = 0; i < lineFeatures.length; i++) {
          const feature = lineFeatures[i];
          let simplified;
          try {
            simplified = simplify(feature, { tolerance: 0.0001, highQuality: false, mutate: false });
          } catch (_err) {
            simplified = feature;
          }
          let distanceKm = 0;
          try { distanceKm = Number(length(simplified, { units: 'kilometers' }).toFixed(2)); }
          catch (_err) { distanceKm = 0; }
          const baseName = filename.replace(/\.gpx$/i, '');
          routes.push({
            id: `${adventureId}-${baseName}${lineFeatures.length > 1 ? `-${i}` : ''}`,
            adventureId,
            name: feature.properties?.name || baseName,
            type: inferType(filename),
            distanceKm,
            geometry: simplified.geometry
          });
        }
      } catch (err) {
        if (log) log(`routes-from-gpx: failed to parse ${filename}: ${err.message}`);
      }
    }
  }

  writeGenerated(path.join('data', 'routes.generated.json'), JSON.stringify({ routes }, null, 2));
  if (log) log(`routes-from-gpx: ${routes.length} routes from ${adventureDirs.length} adventures`);
}

module.exports = { build };
