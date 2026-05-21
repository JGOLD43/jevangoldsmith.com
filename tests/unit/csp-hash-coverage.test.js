const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

// Lock the contract: scripts/update-csp-hashes.js must hash every inline
// <script> tag in dist HTML. Astro emits <script is:inline> as plain
// <script> tags, so the regex needs to match those too. If this test
// fails, the theme guard in Base.astro will lose its CSP hash on the
// next build and the page may not load under a strict CSP.

// Mirror of the regex used in scripts/update-csp-hashes.js:27
const SCRIPT_RE = /<script\b(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi;
const NON_EXECUTABLE_TYPES = /(?:application\/(?:json|ld\+json)|speculationrules|importmap)/i;

function hashesIn(html) {
  const out = [];
  for (const m of html.matchAll(SCRIPT_RE)) {
    const attrs = m[1] || '';
    const body = m[2];
    if (!body.trim()) continue;
    const typeMatch = attrs.match(/\btype=["']([^"']+)["']/i);
    if (typeMatch && NON_EXECUTABLE_TYPES.test(typeMatch[1])) continue;
    out.push(crypto.createHash('sha256').update(body.trim()).digest('base64'));
  }
  return out;
}

test('inline <script> (no attrs) is hashed', () => {
  const html = `<script>console.log('hi');</script>`;
  assert.equal(hashesIn(html).length, 1);
});

test('inline <script is:inline> (Astro-emitted) is hashed', () => {
  // Astro compiles `is:inline` to a plain <script> tag in dist; the
  // is:inline attribute is consumed at build time.
  const html = `<script>const t = localStorage.getItem('jg-theme');</script>`;
  assert.equal(hashesIn(html).length, 1);
});

test('<script src="..."> is NOT hashed (external)', () => {
  const html = `<script src="/foo.js"></script>`;
  assert.equal(hashesIn(html).length, 0);
});

test('application/json data scripts are NOT hashed', () => {
  const html = `<script type="application/json">{"a":1}</script>`;
  assert.equal(hashesIn(html).length, 0);
});

test('application/ld+json structured data is NOT hashed', () => {
  const html = `<script type="application/ld+json">{}</script>`;
  assert.equal(hashesIn(html).length, 0);
});

test('speculationrules is NOT hashed', () => {
  const html = `<script type="speculationrules">{}</script>`;
  assert.equal(hashesIn(html).length, 0);
});

test('empty inline script is skipped', () => {
  const html = `<script></script>`;
  assert.equal(hashesIn(html).length, 0);
});

test('theme guard pattern produces stable hash', () => {
  const body = `
        try {
          const t = localStorage.getItem('jg-theme')
            || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
          document.documentElement.setAttribute('data-theme', t);
        } catch (_) {}
  `;
  const html = `<script>${body}</script>`;
  const hashes = hashesIn(html);
  assert.equal(hashes.length, 1);
  // Hash same content twice → same hash
  assert.equal(hashesIn(html)[0], hashes[0]);
});
