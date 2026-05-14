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
const PUBLIC_OUT = process.argv.find((a) => a.startsWith('--public-out='))?.slice(13);
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

// --public-out short-circuits the hashed-build flow: dev mode just needs a
// non-hashed sprite.svg in site-astro/public/ so `astro dev` serves it.
if (PUBLIC_OUT) {
  fs.mkdirSync(path.dirname(PUBLIC_OUT), { recursive: true });
  fs.writeFileSync(PUBLIC_OUT, sprite);
  console.log(`[sprite] wrote ${symbols.length} icons → ${PUBLIC_OUT} (${(sprite.length / 1024).toFixed(1)}KB)`);
  process.exit(0);
}

const hash = crypto.createHash('sha256').update(sprite).digest('hex').slice(0, 8);
const filename = `sprite.${hash}.svg`;
fs.writeFileSync(path.join(DIST, filename), sprite);
fs.writeFileSync(path.join(DIST, 'sprite-manifest.json'), JSON.stringify({ filename, hash }));

// Drop any older hashed sprite from prior builds, plus the unhashed
// sprite.svg that gets copied from site-astro/public/ (it's a dev-only
// convenience for `astro dev` to serve the sprite at /sprite.svg —
// production HTML refs the hashed filename, so this copy is dead weight
// in dist/).
for (const f of fs.readdirSync(DIST)) {
  if (/^sprite\.[a-f0-9]{8}\.svg$/.test(f) && f !== filename) {
    fs.unlinkSync(path.join(DIST, f));
  }
}
const unhashed = path.join(DIST, 'sprite.svg');
if (fs.existsSync(unhashed)) fs.unlinkSync(unhashed);

console.log(`[sprite] wrote ${symbols.length} icons → ${filename} (${(sprite.length / 1024).toFixed(1)}KB)`);
