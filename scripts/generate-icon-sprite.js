#!/usr/bin/env node
/**
 * Generate dist/sprite.svg from site-astro/src/lib/icons.ts. Each icon
 * becomes a <symbol id="icon-NAME" viewBox="..."> entry. lib/icons.ts
 * also exports getIconUse(name) which renders <svg><use href=...>; the
 * site uses that instead of inlining the SVG body on every occurrence.
 *
 * Run after astro:build, before purge:css.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DIST = process.argv.find((a) => a.startsWith('--dist='))?.slice(7) || path.join(ROOT, 'dist');
const ICONS_TS = path.join(ROOT, 'site-astro/src/lib/icons.ts');

const source = fs.readFileSync(ICONS_TS, 'utf8');

// Parse the icons map: lines like `  arrow: '<svg ...>...</svg>',`
const symbols = [];
const lineRe = /^\s*([a-zA-Z_]\w*):\s*'(<svg[\s\S]*?<\/svg>)',?\s*$/gm;
let match;
while ((match = lineRe.exec(source)) !== null) {
  const name = match[1];
  const svg = match[2];
  // Pull viewBox out of the outer <svg> tag (defaults to 0 0 24 24).
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 24 24';
  // Inner contents: drop the outer <svg ...> open and trailing </svg>.
  const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  symbols.push(`<symbol id="icon-${name}" viewBox="${viewBox}">${inner}</symbol>`);
}

if (symbols.length === 0) {
  console.error('[sprite] no icons parsed from', ICONS_TS);
  process.exit(1);
}

const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">${symbols.join('')}</svg>\n`;
const out = path.join(DIST, 'sprite.svg');
fs.writeFileSync(out, sprite);

console.log(`[sprite] wrote ${symbols.length} icons → ${path.relative(ROOT, out)} (${(sprite.length / 1024).toFixed(1)}KB)`);
