#!/usr/bin/env node
// Phase 8 audit: cross-check the curated search index against published
// collection items. Emits a coverage report listing items that exist in
// data/*.json but are not represented in the search index, so we can spot
// drift before flipping search to a fully-generated index.
//
// Read-only. Does not mutate the index or fail the build by default
// (pass --strict to fail on missing items).

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const INDEX = path.join(ROOT, 'site-astro/public/api/v1/search-index.json');

function readJson(rel) {
  return JSON.parse(fs.readFileSync(rel, 'utf8'));
}

function unwrap(raw, key) {
  if (Array.isArray(raw)) return raw;
  if (key && Array.isArray(raw[key])) return raw[key];
  return [];
}

function nonEmpty(v) { return typeof v === 'string' && v.trim() !== ''; }

// Match the per-page visibility filter used across the collection pages:
// hide drafts and private items, treat anything else as live content. Most
// JSON has no `status` field at all (books/people/movies/podcasts), so the
// default-published path covers them.
function isVisible(item) {
  const status = nonEmpty(item.status) ? item.status.toLowerCase() : '';
  if (status === 'draft' || status === 'private' || status === 'retired') return false;
  if (item.visibility === 'private') return false;
  return true;
}

const COLLECTIONS = [
  { name: 'adventures', file: 'adventures.json', key: 'adventures', titleFrom: ['title'] },
  { name: 'projects', file: 'projects.json', key: 'projects', titleFrom: ['title'] },
  { name: 'people', file: 'people.json', key: 'people', titleFrom: ['name'] },
  { name: 'podcasts', file: 'podcasts.json', key: 'podcasts', titleFrom: ['title'] },
  { name: 'books', file: 'books.json', key: 'books', titleFrom: ['title'] },
  { name: 'movies', file: 'movies.json', key: null, titleFrom: ['title'] }
];

function pickFirst(item, fields) {
  for (const f of fields) {
    const v = item[f];
    if (v == null) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    return String(v);
  }
  return null;
}

function main() {
  const strict = process.argv.includes('--strict');
  const index = readJson(INDEX);
  const records = Array.isArray(index) ? index : index.records || [];
  const indexTitles = new Map();
  for (const r of records) {
    const key = `${r.type}:${(r.title || '').toLowerCase().trim()}`;
    indexTitles.set(key, r);
  }

  const missing = [];
  const stats = {};

  for (const cfg of COLLECTIONS) {
    const filePath = path.join(DATA, cfg.file);
    if (!fs.existsSync(filePath)) continue;
    const raw = readJson(filePath);
    const items = unwrap(raw, cfg.key).filter(isVisible);
    stats[cfg.name] = { total: items.length, indexed: 0, missing: 0 };
    for (const item of items) {
      const title = pickFirst(item, cfg.titleFrom);
      if (!title) continue;
      const key = `${cfg.name}:${title.toLowerCase().trim()}`;
      if (indexTitles.has(key)) {
        stats[cfg.name].indexed += 1;
      } else {
        stats[cfg.name].missing += 1;
        missing.push({ collection: cfg.name, title });
      }
    }
  }

  process.stdout.write('[search-audit] Coverage by collection:\n');
  for (const [name, s] of Object.entries(stats)) {
    const pct = s.total ? Math.round((s.indexed / s.total) * 100) : 100;
    process.stdout.write(`  ${name.padEnd(12)} indexed=${s.indexed}/${s.total} (${pct}%) missing=${s.missing}\n`);
  }

  if (missing.length) {
    process.stdout.write(`\n[search-audit] ${missing.length} published items missing from search index:\n`);
    for (const m of missing.slice(0, 30)) {
      process.stdout.write(`  - ${m.collection}: ${m.title}\n`);
    }
    if (missing.length > 30) process.stdout.write(`  ... and ${missing.length - 30} more\n`);
    if (strict) process.exit(1);
  } else {
    process.stdout.write('\n[search-audit] all published items appear in search index\n');
  }
}

main();
