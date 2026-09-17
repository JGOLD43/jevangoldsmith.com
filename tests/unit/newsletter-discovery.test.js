const { test } = require('node:test');
const assert = require('node:assert/strict');
const { refreshAuthoredRecords } = require('../../scripts/sync-search-index');

test('newsletter discovery refreshes renamed projects and excludes private projects', () => {
  const records = [{ type: 'projects', id: 'monthly', title: 'Weekly-ish' }, { type: 'books', id: 'book' }];
  const newsletter = { name: 'Monthly Updates', description: 'Project updates once a month.' };
  const result = refreshAuthoredRecords(records, [
    { id: 'monthly', title: 'Monthly Updates', status: 'active' },
    { id: 'private', title: 'Private project', visibility: 'private' },
    { id: 'draft', title: 'Draft project', status: 'draft' }
  ], [], newsletter);
  assert.equal(result.filter((item) => item.type === 'projects').length, 1);
  assert.equal(result.find((item) => item.type === 'projects').title, 'Monthly Updates');
  assert.equal(result.find((item) => item.type === 'projects').url, 'https://jevangoldsmith.com/projects/monthly.html');
  assert.equal(result.find((item) => item.type === 'newsletter').url, 'https://jevangoldsmith.com/newsletter.html');
  assert.ok(result.some((item) => item.id === 'book'));
});

test('new stories are discoverable and repeat generation is stable', () => {
  const pages = [{ path: 'updates/story.html', url: '/updates/story.html', title: 'A project story', index: true }, { path: 'private.html', index: false }];
  const newsletter = { name: 'Monthly Updates', description: 'Project updates.' };
  const first = refreshAuthoredRecords([], [], pages, newsletter);
  assert.equal(first.filter((item) => item.type === 'page').length, 1);
  assert.equal(first[0].url, 'https://jevangoldsmith.com/updates/story.html');
  assert.deepEqual(refreshAuthoredRecords(first, [], pages, newsletter), first);
});
