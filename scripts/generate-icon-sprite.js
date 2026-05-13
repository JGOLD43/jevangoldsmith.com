#!/usr/bin/env node
/**
 * Generate dist/sprite.HASH.svg from site-astro/src/lib/icons.ts and
 * write dist/sprite-manifest.json mapping name→file. The post-build
 * `pin-sprite` pass rewrites every /sprite.svg#name reference in HTML
 * to the hashed filename so the file can be cached immutable forever.
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DIST = process.argv.find((a) => a.startsWith('--dist='))?.slice(7) || path.join(ROOT, 'dist');
const ICONS_TS = path.join(ROOT, 'site-astro/src/lib/icons.ts');

const source = fs.readFileSync(ICONS_TS, 'utf8');

const symbols = [];
const lineRe = /^\s*([a-zA-Z_]\w*):\s*'(<svg[\s\S]*?<\/svg>)',?\s*$/gm;
let match;
while ((match = lineRe.exec(source)) !== null) {
  const name = match[1];
  const svg = match[2];
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 24 24';
  const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  symbols.push(`<symbol id="icon-${name}" viewBox="${viewBox}">${inner}</symbol>`);
}

if (symbols.length === 0) {
  console.error('[sprite] no icons parsed from', ICONS_TS);
  process.exit(1);
}

const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">${symbols.join('')}</svg>\n`;
const hash = crypto.createHash('sha256').update(sprite).digest('hex').slice(0, 8);
const filename = `sprite.${hash}.svg`;
fs.writeFileSync(path.join(DIST, filename), sprite);
fs.writeFileSync(path.join(DIST, 'sprite-manifest.json'), JSON.stringify({ filename, hash }));

// Drop any older hashed sprite from prior builds (don't touch the
// non-hashed sprite.svg if some external tool created one).
for (const f of fs.readdirSync(DIST)) {
  if (/^sprite\.[a-f0-9]{8}\.svg$/.test(f) && f !== filename) {
    fs.unlinkSync(path.join(DIST, f));
  }
}

console.log(`[sprite] wrote ${symbols.length} icons → ${filename} (${(sprite.length / 1024).toFixed(1)}KB)`);
