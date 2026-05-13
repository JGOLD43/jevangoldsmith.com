#!/usr/bin/env node
// Browser-free smoke harness for the Native Astro Modernization Phase 10
// guardrail. Walks a list of canonical URLs against either a running dev
// server or a built dist served via http-server, asserts status, presence
// of stable structural hooks, and that runtime JSON manifests still load.
//
// Usage:
//   node scripts/smoke-check.js                # uses BASE_URL or http://localhost:4321
//   BASE_URL=http://localhost:8080 node scripts/smoke-check.js
//
// Exits non-zero on the first hard failure. Soft asserts are warnings.

'use strict';

const DEFAULT_BASE = process.env.BASE_URL || 'http://localhost:4321';

// Astro dev server serves /books, dist/ serves /books.html. We try the
// pretty path first, then fall back to .html so the same CHECKS table
// works against both targets.
const HTML_FALLBACK = process.env.SMOKE_HTML_FALLBACK !== '0';

// Each check: a URL, a list of substrings that MUST appear in the response,
// and an optional list of substrings that MUST NOT appear. Substrings are
// chosen to be stable structural anchors (ids/classes the JS depends on),
// not pixel-perfect markup.
const CHECKS = [
  {
    url: '/',
    must: ['</footer>', 'href="books.html"', 'href="adventures.html"'],
    mustNot: ['<<', '>>']
  },
  {
    url: '/books',
    must: ['id="books-container"', 'id="book-search"', 'id="book-count"']
  },
  {
    url: '/movies',
    must: ['id="movies-container"', 'id="movie-search"', 'id="movie-count"']
  },
  {
    url: '/people',
    must: ['id="people-search"', 'id="people-count"']
  },
  {
    url: '/podcasts',
    must: ['id="podcasts-container"', 'id="podcast-count"']
  },
  {
    url: '/essays',
    must: ['id="essays-container"', 'id="essay-search"', 'id="essay-count"']
  },
  {
    url: '/projects',
    must: ['id="projects-container"', 'id="project-search"', 'id="project-count"']
  },
  {
    url: '/challenges',
    must: ['id="challenges-container"', 'id="challenge-search"', 'id="challenge-count"']
  },
  {
    url: '/adventures',
    must: ['id="adventures-container"', 'id="adventure-count"', 'adventures-page-split']
  },
  {
    url: '/quotes',
    must: ['quotes-grid', 'data-filter-group']
  },
  {
    url: '/search',
    must: ['site-search-input', 'site-search-results']
  }
];

function isStaticHtmlExt(url) {
  return url.endsWith('.html') || url.endsWith('.json');
}

async function fetchText(base, url) {
  // Pretty paths (/books) work on Astro dev. http-server serving dist
  // redirects /books → /books/ → directory listing, hiding the real
  // /books.html. Try the .html path first when running against a static
  // server, then fall back to the pretty path.
  const candidates = [];
  if (HTML_FALLBACK && !isStaticHtmlExt(url) && url !== '/') {
    candidates.push(`${url}.html`);
  }
  candidates.push(url);
  let res;
  let target;
  for (const candidate of candidates) {
    target = new URL(candidate, base).toString();
    res = await fetch(target, { redirect: 'follow' });
    if (res.ok) break;
  }
  const body = await res.text();
  return { ok: res.ok, status: res.status, body, target };
}

function checkBody(body, must, mustNot) {
  const missing = [];
  for (const s of must || []) {
    if (!body.includes(s)) missing.push(s);
  }
  const banned = [];
  for (const s of mustNot || []) {
    if (body.includes(s)) banned.push(s);
  }
  return { missing, banned };
}

// Phase 6 + Phase 8: runtime manifest health. Each entry: a URL the browser
// fetches at runtime and a minimum-byte floor that catches accidental
// truncation (e.g. a generator producing `[]`). The perf-budget script owns
// the upper bound; this owns the lower bound + 200 OK reachability.
//
// The list mirrors the actual runtime fetches in site-astro/src/scripts:
//   adventures.ts -> data/adventures.json
//   books.ts -> data/books.generated.json (cover paths included)
//   letterboxd.ts -> data/movies.json
//   people-data.ts -> api/v1/people-modal.json
// Build-time-only data files (quotes/projects/products/essays/podcasts)
// are pruned from dist by prune-dist-assets.js — runtime never fetches
// them, so a smoke assertion would be a stale contract.
const RUNTIME_MANIFESTS = [
  { url: '/data/adventures.json', minBytes: 1024 },
  { url: '/data/books.generated.json', minBytes: 4096 },
  { url: '/data/movies.json', minBytes: 512 },
  { url: '/api/v1/people-modal.json', minBytes: 1024 },
  { url: '/api/v1/search-index.json', minBytes: 4096 }
];

async function run(base) {
  const failures = [];
  let passed = 0;

  for (const check of CHECKS) {
    let result;
    try {
      result = await fetchText(base, check.url);
    } catch (err) {
      failures.push(`${check.url}: fetch failed: ${err.message}`);
      continue;
    }
    if (!result.ok) {
      failures.push(`${check.url}: status ${result.status} (expected 2xx)`);
      continue;
    }
    const { missing, banned } = checkBody(result.body, check.must, check.mustNot);
    if (missing.length || banned.length) {
      const parts = [];
      if (missing.length) parts.push(`missing=${JSON.stringify(missing)}`);
      if (banned.length) parts.push(`unexpected=${JSON.stringify(banned)}`);
      failures.push(`${check.url}: ${parts.join(' ')}`);
      continue;
    }
    passed += 1;
    process.stdout.write(`[smoke] ok ${check.url}\n`);
  }

  for (const manifest of RUNTIME_MANIFESTS) {
    let result;
    try {
      result = await fetchText(base, manifest.url);
    } catch (err) {
      failures.push(`${manifest.url}: fetch failed: ${err.message}`);
      continue;
    }
    if (!result.ok) {
      failures.push(`${manifest.url}: status ${result.status}`);
      continue;
    }
    const bytes = Buffer.byteLength(result.body, 'utf8');
    if (bytes < manifest.minBytes) {
      failures.push(`${manifest.url}: ${bytes}B (min ${manifest.minBytes}B)`);
      continue;
    }
    try {
      JSON.parse(result.body);
    } catch (err) {
      failures.push(`${manifest.url}: invalid JSON: ${err.message}`);
      continue;
    }
    passed += 1;
    process.stdout.write(`[smoke] ok ${manifest.url} (${bytes}B)\n`);
  }

  if (failures.length) {
    process.stderr.write(`\n[smoke] ${failures.length} failure(s):\n`);
    for (const f of failures) process.stderr.write(`  - ${f}\n`);
    process.exit(1);
  }
  const total = CHECKS.length + RUNTIME_MANIFESTS.length;
  process.stdout.write(`\n[smoke] ${passed}/${total} checks passed against ${base}\n`);
}

run(DEFAULT_BASE).catch((err) => {
  process.stderr.write(`[smoke] fatal: ${err.stack || err.message}\n`);
  process.exit(2);
});
