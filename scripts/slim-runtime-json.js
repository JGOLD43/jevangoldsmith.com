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

// content.json + pages.json + books.json are "agent API" payloads —
// referenced in <link rel="alternate" type="application/json"> for
// crawlers and AI agents. The page runtime never fetches them. Bots
// don't need verbose long-form text; the canonical HTML pages do that
// job. Strip the heaviest free-text fields here so hosting bandwidth
// drops without losing the structured signal (URLs, titles, types).

function slimAgentJson(file, dropKeys) {
  const fullPath = path.join(DIST, file);
  if (!fs.existsSync(fullPath)) return;
  const before = fs.statSync(fullPath).size;
  const doc = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  function strip(obj) {
    if (Array.isArray(obj)) return obj.map(strip);
    if (obj && typeof obj === 'object') {
      const next = {};
      for (const [k, v] of Object.entries(obj)) {
        if (dropKeys.has(k)) continue;
        next[k] = strip(v);
      }
      return next;
    }
    return obj;
  }
  fs.writeFileSync(fullPath, JSON.stringify(strip(doc)));
  const after = fs.statSync(fullPath).size;
  const saved = before - after;
  const pct = before ? ((saved / before) * 100).toFixed(0) : '0';
  console.log(`[slim-json] ${file}: ${(before/1024).toFixed(1)}KB → ${(after/1024).toFixed(1)}KB (-${(saved/1024).toFixed(1)}KB, -${pct}%)`);
}

// Conservative drop list — these are the descriptive long-text fields
// that bloat the JSON. Structured metadata (urls, ids, titles, dates,
// categories, ratings) stays.
slimAgentJson('api/v1/content.json', new Set(['body', 'fullText', 'descriptionHtml', 'summaryHtml', 'longDescription']));
slimAgentJson('api/v1/pages.json', new Set(['descriptionHtml', 'longDescription', 'fullText']));
slimAgentJson('api/v1/books.json', new Set(['review', 'shortDescription']));
