#!/usr/bin/env node
// Compile site-astro/src/styles/legacy.src.css → site-astro/public/css/legacy-style.css.
// Run after editing the readable source; output is what the build consumes.
//
// Not auto-wired into `npm run build` yet — current legacy-style.css is the
// authoritative shipping file. Wiring this in is a future migration that
// requires verifying chrome.css hash and visual diff stability under the
// new minifier.

const fs = require('node:fs');
const path = require('node:path');
const lightningcss = require('lightningcss');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'site-astro', 'src', 'styles', 'legacy.src.css');
const OUT = path.join(ROOT, 'site-astro', 'public', 'css', 'legacy-style.css');

if (!fs.existsSync(SRC)) {
  console.error(`[build-legacy-css] source missing: ${SRC}`);
  process.exit(1);
}

const result = lightningcss.transform({
  filename: 'legacy.src.css',
  code: fs.readFileSync(SRC),
  minify: true,
  sourceMap: false
});

fs.writeFileSync(OUT, result.code);
console.log(`[build-legacy-css] wrote ${OUT} (${result.code.length} bytes)`);
