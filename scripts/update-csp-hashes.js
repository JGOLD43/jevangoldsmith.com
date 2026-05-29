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

// Per-file inline hashes — used to inject a tight <meta> CSP into each page
// (see injectMetaCsp). The aggregate Sets above feed the firebase.json header
// for the local emulator / any future header-capable proxy.
function hashesFor(html) {
  const scripts = new Set();
  const styles = new Set();
  for (const match of html.matchAll(/<script\b(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = match[1] || '';
    const body = match[2];
    if (!body.trim()) continue;
    const typeMatch = attrs.match(/\btype=["']([^"']+)["']/i);
    if (typeMatch && NON_EXECUTABLE_TYPES.test(typeMatch[1])) continue;
    scripts.add(hashContent(body));
  }
  for (const match of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    if (match[1].trim()) styles.add(hashContent(match[1]));
  }
  return { scripts, styles };
}

const htmlFiles = walk(DIST);
const fileHashes = new Map();
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const { scripts, styles } = hashesFor(html);
  fileHashes.set(file, { html, scripts, styles });
  scripts.forEach((h) => scriptHashes.add(h));
  styles.forEach((h) => styleHashes.add(h));
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

// Build the policy from a given set of script/style hashes. Every directive
// here is valid in a <meta http-equiv> CSP (no frame-ancestors / report-to).
// X-Frame-Options, X-Content-Type-Options and HSTS cannot be set via meta —
// they require real response headers and are therefore unavailable on raw
// GitHub Pages (see docs/ARCHITECTURE.md "Serving & headers").
function buildPolicy(scripts, styles) {
  return [
    "default-src 'self'",
    `script-src 'self' ${Array.from(scripts).sort().join(' ')}`.trim(),
    `style-src 'self' ${Array.from(styles).sort().join(' ')}`.trim(),
    "font-src 'self'",
    "img-src 'self' https://*.ltrbxd.com https://covers.openlibrary.org https://server.arcgisonline.com https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com data:",
    `connect-src 'self' ${connectOrigins.join(' ')}`,
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' mailto: https://formsubmit.co"
  ].join('; ');
}

// Aggregate policy → firebase.json (local emulator / future proxy).
cspHeader.value = buildPolicy(scriptHashes, styleHashes);
fs.writeFileSync(FIREBASE, `${JSON.stringify(firebase, null, 2)}\n`);

// Per-page enforcing CSP via <meta> — the only way to ship CSP on GitHub
// Pages, which serves no custom headers. Each page carries only its own
// inline hashes. Injected right after <head> so it governs every inline
// script/style that follows (including the pre-paint theme guard).
const META_RE = /<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>/i;
// The Sveltia CMS admin (dist/admin) loads its bundle from a CDN and talks to
// api.github.com + the auth relay, so the strict 'self' CSP would break it.
// It's a noindex authoring tool, not public content — skip CSP injection there.
const ADMIN_DIR = path.join(DIST, 'admin') + path.sep;
let injected = 0;
for (const [file, { html, scripts, styles }] of fileHashes) {
  if (file.startsWith(ADMIN_DIR)) continue;
  const meta = `<meta http-equiv="Content-Security-Policy" content="${buildPolicy(scripts, styles)}">`;
  const charsetRe = /(<meta\s+charset=[^>]*>)/i;
  let out;
  if (META_RE.test(html)) {
    out = html.replace(META_RE, meta);
  } else if (charsetRe.test(html)) {
    // After <meta charset> so the charset declaration stays within the
    // first 1024 bytes, but before the inline pre-paint theme script.
    out = html.replace(charsetRe, `$1${meta}`);
  } else if (/<head[^>]*>/i.test(html)) {
    out = html.replace(/(<head[^>]*>)/i, `$1${meta}`);
  } else {
    continue;
  }
  if (out !== html) { fs.writeFileSync(file, out); injected++; }
}

console.log(`[csp] firebase.json: ${scriptHashes.size} script + ${styleHashes.size} style hash(es); injected <meta> CSP into ${injected}/${htmlFiles.length} pages`);
