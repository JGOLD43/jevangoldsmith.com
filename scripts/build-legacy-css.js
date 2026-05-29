#!/usr/bin/env node
// Compile site-astro/src/styles/legacy.src.css → site-astro/public/css/legacy-style.css.
//
// legacy.src.css is the SINGLE SOURCE OF TRUTH for chrome styles — edit it,
// never the generated legacy-style.css. This step runs first in build.js
// (scripts/build.js) so every build regenerates the shipping CSS from source;
// the committed legacy-style.css is a build artifact kept in the tree only so
// `astro dev` (which serves public/ directly, without this compile) stays in
// sync. Run `npm run css:build-legacy` after editing source if you dev-preview
// before a full build.

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
