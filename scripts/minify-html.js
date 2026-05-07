#!/usr/bin/env node
/**
 * Run html-minifier-terser over every dist/*.html. Conservative options
 * preserve <script type=application/json> and <script type=application/ld+json>
 * blocks verbatim (they're parsed at runtime). Saves 5-10% post-gzip on
 * collection pages with lots of repeated card markup.
 *
 * Run after purge:css + modulepreload, before slim:json.
 */
const fs = require('node:fs');
const path = require('node:path');
const { minify } = require('html-minifier-terser');

const ROOT = path.resolve(__dirname, '..');
const DIST = process.argv.find((a) => a.startsWith('--dist='))?.slice(7) || path.join(ROOT, 'dist');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const opts = {
  collapseWhitespace: true,
  conservativeCollapse: false,
  removeComments: true,
  removeRedundantAttributes: true,
  removeScriptTypeAttributes: false, // keep type=module / type=application/ld+json verbatim
  removeStyleLinkTypeAttributes: true,
  decodeEntities: false,
  minifyCSS: false,
  minifyJS: false,
  // KEEP inline JSON/script payloads byte-stable:
  customAttrCollapse: /(?!.*)/,
  preserveLineBreaks: false,
  // Don't touch the inline CSP-hashed scripts/styles (would re-hash CSP).
  ignoreCustomFragments: [
    /<script[^>]*type=["']application\/json["'][\s\S]*?<\/script>/gi,
    /<script[^>]*type=["']application\/ld\+json["'][\s\S]*?<\/script>/gi,
    /<script[^>]*type=["']speculationrules["'][\s\S]*?<\/script>/gi
  ]
};

(async () => {
  const files = walk(DIST);
  let beforeTotal = 0;
  let afterTotal = 0;
  for (const file of files) {
    const before = fs.readFileSync(file, 'utf8');
    beforeTotal += before.length;
    let after;
    try {
      after = await minify(before, opts);
    } catch (err) {
      console.error(`[html-min] failed on ${path.relative(DIST, file)}: ${err.message}`);
      after = before;
    }
    afterTotal += after.length;
    if (after !== before) fs.writeFileSync(file, after);
  }
  const saved = beforeTotal - afterTotal;
  const pct = beforeTotal ? (100 * saved / beforeTotal).toFixed(1) : '0.0';
  console.log(`[html-min] ${files.length} files: ${(beforeTotal / 1024).toFixed(1)}KB → ${(afterTotal / 1024).toFixed(1)}KB (-${(saved / 1024).toFixed(1)}KB, -${pct}%)`);
})();
