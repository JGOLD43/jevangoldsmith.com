const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function walkJsonFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkJsonFiles(fullPath, files);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.json')) files.push(fullPath);
  }
  return files;
}

function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);
}

function buildRuntimeDataManifest({ distDir, writeGenerated }) {
  const scopeDirs = [
    path.join(distDir, 'data'),
    path.join(distDir, 'api', 'v1')
  ];
  const files = scopeDirs.flatMap((dir) => walkJsonFiles(dir))
    .filter((file) => path.relative(distDir, file).replace(/\\/g, '/') !== 'data/runtime-data-manifest.json')
    .sort();
  const assets = {};
  for (const file of files) {
    const relative = path.relative(distDir, file).replace(/\\/g, '/');
    const content = fs.readFileSync(file);
    assets[relative] = hashContent(content);
  }

  writeGenerated(path.join(distDir, 'data', 'runtime-data-manifest.json'), `${JSON.stringify({
    version: '1.0',
    assets
  }, null, 2)}\n`);
}

module.exports = {
  buildRuntimeDataManifest
};
