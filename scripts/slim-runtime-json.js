#!/usr/bin/env node
/**
 * Strip fields from dist JSON payloads that the runtime can reconstruct.
 * Source files in site-astro/public/api/v1/ stay canonical; only the
 * deployed copy is slimmed.
 *
 * Currently:
 *   - search-index.json: drops `searchText` (recomputed in search-astro.ts
 *     from title+summary+section+type+tags) and `id` (unused at runtime).
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DIST = process.argv.find((a) => a.startsWith('--dist='))?.slice(7) || path.join(ROOT, 'dist');

function slimSearchIndex() {
  const file = path.join(DIST, 'api/v1/search-index.json');
  if (!fs.existsSync(file)) return null;
  const before = fs.statSync(file).size;
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(doc.records)) return null;
  doc.records = doc.records.map((r) => {
    const { searchText: _searchText, id: _id, ...rest } = r;
    return rest;
  });
  fs.writeFileSync(file, JSON.stringify(doc));
  const after = fs.statSync(file).size;
  return { before, after };
}

const result = slimSearchIndex();
if (result) {
  const saved = result.before - result.after;
  const pct = ((saved / result.before) * 100).toFixed(0);
  console.log(`[slim-json] search-index.json: ${(result.before/1024).toFixed(1)}KB → ${(result.after/1024).toFixed(1)}KB (-${(saved/1024).toFixed(1)}KB, -${pct}%)`);
} else {
  console.log('[slim-json] search-index.json missing — skip');
}
