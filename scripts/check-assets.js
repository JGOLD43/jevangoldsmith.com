const fs = require('fs');
const path = require('path');

const root = process.cwd();
const distDir = path.join(root, 'dist');
const requiredProtectedAssets = [
  'images/logo-animated.mp4',
  'images/source/logo-animated.mp4',
  'vendor/dompurify/purify.min.js'
];

let failed = false;

function fail(message) {
  console.error(message);
  failed = true;
}

function walkFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, files);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function textFiles(dir) {
  const textExtensions = new Set(['.html', '.css', '.js', '.json', '.xml', '.txt']);
  return walkFiles(dir).filter((file) => textExtensions.has(path.extname(file).toLowerCase()));
}

function referencedRemoteAssets() {
  const refs = new Set();
  const pattern = /images\/generated\/remote\/[A-Za-z0-9._/-]+\.(?:jpg|jpeg|png|webp|avif)/gi;
  for (const file of textFiles(distDir)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(pattern)) refs.add(match[0].replace(/\\/g, '/'));
  }
  return refs;
}

for (const asset of requiredProtectedAssets) {
  if (!fs.existsSync(path.join(root, asset))) fail(`${asset} is missing.`);
}

if (!fs.existsSync(distDir)) {
  fail('dist/ is missing. Run npm run build.');
} else {
  if (fs.existsSync(path.join(distDir, 'images', 'source'))) {
    fail('dist/images/source must not be deployed.');
  }

  const publicTextFiles = textFiles(distDir).filter((file) => !file.includes(`${path.sep}admin${path.sep}`));
  const forbiddenRuntimeHosts = [
    'cdn.jsdelivr.net/npm/dompurify',
    'flagcdn.com'
  ];

  for (const file of publicTextFiles) {
    const text = fs.readFileSync(file, 'utf8');
    for (const host of forbiddenRuntimeHosts) {
      if (text.includes(host)) {
        fail(`${path.relative(root, file)} still references ${host}.`);
      }
    }
  }

  const refs = referencedRemoteAssets();
  const deployedRemoteAssets = walkFiles(path.join(distDir, 'images', 'generated', 'remote'));
  for (const file of deployedRemoteAssets) {
    const relative = path.relative(distDir, file).replace(/\\/g, '/');
    if (!refs.has(relative)) fail(`${relative} is deployed but not referenced.`);
  }
}

if (failed) process.exit(1);
console.log('Asset policy OK (protected media present, no unused deployed remote variants).');
