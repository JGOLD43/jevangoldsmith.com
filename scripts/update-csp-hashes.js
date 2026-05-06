#!/usr/bin/env node
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DIST = process.argv.find((arg) => arg.startsWith('--dist='))?.slice(7) || path.join(ROOT, 'dist');
const FIREBASE = path.join(ROOT, 'firebase.json');

function hashContent(value) {
  return `'sha256-${crypto.createHash('sha256').update(value.trim()).digest('base64')}'`;
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
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

cspHeader.value = [
  "default-src 'self'",
  `script-src 'self' ${Array.from(scriptHashes).sort().join(' ')}`,
  `style-src 'self' ${Array.from(styleHashes).sort().join(' ')}`,
  "font-src 'self'",
  "img-src 'self' https://images.unsplash.com https://*.ltrbxd.com https://covers.openlibrary.org https://server.arcgisonline.com data:",
  "connect-src 'self' https://api.allorigins.win https://formsubmit.co https://server.arcgisonline.com",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' mailto: https://formsubmit.co"
].join('; ');

fs.writeFileSync(FIREBASE, `${JSON.stringify(firebase, null, 2)}\n`);
console.log(`[csp] wrote ${scriptHashes.size} script hash(es), ${styleHashes.size} style hash(es)`);
