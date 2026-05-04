#!/usr/bin/env node
// Phase 8 sync: generate search-index records for collections currently
// missing from the curated index (people, podcasts, movies) and merge
// them into site-astro/public/api/v1/search-index.json.
//
// Idempotent: skips records that already exist by `${type}:${title}` key.
// Preserves all hand-curated records. The schema matches existing
// adventures/projects/books records (type, id, title, summary, section,
// url, tags, searchText).
//
// Usage:
//   node scripts/sync-search-index.js            # dry-run, prints diff
//   node scripts/sync-search-index.js --write    # writes the file

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const INDEX = path.join(ROOT, 'site-astro/public/api/v1/search-index.json');
const SITE = 'https://jevangoldsmith.com';

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function nonEmpty(v) { return typeof v === 'string' && v.trim() !== ''; }
function asArray(v) { return Array.isArray(v) ? v : []; }
function unwrap(raw, key) { return Array.isArray(raw) ? raw : (key && Array.isArray(raw[key]) ? raw[key] : []); }
function isVisible(item) {
  const status = nonEmpty(item.status) ? item.status.toLowerCase() : '';
  if (status === 'draft' || status === 'private' || status === 'retired') return false;
  if (item.visibility === 'private') return false;
  return true;
}

function slugify(s) {
  return String(s).toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

function buildSearchText(parts) {
  return parts.filter(Boolean).map((p) => String(p).toLowerCase()).join(' ').replace(/\s+/g, ' ').trim();
}

function recordForPerson(p) {
  const id = p.id || slugify(p.name);
  const title = p.name;
  const summary = p.lesson || p.title || '';
  const tags = [p.title, p.category].filter(Boolean);
  return {
    type: 'people',
    id,
    title,
    summary,
    section: 'people',
    url: `${SITE}/people/${id}.html`,
    tags,
    searchText: buildSearchText([title, summary, p.title, p.category, 'people'])
  };
}

function recordForPodcast(p) {
  const id = p.id || slugify(p.title);
  const title = p.title;
  const summary = p.description || '';
  const tags = [p.host, p.category, p.badge].filter(Boolean);
  return {
    type: 'podcasts',
    id,
    title,
    summary,
    section: 'podcasts',
    url: `${SITE}/podcasts.html#${id}`,
    tags,
    searchText: p.searchText
      ? p.searchText.toLowerCase()
      : buildSearchText([title, summary, p.host, p.category, p.badge, 'podcasts'])
  };
}

function recordForMovie(m) {
  const id = m.id || (m.tmdbId ? String(m.tmdbId) : slugify(m.title));
  const title = m.title;
  const summary = m.overview || '';
  const tags = [...asArray(m.tmdbGenres), m.genre].filter(Boolean);
  return {
    type: 'movies',
    id,
    title,
    summary,
    section: 'movies',
    url: `${SITE}/movies.html#${id}`,
    tags,
    searchText: buildSearchText([title, summary, m.genre, ...tags, 'movies'])
  };
}

function main() {
  const write = process.argv.includes('--write');
  const indexDoc = readJson(INDEX);
  const records = Array.isArray(indexDoc) ? indexDoc : indexDoc.records || [];
  const seen = new Set(records.map((r) => `${r.type}:${(r.title || '').toLowerCase().trim()}`));

  const additions = [];

  const people = unwrap(readJson(path.join(DATA, 'people.json')), 'people').filter(isVisible);
  for (const p of people) {
    const rec = recordForPerson(p);
    const key = `${rec.type}:${rec.title.toLowerCase().trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    additions.push(rec);
  }

  const podcasts = unwrap(readJson(path.join(DATA, 'podcasts.json')), 'podcasts').filter(isVisible);
  for (const p of podcasts) {
    const rec = recordForPodcast(p);
    const key = `${rec.type}:${rec.title.toLowerCase().trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    additions.push(rec);
  }

  const movies = unwrap(readJson(path.join(DATA, 'movies.json')), null).filter(isVisible);
  for (const m of movies) {
    const rec = recordForMovie(m);
    const key = `${rec.type}:${rec.title.toLowerCase().trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    additions.push(rec);
  }

  process.stdout.write(`[search-sync] ${records.length} existing records, ${additions.length} additions\n`);
  const byType = additions.reduce((acc, r) => { acc[r.type] = (acc[r.type] || 0) + 1; return acc; }, {});
  for (const [type, count] of Object.entries(byType)) {
    process.stdout.write(`[search-sync]   +${count} ${type}\n`);
  }

  if (!write) {
    process.stdout.write('[search-sync] dry-run (pass --write to persist)\n');
    return;
  }

  const merged = [...records, ...additions];
  const output = Array.isArray(indexDoc)
    ? merged
    : { ...indexDoc, updatedAt: new Date().toISOString(), records: merged };
  fs.writeFileSync(INDEX, `${JSON.stringify(output, null, 2)}\n`);
  process.stdout.write(`[search-sync] wrote ${merged.length} records to ${path.relative(ROOT, INDEX)}\n`);
}

main();
