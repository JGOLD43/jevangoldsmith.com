'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

test('production deployment stays GitHub Pages and Expo Android only', () => {
  for (const obsolete of ['firebase.json', '.firebaserc', 'firestore.rules', 'firestore.indexes.json']) {
    assert.equal(fs.existsSync(path.join(ROOT, obsolete)), false, `${obsolete} must not be reintroduced`);
  }
  assert.match(read('.github/workflows/deploy-pages.yml'), /actions\/deploy-pages/);
  assert.match(read('AGENTS.md'), /hosted only by GitHub Pages/);
  assert.match(read('scripts/release-jgold-app.js'), /'--platform', 'android'/);
  assert.doesNotMatch(read('package.json'), /firebase/i);
});
