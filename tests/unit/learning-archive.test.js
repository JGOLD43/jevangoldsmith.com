const test = require('node:test');
const assert = require('node:assert/strict');
const archive = require('../../data/learning-archive.json');

test('the imported archive includes all three source sections without duplicate links', () => {
  assert.equal(archive.items.length, 233);
  assert.equal(new Set(archive.items.map((item) => item.id)).size, 233);
  assert.equal(new Set(archive.items.map((item) => item.url)).size, 233);
  assert.deepEqual([...new Set(archive.items.map((item) => item.sourceSection))], ['Written content', 'Video content', 'Documentaries']);
  for (const item of archive.items) {
    assert.match(item.url, /^https?:\/\//);
    assert.ok(item.title.trim());
    assert.ok(item.topic);
    assert.ok(['article', 'art', 'video', 'interview', 'documentary', 'memo', 'other'].includes(item.kind));
    assert.ok(!Object.hasOwn(item, 'rating') && !Object.hasOwn(item, 'read'), 'Imported items must not imply a personal rating or completed reading');
  }
});

test('import keeps current additions, the last entry, and written/video interview distinctions', () => {
  assert.ok(archive.items.some((item) => item.url === 'https://www.paulgraham.com/vb.html'));
  assert.match(archive.items.at(-1).title, /Thank You For Smoking/);
  assert.ok(archive.items.some((item) => item.kind === 'interview' && item.medium === 'Written'));
  assert.ok(archive.items.some((item) => item.kind === 'interview' && item.medium === 'Video'));
  assert.equal(archive.source.updated, '22 September 2026');
  assert.equal(archive.source.curator, 'The Unintuitive');
});
