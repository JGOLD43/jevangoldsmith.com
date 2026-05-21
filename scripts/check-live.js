#!/usr/bin/env node
// Post-deploy live verification. Hits production URLs and validates:
//   - core routes return 200
//   - sitemap.xml + robots.txt reachable
//   - key security headers present
//   - service worker scope serves
// Exits non-zero on any failure so the deploy workflow can surface it.
//
// Override the host with HOST env var for staging/preview checks.

const HOST = process.env.HOST || 'https://jevangoldsmith.com';
const TIMEOUT_MS = 15000;

const ROUTES = [
  '/',
  '/books.html',
  '/movies.html',
  '/people.html',
  '/adventures.html',
  '/essays.html',
  '/sitemap-index.xml',
  '/robots.txt'
];

const REQUIRED_SECURITY_HEADERS = [
  'content-security-policy',
  'strict-transport-security',
  'x-content-type-options'
];

async function fetchWithTimeout(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function check() {
  const failures = [];
  let homeHeaders = null;

  for (const route of ROUTES) {
    const url = HOST.replace(/\/$/, '') + route;
    let res;
    try {
      res = await fetchWithTimeout(url);
    } catch (err) {
      failures.push(`${route}: fetch error: ${err.message}`);
      continue;
    }
    if (!res.ok) {
      failures.push(`${route}: HTTP ${res.status}`);
      continue;
    }
    if (route === '/') homeHeaders = res.headers;
    console.log(`OK  ${route} (${res.status})`);
  }

  if (homeHeaders) {
    for (const header of REQUIRED_SECURITY_HEADERS) {
      if (!homeHeaders.get(header)) {
        failures.push(`/: missing security header ${header}`);
      }
    }
  }

  // SW must be reachable so repeat visitors don't lose their cache layer.
  try {
    const swRes = await fetchWithTimeout(HOST.replace(/\/$/, '') + '/sw.js');
    if (!swRes.ok) failures.push(`/sw.js: HTTP ${swRes.status}`);
    else console.log('OK  /sw.js (200)');
  } catch (err) {
    failures.push(`/sw.js: fetch error: ${err.message}`);
  }

  if (failures.length > 0) {
    console.error('\n[check-live] FAILURES:');
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(`\n[check-live] all ${ROUTES.length + 1} probes passed against ${HOST}`);
}

check().catch((err) => {
  console.error('[check-live] unexpected error:', err);
  process.exit(1);
});
