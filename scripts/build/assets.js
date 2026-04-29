const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { escapeRegExp } = require('./html-utils');

function walkFiles(dir, predicate, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, predicate, files);
      continue;
    }
    if (entry.isFile() && predicate(fullPath)) files.push(fullPath);
  }
  return files;
}

function hashedName(file, content) {
  const parsed = path.parse(file);
  const hash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 10);
  return `${parsed.name}.${hash}${parsed.ext}`;
}

function buildAssetManifest({
  root,
  distDir,
  cssBundleFiles,
  copyFile,
  copyDirectory,
  writeGenerated
}) {
  const manifest = {};
  const candidates = [
    ...cssBundleFiles,
    ...walkFiles(path.join(root, 'js'), (file) => file.endsWith('.js'))
      .map((file) => path.relative(root, file)),
    path.join('vendor', 'dompurify', 'purify.min.js'),
    path.join('vendor', 'leaflet', 'leaflet.css'),
    path.join('vendor', 'leaflet', 'leaflet.js')
  ];

  for (const file of candidates) {
    const source = path.join(root, file);
    if (!fs.existsSync(source)) continue;
    const content = fs.readFileSync(source);
    const target = path.join('assets', path.dirname(file), hashedName(file, content));
    manifest[file] = target.replace(/\\/g, '/');
    copyFile(file, path.join(distDir, target));
  }

  copyDirectory(
    path.join(root, 'vendor', 'leaflet', 'images'),
    path.join(distDir, 'assets', 'vendor', 'leaflet', 'images')
  );

  writeGenerated(path.join(distDir, 'asset-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

function rewriteAssetReferences(html, manifest) {
  let next = html;
  for (const [source, target] of Object.entries(manifest)) {
    const escaped = escapeRegExp(source);
    next = next.replace(new RegExp(`(["'])${escaped}(?:\\?v=\\d+)?\\1`, 'g'), `$1${target}$1`);
  }
  return next;
}

module.exports = {
  buildAssetManifest,
  hashedName,
  rewriteAssetReferences
};
