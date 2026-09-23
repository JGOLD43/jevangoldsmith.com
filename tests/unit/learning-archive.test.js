const test = require('node:test');
const assert = require('node:assert/strict');
const archive = require('../../data/learning-archive.json');
const additions = require('../../data/library-additions.json');
const curation = require('../../data/library-collections.json');
const corrections = require('../../data/library-material-corrections.json');

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

test('every saved material has a specific, traceable problem classification and valid starting points', () => {
  const materials = [...archive.items, ...additions];
  const ids = materials.map(({ id }) => id).sort();
  assert.deepEqual(Object.keys(curation.items).sort(), ids, 'New material must be classified; removed IDs must not leave orphan reviews');
  const collections = new Set(curation.collections.map(({ id }) => id));
  assert.equal(collections.size, curation.collections.length);
  assert.equal(collections.size, 20);
  const reasons = new Set();
  for (const [id, review] of Object.entries(curation.items)) {
    assert.ok(review.collections.length >= 1 && review.collections.length <= 3, id);
    assert.equal(new Set(review.collections).size, review.collections.length, id);
    review.collections.forEach((collection) => assert.ok(collections.has(collection), `${id}: ${collection}`));
    assert.ok(review.why.length > 60, `${id}: meaningful explanation required`);
    assert.ok(!reasons.has(review.why), `${id}: avoid generic repeated explanations`);
    reasons.add(review.why);
    assert.ok(['guide', 'perspective', 'case-study', 'cautionary-story', 'creative-work', 'reference'].includes(review.role));
    assert.match(review.evidence.url, /^https?:\/\//);
    assert.ok(review.evidence.basis);
    assert.equal(typeof review.provisional, 'boolean');
    if (review.provisional) assert.match(review.evidence.basis, /provisional/);
    assert.ok(!Object.hasOwn(review, 'rating') && !Object.hasOwn(review, 'read'));
  }
  for (const collection of curation.collections) {
    assert.ok(collection.description && collection.group);
    assert.equal(collection.starters.length, 3);
    assert.equal(new Set(collection.starters).size, 3);
    for (const id of collection.starters) {
      assert.ok(curation.items[id]?.collections.includes(collection.id), `${collection.id}: starter must belong to collection`);
      assert.equal(curation.items[id].provisional, false, `${collection.id}: do not lead with an uncertain placement`);
    }
  }
});

test('reviewed source corrections preserve identities and distinguish a fictional film from documentaries', () => {
  const ids = new Set(archive.items.map(({ id }) => id));
  for (const [id, correction] of Object.entries(corrections)) {
    assert.ok(ids.has(id));
    assert.ok(!Object.hasOwn(correction, 'id'));
  }
  const corrected = archive.items.map((item) => ({ ...item, ...corrections[item.id] }));
  assert.equal(new Set(corrected.map(({ url }) => url)).size, corrected.length);
  for (const item of corrected) assert.ok(!item.url.match(/(https?:\/\/[^ ]+)\1/));
  assert.equal(corrected.find(({ title }) => title === 'Thank You for Smoking').kind, 'video');
  const competition = corrected.find(({ title }) => title === 'Competition is for losers');
  assert.equal(competition.kind, 'article');
  assert.equal(competition.medium, 'Written');
  assert.equal(competition.duration, null);
  assert.ok(corrected.some(({ url }) => url === 'https://www.vitsoe.com/us/about/good-design'));
});

test('import keeps current additions, the last entry, and written/video interview distinctions', () => {
  assert.ok(archive.items.some((item) => item.url === 'https://www.paulgraham.com/vb.html'));
  assert.match(archive.items.at(-1).title, /Thank You For Smoking/);
  assert.ok(archive.items.some((item) => item.kind === 'interview' && item.medium === 'Written'));
  assert.ok(archive.items.some((item) => item.kind === 'interview' && item.medium === 'Video'));
  assert.equal(archive.source.updated, '22 September 2026');
  assert.equal(archive.source.curator, 'The Unintuitive');
});
