const fs = require('fs');
const path = require('path');
const { root, walk, readText, distRoot, createReporter } = require('./check/harness');

const reporter = createReporter('check-assets');
const distDir = distRoot();
const requiredProtectedAssets = [
  'images/logo-animated.mp4',
  'images/source/logo-animated.mp4',
  'vendor/dompurify/purify.min.js'
];

const textExtensions = new Set(['.html', '.css', '.js', '.json', '.xml', '.txt']);

function textFiles(dir) {
  return walk(dir, { predicate: (file) => textExtensions.has(path.extname(file).toLowerCase()) });
}

function referencedRemoteAssets() {
  const refs = new Set();
  const pattern = /images\/generated\/remote\/[A-Za-z0-9._/-]+\.(?:jpg|jpeg|png|webp|avif)/gi;
  for (const file of textFiles(distDir)) {
    for (const match of readText(file).matchAll(pattern)) refs.add(match[0].replace(/\\/g, '/'));
  }
  return refs;
}

for (const asset of requiredProtectedAssets) {
  if (!fs.existsSync(path.join(root, asset))) reporter.fail(`${asset} is missing.`);
}

if (!fs.existsSync(distDir)) {
  reporter.fail('dist/ is missing. Run npm run build.');
} else {
  if (fs.existsSync(path.join(distDir, 'images', 'source'))) reporter.fail('dist/images/source must not be deployed.');
  if (fs.existsSync(path.join(distDir, 'images', 'products'))) {
    reporter.fail('dist/images/products must not be deployed. Use images/generated/products instead.');
  }
  if (!fs.existsSync(path.join(distDir, 'data', 'runtime-data-manifest.json'))) {
    reporter.fail('dist/data/runtime-data-manifest.json is missing.');
  }

  const forbiddenRuntimeHosts = ['cdn.jsdelivr.net/npm/dompurify', 'flagcdn.com'];
  const publicTextFiles = textFiles(distDir).filter((file) => !file.includes(`${path.sep}admin${path.sep}`));
  for (const file of publicTextFiles) {
    const text = readText(file);
    for (const host of forbiddenRuntimeHosts) {
      if (text.includes(host)) reporter.fail(`${path.relative(root, file)} still references ${host}.`);
    }
  }

  const refs = referencedRemoteAssets();
  const deployedRemoteAssets = walk(path.join(distDir, 'images', 'generated', 'remote'));
  for (const file of deployedRemoteAssets) {
    const relative = path.relative(distDir, file).replace(/\\/g, '/');
    if (!refs.has(relative)) reporter.fail(`${relative} is deployed but not referenced.`);
  }
}

reporter.ok('Asset policy OK (protected media present, no unused deployed remote variants).');
