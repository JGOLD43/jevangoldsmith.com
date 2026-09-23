const test = require('node:test');
const assert = require('node:assert/strict');
const guideData = require('../../data/library-guides.json');
const curation = require('../../data/library-collections.json');
const archive = require('../../data/learning-archive.json');
const additions = require('../../data/library-additions.json');

test('each problem collection has an authored route through five reviewed members', () => {
  const ids = curation.collections.map(({ id }) => id).sort();
  assert.deepEqual(guideData.guides.map(({ collectionId }) => collectionId).sort(), ids);
  const materials = new Set([...archive.items, ...additions].map(({ id }) => id));
  const explanations = new Set();
  const prompts = new Set();
  for (const guide of guideData.guides) {
    assert.ok(guide.intro.length > 150, guide.collectionId);
    assert.ok(guide.outcome.length > 50, guide.collectionId);
    assert.ok(guide.finish.length > 150, guide.collectionId);
    assert.equal(guide.steps.length, 5);
    assert.equal(new Set(guide.steps.map(({ itemId }) => itemId)).size, 5);
    for (const step of guide.steps) {
      assert.ok(materials.has(step.itemId), step.itemId);
      const review = curation.items[step.itemId];
      assert.ok(review.collections.includes(guide.collectionId), `${step.itemId} belongs to ${guide.collectionId}`);
      assert.equal(review.provisional, false, 'Do not lead readers through a source with an uncertain classification');
      assert.ok(step.heading.length > 10);
      assert.ok(step.why.length > 120);
      assert.ok(step.tryThis.length > 80);
      assert.ok(!explanations.has(step.why), 'Each placement needs a reason specific to its route');
      assert.ok(!prompts.has(step.tryThis), 'Practice prompts should be individually written');
      explanations.add(step.why);
      prompts.add(step.tryThis);
    }
  }
  assert.match(guideData.editorialNote, /haven’t read or watched everything/);
});
