#!/usr/bin/env node
/**
 * Post-build: rewrite every /sprite.svg#name reference in HTML to the
 * hashed sprite filename emitted by generate-icon-sprite.js. Lets us cache
 * the sprite immutable forever.
 */
const fs = require('node:fs');
const path = require('node:path');
const { walk } = require('./_lib/walk');

const ROOT = path.resolve(__dirname, '..');
const DIST = process.argv.find((a) => a.startsWith('--dist='))?.slice(7) || path.join(ROOT, 'dist');

const manifestPath = path.join(DIST, 'sprite-manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error('[pin-sprite] missing sprite-manifest.json');
  process.exit(1);
}
const { filename } = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

let touched = 0;
let refs = 0;
for (const file of walk(DIST)) {
  if (!file.endsWith('.html') && !file.endsWith('.svg')) continue;
  const text = fs.readFileSync(file, 'utf8');
  const next = text.replace(/\/sprite\.svg#/g, () => { refs++; return `/${filename}#`; });
  if (next !== text) { fs.writeFileSync(file, next); touched++; }
}
console.log(`[pin-sprite] rewrote ${refs} ref(s) across ${touched} file(s) → ${filename}`);
