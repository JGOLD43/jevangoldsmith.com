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

// True data-only <script> types that CSP does NOT govern: application/json and
// application/ld+json (JSON-LD). These don't need a script-src hash and hashing
// them would bloat the CSP. NOTE: `speculationrules` and `importmap` ARE
// enforced under script-src by Chrome, so they must be hashed — excluding them
// gets them blocked once the CSP is actually enforced (via the <meta> tag).
const NON_EXECUTABLE_TYPES = /application\/(?:json|ld\+json)/i;

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
  // scripts: hashed (real XSS protection). styles: 'unsafe-inline' — CSP hashes
  // do NOT cover inline style="" ATTRIBUTES (only <style> elements), and this
  // site uses inline style attributes throughout, so a hashed style-src blocks
  // them and breaks layout (e.g. style="display:none"). 'unsafe-inline' for
  // styles is the standard, low-risk concession on a static site; script-src
  // stays locked down. (styles arg kept for the firebase.json aggregate only.)
  void styles;
  return [
    "default-src 'self'",
    `script-src 'self' ${Array.from(scripts).sort().join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline'",
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

// Scoped CSP for the Sveltia CMS admin (dist/admin). The bundle is self-hosted
// (script-src 'self'; 'wasm-unsafe-eval' for its WASM, NOT full unsafe-eval),
// so this caps the blast radius even if the site were otherwise compromised:
// the admin page — which holds the GitHub token — can only talk to GitHub.
// connect-src is locked to GitHub (REST/GraphQL/raw/OAuth); add your auth
// Worker origin here if you wire up OAuth (Option C). img-src allows GitHub
// avatars + the content-image hosts so entry previews render.
const ADMIN_CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://avatars.githubusercontent.com https://*.githubusercontent.com https://covers.openlibrary.org https://*.ltrbxd.com https://image.tmdb.org https://server.arcgisonline.com https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://images.unsplash.com",
  "connect-src 'self' https://api.github.com https://*.githubusercontent.com https://github.com",
  "font-src 'self' data:",
  "frame-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');
const ADMIN_DIR = path.join(DIST, 'admin') + path.sep;
let injected = 0;
for (const [file, { html, scripts, styles }] of fileHashes) {
  const policy = file.startsWith(ADMIN_DIR) ? ADMIN_CSP : buildPolicy(scripts, styles);
  const meta = `<meta http-equiv="Content-Security-Policy" content="${policy}">`;
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
