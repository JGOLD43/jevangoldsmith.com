'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { escapeHtml, syncInbox, validateEnvelope } = require('../../scripts/sync-jgold-publications');

function envelope(overrides = {}) {
  return {
    schemaVersion: 1,
    jobId: 'job-123',
    createdAt: '2026-08-25T00:00:00.000Z',
    client: 'jgold-android',
    manifest: {
      version: 1,
      id: 'draft-123',
      type: 'essay',
      title: 'Safe title',
      summary: 'Public summary',
      body: 'First paragraph.\n\nSecond <script>alert(1)</script>.',
      sourceId: null,
      operation: 'create',
    },
    ...overrides,
  };
}

test('publication envelope rejects unknown fields and private-shaped content', () => {
  assert.throws(() => validateEnvelope({ ...envelope(), vaultItems: [{ amount: 100 }] }), /unexpected or missing fields/);
  assert.throws(() => validateEnvelope({ ...envelope(), manifest: { ...envelope().manifest, highlights: ['private'] } }), /unexpected or missing fields/);
});

test('HTML from the phone is escaped before website rendering', () => {
  assert.equal(escapeHtml('<script>"x" & y</script>'), '&lt;script&gt;&quot;x&quot; &amp; y&lt;/script&gt;');
});

test('Now updates validate and move the public map location', () => {
  const nowEnvelope = envelope({
    manifest: {
      ...envelope().manifest,
      type: 'now',
      title: 'Working from the coast',
      body: 'Shipping the new Now page.',
      nowLocation: { label: 'Burleigh Heads, QLD', lat: -28.091, lng: 153.45, zoom: 10 },
    },
  });
  assert.deepEqual(validateEnvelope(nowEnvelope).manifest.nowLocation, {
    label: 'Burleigh Heads, QLD', lat: -28.091, lng: 153.45, zoom: 10,
  });
  assert.throws(() => validateEnvelope({
    ...nowEnvelope,
    manifest: { ...nowEnvelope.manifest, nowLocation: { ...nowEnvelope.manifest.nowLocation, lat: 120 } },
  }), /lat is invalid/);

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jgold-now-sync-'));
  const inbox = path.join(root, 'inbox');
  fs.mkdirSync(path.join(root, 'data'));
  fs.mkdirSync(inbox);
  fs.writeFileSync(path.join(root, 'data', 'now.json'), JSON.stringify({ lastUpdated: '', location: {}, sections: [] }));
  fs.writeFileSync(path.join(inbox, 'job-123.json'), JSON.stringify(nowEnvelope));
  assert.deepEqual(syncInbox({ inboxPath: inbox, root }), { accepted: 1, rejected: 0, skipped: 0 });
  const published = JSON.parse(fs.readFileSync(path.join(root, 'data', 'now.json')));
  assert.equal(published.location.label, 'Burleigh Heads, QLD');
  assert.equal(published.lastUpdated, 'August 25, 2026');
});

test('sync is idempotent and never executes inbox code', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jgold-sync-'));
  const inbox = path.join(root, 'inbox');
  fs.mkdirSync(path.join(root, 'data'));
  fs.mkdirSync(inbox);
  fs.writeFileSync(path.join(root, 'data', 'essays.json'), '{"essays":[],"lastUpdated":""}\n');
  fs.writeFileSync(path.join(inbox, 'job-123.json'), JSON.stringify(envelope()));
  fs.writeFileSync(path.join(inbox, 'malicious.js'), 'throw new Error("must never run")');
  const first = syncInbox({ inboxPath: inbox, root });
  const second = syncInbox({ inboxPath: inbox, root });
  assert.deepEqual(first, { accepted: 1, rejected: 0, skipped: 0 });
  assert.deepEqual(second, { accepted: 0, rejected: 0, skipped: 1 });
  const essays = JSON.parse(fs.readFileSync(path.join(root, 'data', 'essays.json'))).essays;
  assert.equal(essays.length, 1);
  assert.match(essays[0].content, /&lt;script&gt;/);
  assert.doesNotMatch(essays[0].content, /<script>/);
});
