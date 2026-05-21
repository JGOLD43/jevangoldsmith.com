const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'slugify-cases.json'), 'utf8')
);

const cjs = require('../../scripts/_lib/slugify');

// CJS slugify (scripts/_lib/slugify.js) must match the fixture.
test('CJS slugify produces fixture output for every case', () => {
  for (const { input, expected } of fixture) {
    assert.equal(cjs.slugify(input), expected, `slugify(${JSON.stringify(input)})`);
  }
});

// TS slugify (site-astro/src/lib/slug.ts) must produce the SAME output as
// the CJS impl for every fixture case. This locks the contract so a
// divergence between Node-context (scripts) and Astro-context (site-astro)
// can't silently break person IDs, book slugs, or detail-page routes.
//
// Requires Node 22+ (--experimental-strip-types is on by default in 24+).
test('TS slugify (site-astro/src/lib/slug.ts) matches CJS slugify byte-for-byte', async () => {
  const tsModulePath = path.join(__dirname, '..', '..', 'site-astro', 'src', 'lib', 'slug.ts');
  const ts = await import(tsModulePath);
  for (const { input, expected } of fixture) {
    const tsOutput = ts.slugify(input);
    const cjsOutput = cjs.slugify(input);
    assert.equal(tsOutput, cjsOutput, `slugify(${JSON.stringify(input)}): TS=${tsOutput} CJS=${cjsOutput}`);
    assert.equal(tsOutput, expected, `TS slugify(${JSON.stringify(input)}) drifted from fixture`);
  }
});
