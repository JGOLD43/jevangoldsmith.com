const test = require('node:test');
const assert = require('node:assert/strict');
const load = () => import('../../site-astro/src/lib/library-time.ts');

test('durations preserve hours and minutes and do not treat missing values as zero', async () => {
  const { parseDuration, formatConsumptionTime } = await load();
  assert.equal(parseDuration('1 hr 30 min'), 90);
  assert.equal(parseDuration('1.5 hours'), 90);
  assert.equal(parseDuration('45 min'), 45);
  assert.equal(parseDuration('01:30:00'), 90);
  assert.equal(parseDuration('03:30'), 4);
  assert.equal(parseDuration(null), null);
  assert.equal(parseDuration('unknown'), null);
  assert.equal(formatConsumptionTime(0), '0 min');
  assert.equal(formatConsumptionTime(90), '1 hr 30 min');
  assert.equal(formatConsumptionTime(600), '10 hr');
});

test('estimates use supplied length, disclose fallback assumptions, and scope open resources', async () => {
  const { consumptionTime } = await load();
  const recorded = consumptionTime({ kind: 'video', title: 'A talk', duration: '12 min' });
  assert.equal(recorded.minutes, 12);
  assert.equal(recorded.provisional, false);
  assert.equal(consumptionTime({ kind: 'book', title: 'A book', pages: 320 }).minutes, 385);
  assert.equal(consumptionTime({ kind: 'article', title: 'Essay', wordCount: 900 }).minutes, 4);
  for (const kind of ['book', 'article', 'art', 'video', 'interview', 'documentary', 'memo', 'other']) {
    const time = consumptionTime({ kind, title: 'No recorded length' });
    assert.ok(time.minutes > 0);
    assert.equal(time.provisional, true);
    assert.ok(time.basis.length > 30);
  }
  assert.equal(consumptionTime({ kind: 'memo', title: 'Bessemer (collection)' }).scope, 'first-visit');
  assert.ok(consumptionTime({ kind: 'documentary', title: 'Civilisation Series' }).minutes > 90);
});

test('category totals sum the filtered content once and handle empty categories', async () => {
  const { totalConsumptionTime } = await load();
  assert.equal(totalConsumptionTime([]), 0);
  const a = { id: 'a', consumptionMinutes: 60 };
  const b = { id: 'b', consumptionMinutes: 15 };
  assert.equal(totalConsumptionTime([a,b,a]), 75);
  assert.equal(totalConsumptionTime([b]), 15);
});

test('every corrected catalogue item receives a finite consumption estimate', async () => {
  const { consumptionTime } = await load();
  const archive = require('../../data/learning-archive.json').items;
  const additions = require('../../data/library-additions.json');
  const corrections = require('../../data/library-material-corrections.json');
  for (const raw of [...archive, ...additions]) {
    const item = { ...raw, ...corrections[raw.id] };
    const time = consumptionTime(item);
    assert.ok(Number.isFinite(time.minutes) && time.minutes > 0, item.id);
  }
  const editions = require('../../data/book-reading-lengths.json');
  for (const [isbn, entry] of Object.entries(editions)) {
    assert.match(isbn, /^\d{10,13}$/);
    assert.ok(Number.isInteger(entry.pages) && entry.pages > 0);
    assert.match(entry.source, /^https:\/\/openlibrary.org\/books\//);
  }
});
