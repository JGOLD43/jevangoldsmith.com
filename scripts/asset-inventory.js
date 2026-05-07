#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { ROOT, flagValue, distDir } = require('./_lib/paths');
const { walk } = require('./_lib/walk');

const dist = distDir();
const generated = flagValue('--generated=', path.join(ROOT, 'images', 'generated'));
const dryRunPrune = process.argv.includes('--prune-dry-run');
const writePruneList = flagValue('--write-prune-list=');

function bytes(n) {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)}MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${n}B`;
}

function rel(file, base) {
  return path.relative(base, file).split(path.sep).join('/');
}

const generatedFiles = walk(generated).filter((file) => /\.(avif|webp|jpe?g|png)$/i.test(file));
const byExt = new Map();
let total = 0;
const fileSize = new Map();
for (const file of generatedFiles) {
  const stat = fs.statSync(file);
  total += stat.size;
  fileSize.set(file, stat.size);
  const ext = path.extname(file).slice(1).toLowerCase();
  const current = byExt.get(ext) || { count: 0, bytes: 0 };
  current.count += 1;
  current.bytes += stat.size;
  byExt.set(ext, current);
}

// Reachability roots: any file that ships to runtime and may reference generated images.
// - Built HTML (rendered)
// - JSON data shipped to dist (fetched at runtime)
// - JS bundles in dist (may inline image URLs in code)
// - Source data JSON outside dist that drives the build (kept conservative)
const ROOT_DIRS = [dist, path.join(ROOT, 'data'), path.join(ROOT, 'site-astro', 'src')];
const ROOT_EXT = /\.(html|json|js|ts|astro|css|md|mdx)$/i;

const referenced = new Set();
const refPattern = /images\/generated\/([A-Za-z0-9._/-]+\.(?:avif|webp|jpe?g|png))/gi;

for (const dir of ROOT_DIRS) {
  for (const file of walk(dir)) {
    if (!ROOT_EXT.test(file)) continue;
    let text;
    try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
    for (const match of text.matchAll(refPattern)) {
      referenced.add(match[1]);
    }
    // Also handle HTML-only attribute values that strip the leading prefix
    // (already covered by refPattern above).
  }
}

const unreferenced = generatedFiles
  .map((file) => ({ file, rel: rel(file, generated), size: fileSize.get(file) || 0 }))
  .filter((item) => !referenced.has(item.rel))
  .sort((a, b) => b.size - a.size);

const largest = generatedFiles
  .map((file) => ({ rel: rel(file, generated), size: fileSize.get(file) || 0 }))
  .sort((a, b) => b.size - a.size)
  .slice(0, 25);

console.log(`[asset-inventory] generated=${bytes(total)} files=${generatedFiles.length}`);
for (const [ext, data] of [...byExt.entries()].sort()) {
  console.log(`  .${ext.padEnd(5)} ${String(data.count).padStart(5)} ${bytes(data.bytes)}`);
}
console.log(`[asset-inventory] referenced=${referenced.size} unreferenced=${unreferenced.length}`);

const unreferencedBytes = unreferenced.reduce((sum, item) => sum + item.size, 0);
console.log(`[asset-inventory] unreferenced bytes=${bytes(unreferencedBytes)}`);

console.log('[asset-inventory] largest generated files:');
for (const item of largest) console.log(`  ${bytes(item.size).padStart(8)} ${item.rel}`);

if (unreferenced.length) {
  console.log('[asset-inventory] largest unreferenced generated files:');
  for (const item of unreferenced.slice(0, 25)) console.log(`  ${bytes(item.size).padStart(8)} ${item.rel}`);
}

if (writePruneList) {
  const lines = unreferenced.map((item) => item.rel).join('\n');
  fs.writeFileSync(writePruneList, lines + (lines ? '\n' : ''));
  console.log(`[asset-inventory] wrote prune list: ${writePruneList} (${unreferenced.length} entries)`);
}

if (dryRunPrune) {
  console.log(`[asset-inventory] DRY RUN: would remove ${unreferenced.length} files (${bytes(unreferencedBytes)})`);
}
