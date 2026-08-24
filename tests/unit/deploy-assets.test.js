const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '../..');

test('production keeps the full stylesheet as a safe deploy fallback', () => {
  const pruneScript = fs.readFileSync(path.join(ROOT, 'scripts/prune-dist-assets.js'), 'utf8');
  assert.doesNotMatch(pruneScript, /^\s*['"]css\/legacy-style\.css['"],?\s*$/m);
});

test('live verification checks stylesheets referenced by every core page', () => {
  const liveCheck = fs.readFileSync(path.join(ROOT, 'scripts/check-live.js'), 'utf8');
  assert.match(liveCheck, /stylesheet\\b/);
  assert.match(liveCheck, /stylesheet .* returned HTTP/);
});
