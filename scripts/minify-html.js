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
const { minify } = require('html-minifier-terser');
const { distDir } = require('./_lib/paths');
const { walk: walkAll } = require('./_lib/walk');

const DIST = distDir();
const walk = (dir) => walkAll(dir).filter((p) => p.endsWith('.html'));

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

async function minifyOne(file) {
  const before = fs.readFileSync(file, 'utf8');
  let after;
  try { after = await minify(before, opts); }
  catch (err) {
    const path = require('node:path');
    console.error(`[html-min] failed on ${path.relative(DIST, file)}: ${err.message}`);
    after = before;
  }
  if (after !== before) fs.writeFileSync(file, after);
  return { before: before.length, after: after.length };
}

(async () => {
  const files = walk(DIST);
  // Process in parallel; html-minifier-terser is CPU-bound but each call
  // is independent. Concurrency 8 saturates a typical dev box without
  // thrashing.
  const CONCURRENCY = 8;
  let beforeTotal = 0;
  let afterTotal = 0;
  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const slice = files.slice(i, i + CONCURRENCY);
    const results = await Promise.all(slice.map(minifyOne));
    for (const r of results) { beforeTotal += r.before; afterTotal += r.after; }
  }
  const saved = beforeTotal - afterTotal;
  const pct = beforeTotal ? (100 * saved / beforeTotal).toFixed(1) : '0.0';
  console.log(`[html-min] ${files.length} files: ${(beforeTotal / 1024).toFixed(1)}KB → ${(afterTotal / 1024).toFixed(1)}KB (-${(saved / 1024).toFixed(1)}KB, -${pct}%)`);
})();
