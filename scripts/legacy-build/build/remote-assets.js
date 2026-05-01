const fs = require('fs');
const path = require('path');

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

function textDistFiles(distDir) {
  const textExtensions = new Set(['.html', '.css', '.js', '.json', '.xml', '.txt']);
  return walkFiles(distDir).filter((file) => textExtensions.has(path.extname(file).toLowerCase()));
}

function referencedRemoteAssetPaths(distDir) {
  const refs = new Set();
  const pattern = /images\/generated\/remote\/[A-Za-z0-9._/-]+\.(?:jpg|jpeg|png|webp|avif)/gi;
  for (const file of textDistFiles(distDir)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(pattern)) refs.add(match[0].replace(/\\/g, '/'));
  }
  return refs;
}

function syncReferencedRemoteAssets({ root, distDir, verify, copyFile }) {
  const refs = referencedRemoteAssetPaths(distDir);
  const targetDir = path.join(distDir, 'images', 'generated', 'remote');
  for (const relative of refs) {
    const source = path.join(root, relative);
    if (!fs.existsSync(source)) {
      console.error(`${relative} is referenced but missing. Run npm run assets:optimize.`);
      process.exitCode = 1;
      continue;
    }
    copyFile(source, path.join(distDir, relative));
  }

  const deployed = walkFiles(targetDir);
  for (const file of deployed) {
    const relative = path.relative(distDir, file).replace(/\\/g, '/');
    if (refs.has(relative)) continue;
    if (verify) {
      console.error(`${relative} is not referenced by dist output. Run npm run build.`);
      process.exitCode = 1;
    } else {
      fs.rmSync(file, { force: true });
    }
  }
}

module.exports = {
  referencedRemoteAssetPaths,
  syncReferencedRemoteAssets,
  textDistFiles,
  walkFiles
};
