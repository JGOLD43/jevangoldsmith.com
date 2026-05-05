#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const dist = process.argv.find((arg) => arg.startsWith('--dist='))?.slice(7) || path.join(ROOT, 'dist');
const generated = process.argv.find((arg) => arg.startsWith('--generated='))?.slice(12) || path.join(ROOT, 'images', 'generated');

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

function rel(file, base) {
  return path.relative(base, file).split(path.sep).join('/');
}

const generatedFiles = walk(generated).filter((file) => /\.(avif|webp|jpe?g|png)$/i.test(file));
const byExt = new Map();
let total = 0;
for (const file of generatedFiles) {
  const stat = fs.statSync(file);
  total += stat.size;
  const ext = path.extname(file).slice(1).toLowerCase();
  const current = byExt.get(ext) || { count: 0, bytes: 0 };
  current.count += 1;
  current.bytes += stat.size;
  byExt.set(ext, current);
}

const referenced = new Set();
for (const htmlFile of walk(dist).filter((file) => file.endsWith('.html'))) {
  const html = fs.readFileSync(htmlFile, 'utf8');
  for (const match of html.matchAll(/(?:src|srcset|poster|content)=["']([^"']+)["']/gi)) {
    const value = match[1];
    for (const asset of value.split(',').map((part) => part.trim().split(/\s+/)[0])) {
      const normalized = asset
        .replace(/^https?:\/\/[^/]+\//, '')
        .replace(/^\/+/, '');
      if (normalized.startsWith('images/generated/')) referenced.add(normalized.replace('images/generated/', ''));
    }
  }
}

const unreferenced = generatedFiles
  .map((file) => ({ file, rel: rel(file, generated), size: fs.statSync(file).size }))
  .filter((item) => !referenced.has(item.rel))
  .sort((a, b) => b.size - a.size);

const largest = generatedFiles
  .map((file) => ({ rel: rel(file, generated), size: fs.statSync(file).size }))
  .sort((a, b) => b.size - a.size)
  .slice(0, 25);

console.log(`[asset-inventory] generated=${bytes(total)} files=${generatedFiles.length}`);
for (const [ext, data] of [...byExt.entries()].sort()) {
  console.log(`  .${ext.padEnd(5)} ${String(data.count).padStart(5)} ${bytes(data.bytes)}`);
}
console.log(`[asset-inventory] referenced=${referenced.size} unreferenced=${unreferenced.length}`);
console.log('[asset-inventory] largest generated files:');
for (const item of largest) console.log(`  ${bytes(item.size).padStart(8)} ${item.rel}`);
if (unreferenced.length) {
  console.log('[asset-inventory] largest unreferenced generated files:');
  for (const item of unreferenced.slice(0, 25)) console.log(`  ${bytes(item.size).padStart(8)} ${item.rel}`);
}
