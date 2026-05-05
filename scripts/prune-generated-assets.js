#!/usr/bin/env node
/**
 * Remove generated image variants under images/generated/ that are not
 * reachable from any runtime source: built HTML, shipped JSON data,
 * source Astro/TS/JS, or the remote-assets manifest.
 *
 * Reachability mirrors scripts/asset-inventory.js. Run that first (or with
 * --dry-run here) before destructive use.
 *
 * Usage:
 *   node scripts/prune-generated-assets.js --dry-run
 *   node scripts/prune-generated-assets.js
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const dist = process.argv.find((a) => a.startsWith('--dist='))?.slice(7) || path.join(ROOT, 'dist');
const generated = process.argv.find((a) => a.startsWith('--generated='))?.slice(12) || path.join(ROOT, 'images', 'generated');
const dryRun = process.argv.includes('--dry-run');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function bytes(n) {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)}MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${n}B`;
}

const ROOT_DIRS = [dist, path.join(ROOT, 'data'), path.join(ROOT, 'site-astro', 'src')];
const ROOT_EXT = /\.(html|json|js|ts|astro|css|md|mdx)$/i;
const refPattern = /images\/generated\/([A-Za-z0-9._/-]+\.(?:avif|webp|jpe?g|png))/gi;

const referenced = new Set();
for (const dir of ROOT_DIRS) {
  for (const file of walk(dir)) {
    if (!ROOT_EXT.test(file)) continue;
    let text;
    try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
    for (const match of text.matchAll(refPattern)) referenced.add(match[1]);
  }
}

const generatedFiles = walk(generated).filter((f) => /\.(avif|webp|jpe?g|png)$/i.test(f));
let removed = 0;
let removedBytes = 0;
for (const file of generatedFiles) {
  const rel = path.relative(generated, file).split(path.sep).join('/');
  if (referenced.has(rel)) continue;
  const size = fs.statSync(file).size;
  removedBytes += size;
  removed += 1;
  if (!dryRun) fs.rmSync(file, { force: true });
}

const verb = dryRun ? 'would remove' : 'removed';
console.log(`[prune-generated] ${verb} ${removed} files, ${bytes(removedBytes)}`);
