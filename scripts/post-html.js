#!/usr/bin/env node
/**
 * Single-walk post-Astro HTML rewriter. Runs three text-substitution passes
 * over every dist/*.html in one read+write per file:
 *   1. sprite pinning  (/sprite.svg# → /sprite.HASH.svg#)  [also runs on .svg]
 *   2. modulepreload   (<link rel="modulepreload"> for each <script type=module>)
 *
 * Replaces scripts/pin-sprite.js + scripts/inject-modulepreload.js — both
 * were doing one walk each over the same set of files.
 *
 * Order matters relative to other phases:
 *   - must run AFTER icons:sprite (needs sprite-manifest.json)
 *   - must run BEFORE html:min (minifier may collapse the modulepreload
 *     hint placement)
 *   - must run BEFORE csp:hashes (every <script> here is data-only or
 *     external; this script doesn't add inline executables but the
 *     subsequent minify-html step may shuffle <style> bodies)
 */
const fs = require('node:fs');
const path = require('node:path');
const { distDir } = require('./_lib/paths');
const { walk } = require('./_lib/walk');

const DIST = distDir();

const manifestPath = path.join(DIST, 'sprite-manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error('[post-html] missing sprite-manifest.json');
  process.exit(1);
}
const { filename: spriteFile } = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

let spriteRefs = 0;
let mpHints = 0;
let mpFiles = 0;
let touched = 0;

for (const file of walk(DIST)) {
  const isHtml = file.endsWith('.html');
  const isSvg = file.endsWith('.svg');
  if (!isHtml && !isSvg) continue;

  let text = fs.readFileSync(file, 'utf8');
  const before = text;

  // 1. sprite pin — text replace; cheap and runs on both HTML + sprite SVG.
  text = text.replace(/\/sprite\.svg#/g, () => { spriteRefs++; return `/${spriteFile}#`; });

  // 2. modulepreload — only for HTML; collect external module srcs and
  //    emit <link rel=modulepreload> in <head>.
  if (isHtml) {
    const srcs = new Set();
    for (const m of text.matchAll(/<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["'](\/_astro\/[^"']+)["']/g)) {
      srcs.add(m[1]);
    }
    if (srcs.size > 0) {
      const tags = [...srcs]
        .filter((src) => !text.includes(`rel="modulepreload" href="${src}"`))
        .map((src) => `<link rel="modulepreload" href="${src}">`)
        .join('');
      const headIdx = text.indexOf('</head>');
      if (tags && headIdx >= 0) {
        text = text.slice(0, headIdx) + tags + text.slice(headIdx);
        mpHints += srcs.size;
        mpFiles++;
      }
    }
  }

  if (text !== before) {
    fs.writeFileSync(file, text);
    touched++;
  }
}

console.log(`[post-html] sprite-refs=${spriteRefs} | modulepreload=${mpHints} hints in ${mpFiles} pages | files-touched=${touched}`);
