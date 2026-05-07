#!/usr/bin/env node
/**
 * Re-parse + minify every emitted CSS file with lightningcss. Catches
 * any malformed selector the regex-based per-page purger might
 * accidentally emit. Also produces a final minified pass that's
 * sometimes smaller than what the purger output (whitespace + comment
 * cleanup, longhand→shorthand collapse on simple cases).
 *
 * Run after purge:css + critical:css.
 */
const fs = require('node:fs');
const path = require('node:path');
const lightningcss = require('lightningcss');

const ROOT = path.resolve(__dirname, '..');
const DIST = process.argv.find((a) => a.startsWith('--dist='))?.slice(7) || path.join(ROOT, 'dist');

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith('.css')) out.push(full);
  }
  return out;
}

const files = walk(path.join(DIST, 'css'));
let beforeTotal = 0;
let afterTotal = 0;
let parsed = 0;
const failures = [];

for (const file of files) {
  const before = fs.readFileSync(file);
  beforeTotal += before.length;
  try {
    // Parse-only validation — DON'T rewrite the file. Earlier passes
    // (purge-css + critical-css) already minify; running lightningcss
    // here with minify+targets adds vendor prefixes / longhand
    // expansion that grows the file 5-10%. The point of this pass is
    // to fail-fast on malformed CSS the regex purger might emit, not
    // to re-emit.
    lightningcss.transform({
      filename: file,
      code: before,
      minify: false
    });
    afterTotal += before.length;
    parsed++;
  } catch (err) {
    failures.push({ file: path.relative(DIST, file), error: err.message });
    afterTotal += before.length;
  }
}

const saved = beforeTotal - afterTotal;
const pct = beforeTotal ? ((saved / beforeTotal) * 100).toFixed(1) : '0.0';
console.log(`[css-validate] ${parsed}/${files.length} files parsed; ${(beforeTotal / 1024).toFixed(1)}KB → ${(afterTotal / 1024).toFixed(1)}KB (-${(saved / 1024).toFixed(1)}KB, -${pct}%)`);

if (failures.length) {
  for (const f of failures) console.error(`[css-validate] FAIL ${f.file}: ${f.error}`);
  process.exit(1);
}
