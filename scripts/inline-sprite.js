#!/usr/bin/env node
/**
 * Inline /sprite.svg as a hidden <svg> at the top of <body> on every
 * HTML page. Each page's <use href="/sprite.svg#icon-X"> resolves
 * locally — no separate /sprite.svg fetch — so cold first visit saves
 * 1 RTT on the icon set.
 *
 * Tradeoff: HTML grows by ~4-8KB per page (the full sprite). With gzip
 * the repeat sprite content compresses to ~1-2KB. Net win on first
 * visit; small repeat-visit cost. Service Worker absorbs the cost on
 * navigation 3+.
 *
 * Run after icons:sprite, before purge:css.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DIST = process.argv.find((a) => a.startsWith('--dist='))?.slice(7) || path.join(ROOT, 'dist');

const spritePath = path.join(DIST, 'sprite.svg');
if (!fs.existsSync(spritePath)) {
  console.error('[inline-sprite] missing dist/sprite.svg');
  process.exit(1);
}
const sprite = fs.readFileSync(spritePath, 'utf8').trim();

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

let mutated = 0;
for (const file of walk(DIST)) {
  let html = fs.readFileSync(file, 'utf8');
  // Already inlined? skip.
  if (html.includes('data-sprite-inlined')) continue;
  // Rewrite <use href="/sprite.svg#X"/> to <use href="#X"/> so the
  // <use> resolves against the inlined sprite instead of a network
  // fetch.
  if (!html.includes('/sprite.svg#')) continue;
  html = html.replace(/href="\/sprite\.svg#/g, 'href="#');
  // Inject sprite immediately after <body...>. The sprite already has
  // style="display:none" set by generate-icon-sprite.js so it adds zero
  // visual chrome.
  const tagged = sprite.replace('<svg ', '<svg data-sprite-inlined="true" ');
  html = html.replace(/<body([^>]*)>/, `<body$1>${tagged}`);
  fs.writeFileSync(file, html);
  mutated++;
}

console.log(`[inline-sprite] inlined sprite into ${mutated} page(s) (${(sprite.length / 1024).toFixed(1)}KB raw)`);
