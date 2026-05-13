#!/usr/bin/env node
/**
 * Replace __CACHE_VERSION__ in dist/sw.js with the chrome.css hash.
 * Ties the SW cache namespace to the deploy hash so updates roll caches
 * forward atomically.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DIST = process.argv.find((a) => a.startsWith('--dist='))?.slice(7) || path.join(ROOT, 'dist');

const swPath = path.join(DIST, 'sw.js');
if (!fs.existsSync(swPath)) {
  console.error('[sw] missing dist/sw.js');
  process.exit(1);
}

const cssDir = path.join(DIST, 'css');
const chromeCssFile = fs.readdirSync(cssDir).find((f) => /^chrome\.[a-f0-9]+\.css$/.test(f));
const version = chromeCssFile ? chromeCssFile.replace(/^chrome\.([a-f0-9]+)\.css$/, '$1') : Date.now().toString(36);

const text = fs.readFileSync(swPath, 'utf8');
const next = text.replace('__CACHE_VERSION__', version);
fs.writeFileSync(swPath, next);
console.log(`[sw] cache version pinned to ${version}`);
