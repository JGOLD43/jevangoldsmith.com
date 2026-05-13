#!/usr/bin/env node
// Phase 1 slice 1.2: build-time Letterboxd RSS sync.
//
// Fetches the user's Letterboxd RSS feed (via the allorigins.win CORS proxy
// that the runtime client previously used at page-load time) and merges
// the entries into data/movies.json. Run on demand or as a nightly cron;
// the result is checked-in source data so the page can SSR all cards
// instead of fetching at runtime + wiping the SSR'd grid.
//
// Usage:
//   npm run movies:sync            # merge new entries into data/movies.json
//   npm run movies:sync -- --dry   # report what would change, write nothing
//   npm run movies:sync -- --user=different-handle
//
// Idempotent: existing entries are preserved (TMDB enrichment, custom
// reviews) and only new entries from the feed are appended.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MOVIES_PATH = path.join(ROOT, 'data', 'movies.json');
const DEFAULT_USER = 'contentwatch';

const args = process.argv.slice(2);
const isDry = args.includes('--dry');
const userArg = args.find((a) => a.startsWith('--user='));
const username = userArg ? userArg.slice(7) : DEFAULT_USER;

function log(msg) { process.stdout.write(`[letterboxd-sync] ${msg}\n`); }
function warn(msg) { process.stderr.write(`[letterboxd-sync] WARN ${msg}\n`); }

async function fetchRss() {
  const rssUrl = `https://letterboxd.com/${username}/rss/`;
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`;
  log(`fetching ${rssUrl} via allorigins proxy...`);
  const res = await fetch(proxyUrl, { headers: { 'User-Agent': 'jevangoldsmith-site-sync' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} from proxy`);
  return res.text();
}

// Parse without DOMParser (Node 20 doesn't ship one by default). Tolerant of
// the formats Letterboxd actually emits — we only care about a stable subset
// of fields per item.
function parseXml(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    items.push(m[1]);
  }
  function pluck(body, tag) {
    const m = body.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
    if (!m) return '';
    let v = m[1].trim();
    // Strip CDATA wrapper.
    if (v.startsWith('<![CDATA[') && v.endsWith(']]>')) v = v.slice(9, -3);
    // Decode common entities.
    return v
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
  function pluckAll(body, tag) {
    const out = [];
    const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'g');
    let m;
    while ((m = re.exec(body)) !== null) out.push(m[1].trim());
    return out;
  }
  return items.map((body) => ({
    title: pluck(body, 'title'),
    description: pluck(body, 'description'),
    link: pluck(body, 'link'),
    pubDate: pluck(body, 'pubDate'),
    categories: pluckAll(body, 'category')
  }));
}

function extractStarRating(title) {
  // Letterboxd titles look like: "What Dreams May Come, 1998 - ★★★★★"
  const m = title.match(/[★]+(½)?/);
  if (!m) return { stars: '', count: 0 };
  const fullCount = (m[0].match(/★/g) || []).length;
  const half = m[0].includes('½');
  return {
    stars: '★'.repeat(fullCount) + (half ? '½' : ''),
    count: fullCount + (half ? 0.5 : 0)
  };
}

function extractPosterFromDescription(html) {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : '';
}

function extractYearFromTitle(title) {
  const m = title.match(/,\s*(\d{4})\b/);
  return m ? m[1] : '';
}

function cleanTitle(title) {
  // Strip the ", YYYY - ★★★" suffix.
  return title.replace(/,\s*\d{4}\s*-\s*[★½\s]+.*$/, '').replace(/,\s*\d{4}\s*$/, '').trim();
}

function formatPubDate(pubDate) {
  if (!pubDate) return '';
  const d = new Date(pubDate);
  if (Number.isNaN(d.getTime())) return pubDate;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function rssEntryToMovie(item) {
  const title = cleanTitle(item.title);
  const year = extractYearFromTitle(item.title);
  const { stars, count } = extractStarRating(item.title);
  const poster = extractPosterFromDescription(item.description);
  const genre = item.categories[0] || 'Uncategorized';
  return {
    title,
    date: formatPubDate(item.pubDate),
    link: item.link,
    rating: stars,
    starCount: count,
    year,
    poster,
    genre,
    timesWatched: 1
  };
}

function loadExisting() {
  if (!fs.existsSync(MOVIES_PATH)) return [];
  const raw = JSON.parse(fs.readFileSync(MOVIES_PATH, 'utf8'));
  return Array.isArray(raw) ? raw : [];
}

function mergeMovies(existing, fetched) {
  // Key: lowercased trimmed title (movies don't have a stable id).
  // Existing entries WIN — they may carry TMDB enrichment + custom reviews.
  // New entries from the feed get appended.
  const byTitle = new Map();
  for (const e of existing) {
    if (e && e.title) byTitle.set(e.title.toLowerCase().trim(), e);
  }
  let added = 0;
  for (const f of fetched) {
    const key = (f.title || '').toLowerCase().trim();
    if (!key || byTitle.has(key)) continue;
    byTitle.set(key, f);
    added += 1;
  }
  return { merged: Array.from(byTitle.values()), added };
}

async function main() {
  let xml;
  try {
    xml = await fetchRss();
  } catch (err) {
    warn(`fetch failed: ${err.message}`);
    warn('keeping existing data/movies.json unchanged.');
    process.exit(0);
  }
  const fetched = parseXml(xml).map(rssEntryToMovie).filter((m) => m.title);
  log(`fetched ${fetched.length} entries`);

  const existing = loadExisting();
  log(`existing data/movies.json: ${existing.length} entries`);

  const { merged, added } = mergeMovies(existing, fetched);
  log(`merge: +${added} new, ${merged.length} total`);

  if (isDry) {
    log('dry run — no write.');
    return;
  }

  if (added === 0) {
    log('nothing new to write.');
    return;
  }

  // Sort by date desc when we can parse one.
  merged.sort((a, b) => {
    const da = new Date(a.date || a.pubDate || 0).getTime();
    const db = new Date(b.date || b.pubDate || 0).getTime();
    return db - da;
  });

  fs.writeFileSync(MOVIES_PATH, JSON.stringify(merged, null, 2) + '\n');
  log(`wrote ${path.relative(ROOT, MOVIES_PATH)}`);
}

main().catch((err) => {
  warn(`fatal: ${err.stack || err.message}`);
  process.exit(1);
});
