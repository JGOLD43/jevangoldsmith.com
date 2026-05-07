#!/usr/bin/env node
/**
 * Inject <link rel="modulepreload"> into <head> for every <script type=module>
 * src found later in the document. Browser then starts the bundle fetch
 * alongside HTML parsing instead of waiting for the parser to reach
 * end-of-body. Cuts TTI by ~100-200ms on slow connections.
 *
 * Run after astro:build + purge:css, before csp:hashes.
 *
 * The injected <link> tag has no script body so it doesn't change the CSP
 * script-hash list. Idempotent — skips files that already have the tag.
 */
const fs = require('node:fs');
const { distDir } = require('./_lib/paths');
const { walk } = require('./_lib/walk');

const DIST = distDir();
const walkHtml = (dir) => walk(dir).filter((p) => p.endsWith('.html'));

let mutated = 0;
let injected = 0;

for (const file of walkHtml(DIST)) {
  let html = fs.readFileSync(file, 'utf8');
  const srcs = new Set();
  for (const m of html.matchAll(/<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["'](\/_astro\/[^"']+)["']/g)) {
    srcs.add(m[1]);
  }
  if (srcs.size === 0) continue;
  const tags = [...srcs]
    .filter((src) => !html.includes(`rel="modulepreload" href="${src}"`))
    .map((src) => `<link rel="modulepreload" href="${src}">`)
    .join('');
  if (!tags) continue;
  const headIdx = html.indexOf('</head>');
  if (headIdx < 0) continue;
  html = html.slice(0, headIdx) + tags + html.slice(headIdx);
  fs.writeFileSync(file, html);
  mutated++;
  injected += srcs.size;
}

console.log(`[modulepreload] injected ${injected} hint(s) across ${mutated} page(s)`);
