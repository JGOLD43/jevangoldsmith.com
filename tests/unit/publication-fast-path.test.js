'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { isPublicationOnly } = require('../../scripts/publication-fast-path');

test('Now, text collections, and approved media qualify for focused checks', () => {
  assert.equal(isPublicationOnly(['data/now.json', 'data/now-history.json', '.jgold-publication-state.json', 'images/now-map.jpg', 'images/now-map.jpg.meta', 'images/now-archive/previous.jpg']), true);
  assert.equal(isPublicationOnly(['data/essays.json', `site-astro/public/media/studio/${'a'.repeat(64)}.mp4`]), true);
});
test('code, configuration, workflows, and unexpected media always require full checks', () => {
  for (const file of ['scripts/build.js', '.github/workflows/test.yml', 'package.json', 'data/people.json', 'images/unknown.jpg', 'site-astro/public/media/studio/script.js', 'site-astro/src/pages/now.astro']) {
    assert.equal(isPublicationOnly(['data/now.json', file]), false, file);
  }
  assert.equal(isPublicationOnly([]), false);
});
