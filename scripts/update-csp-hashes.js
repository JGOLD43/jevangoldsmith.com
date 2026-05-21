#!/usr/bin/env node
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT, distDir } = require('./_lib/paths');
const { walk: walkAll } = require('./_lib/walk');

const DIST = distDir();
const FIREBASE = path.join(ROOT, 'firebase.json');
const walk = (dir) => walkAll(dir).filter((p) => p.endsWith('.html'));

function hashContent(value) {
  return `'sha256-${crypto.createHash('sha256').update(value.trim()).digest('base64')}'`;
}

const scriptHashes = new Set();
const styleHashes = new Set();

// data-only <script> types (application/json, application/ld+json,
// speculationrules, importmap) are NOT executed by the browser, so they
// don't need a CSP script-src hash. Hashing them anyway bloats the CSP
// header by ~5-10KB on a content-heavy site like this.
const NON_EXECUTABLE_TYPES = /(?:application\/(?:json|ld\+json)|speculationrules|importmap)/i;

for (const file of walk(DIST)) {
  const html = fs.readFileSync(file, 'utf8');
  for (const match of html.matchAll(/<script\b(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = match[1] || '';
    const body = match[2];
    if (!body.trim()) continue;
    const typeMatch = attrs.match(/\btype=["']([^"']+)["']/i);
    if (typeMatch && NON_EXECUTABLE_TYPES.test(typeMatch[1])) continue;
    scriptHashes.add(hashContent(body));
  }
  for (const match of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    if (match[1].trim()) styleHashes.add(hashContent(match[1]));
  }
}

const firebase = JSON.parse(fs.readFileSync(FIREBASE, 'utf8'));
const headers = firebase.hosting?.headers ?? [];
const catchAll = headers.find((entry) => entry.source === '**');
const cspHeader = catchAll?.headers?.find((entry) => entry.key === 'Content-Security-Policy');

if (!cspHeader) {
  throw new Error('Missing catch-all Content-Security-Policy header in firebase.json');
}

// If RUM_ENDPOINT was set at build time, extract its origin and add it to
// connect-src so the rum.ts beacon isn't blocked. Tree-shaken build (no
// endpoint) → no change to CSP.
const connectOrigins = ['https://api.allorigins.win', 'https://formsubmit.co', 'https://server.arcgisonline.com'];
const rumEndpoint = process.env.RUM_ENDPOINT;
if (rumEndpoint) {
  try {
    const u = new URL(rumEndpoint);
    const origin = `${u.protocol}//${u.host}`;
    if (!connectOrigins.includes(origin)) connectOrigins.push(origin);
  } catch (err) {
    console.warn(`[csp] RUM_ENDPOINT not a valid URL, skipping connect-src injection: ${err.message}`);
  }
}

cspHeader.value = [
  "default-src 'self'",
  `script-src 'self' ${Array.from(scriptHashes).sort().join(' ')}`,
  `style-src 'self' ${Array.from(styleHashes).sort().join(' ')}`,
  "font-src 'self'",
  "img-src 'self' https://*.ltrbxd.com https://covers.openlibrary.org https://server.arcgisonline.com https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com data:",
  `connect-src 'self' ${connectOrigins.join(' ')}`,
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' mailto: https://formsubmit.co"
].join('; ');

fs.writeFileSync(FIREBASE, `${JSON.stringify(firebase, null, 2)}\n`);
console.log(`[csp] wrote ${scriptHashes.size} script hash(es), ${styleHashes.size} style hash(es)`);
