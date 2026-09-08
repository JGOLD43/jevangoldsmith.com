'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { escapeHtml, syncInbox, validateEnvelope } = require('../../scripts/sync-jgold-publications');
const { buildStudioApi } = require('../../scripts/lib/studio-api');
const { readDocument, renderDocument, validateDocument } = require('../../private-companion-app/src/domain/studio-document.cjs');
const crypto = require('node:crypto');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jgold-studio-'));
  fs.mkdirSync(path.join(root, 'data'));
  fs.mkdirSync(path.join(root, 'inbox', 'submissions'), { recursive: true });
  fs.mkdirSync(path.join(root, 'inbox', 'media'));
  for (const [file, key] of Object.entries({ essays: 'essays', adventures: 'adventures', projects: 'projects', challenges: 'challenges', products: 'products', quotes: 'fullQuotes' })) {
    fs.writeFileSync(path.join(root, 'data', `${file}.json`), JSON.stringify({ [key]: [] }));
  }
  fs.writeFileSync(path.join(root, 'data', 'now.json'), JSON.stringify({ lastUpdated: 'August 25, 2026', location: { label: 'Old place', lat: 1, lng: 2, zoom: 10 }, sections: [{ title: 'Previous', body: '<p>Keep me</p>' }] }));
  return { root, inboxPath: path.join(root, 'inbox', 'submissions') };
}

test('Studio reads current source data and excludes unpublished and private entries', () => {
  const options = fixture();
  fs.writeFileSync(path.join(options.root, 'data', 'projects.json'), JSON.stringify({ projects: [
    { id: 'current', title: 'Current website project', status: 'active' },
    { id: 'old', title: 'Unpublished placeholder', status: 'draft' },
    { id: 'private', title: 'Private', status: 'active', visibility: 'private' },
  ] }));
  syncInbox(options);
  const api = buildStudioApi(options.root);
  assert.deepEqual(api.collections.project.map((item) => item.id), ['current']);
  assert.equal(api.collections.now[0].nowLocation.label, 'Old place');
  assert.match(api.collections.now[0].content, /Keep me/);
});

test('formatted text and media survive publication and re-editing, without executable HTML', () => {
  const options = fixture();
  const bytes = Buffer.from([137,80,78,71,13,10,26,10,0]);
  const name = `${crypto.createHash('sha256').update(bytes).digest('hex')}.png`;
  fs.writeFileSync(path.join(options.root, 'inbox', 'media', name), bytes);
  const document = { version: 1, blocks: [
    { type: 'text', style: 'heading', font: 'serif', text: '<script>alert(1)</script>' },
    { type: 'image', src: `/media/studio/${name}`, caption: 'A "photo"' },
    { type: 'text', style: 'quote', font: 'mono', text: 'Final thought' },
  ] };
  const submission = envelope({ manifest: { ...envelope().manifest, document } });
  fs.writeFileSync(path.join(options.inboxPath, 'job-123.json'), JSON.stringify(submission));
  assert.deepEqual(syncInbox(options), { accepted: 1, rejected: 0, skipped: 0 });
  const api = buildStudioApi(options.root);
  assert.deepEqual(readDocument(api.collections.essay[0].content), document);
  assert.equal(api.receipts['job-123'].status, 'accepted');
  assert.deepEqual(fs.readFileSync(path.join(options.root, 'site-astro/public/media/studio', name)), bytes);
  const html = renderDocument(document);
  assert.match(html, /font-family:Georgia/);
  assert.match(html, /font-family:monospace/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test('Studio rejects unsafe URLs, local files, traversal, extra fields and CSS injection', () => {
  for (const src of ['file:///private/book.pdf', 'javascript:alert(1)', 'http://external.example/x.png', '/media/studio/../../secret']) {
    assert.throws(() => validateDocument({ version: 1, blocks: [{ type: 'image', src, caption: '' }] }));
  }
  assert.throws(() => validateDocument({ version: 1, blocks: [{ type: 'text', text: 'x', font: 'serif;color:red', style: 'paragraph' }] }));
  assert.throws(() => validateDocument({ version: 1, blocks: [], privateNotes: 'no' }));
});

test('missing media yields a readable rejected receipt and does not change live content', () => {
  const options = fixture();
  const document = { version: 1, blocks: [{ type: 'video', src: `/media/studio/${'a'.repeat(64)}.mp4`, caption: 'Video' }] };
  fs.writeFileSync(path.join(options.inboxPath, 'job-123.json'), JSON.stringify(envelope({ manifest: { ...envelope().manifest, document } })));
  assert.deepEqual(syncInbox(options), { accepted: 0, rejected: 1, skipped: 0 });
  const api = buildStudioApi(options.root);
  assert.equal(api.collections.essay.length, 0);
  assert.equal(api.receipts['job-123'].status, 'rejected');
  assert.match(api.receipts['job-123'].reason, /media file is missing/);
});

test('Now replacement preserves the previous same-day text and location', () => {
  const options = fixture();
  const submission = envelope({ manifest: { ...envelope().manifest, type: 'now', nowLocation: { label: 'New place', lat: -20, lng: 140, zoom: 8 } } });
  fs.writeFileSync(path.join(options.inboxPath, 'job-123.json'), JSON.stringify(submission));
  syncInbox(options);
  const history = JSON.parse(fs.readFileSync(path.join(options.root, 'data/now-history.json')));
  assert.equal(history[0].location.label, 'Old place');
  assert.equal(history[0].sections[0].body, '<p>Keep me</p>');
  const current = JSON.parse(fs.readFileSync(path.join(options.root, 'data/now.json')));
  assert.equal(current.location.label, 'New place');
});

test('editing a deleted item cannot resurrect a stale placeholder', () => {
  const options = fixture();
  const submission = envelope({ manifest: { ...envelope().manifest, sourceId: 'deleted', operation: 'update' } });
  fs.writeFileSync(path.join(options.inboxPath, 'job-123.json'), JSON.stringify(submission));
  assert.equal(syncInbox(options).rejected, 1);
  assert.equal(buildStudioApi(options.root).collections.essay.length, 0);
});

test('multiple edits in one batch are applied in chronological order', () => {
  const options = fixture();
  for (const [name, createdAt, body, operation] of [
    ['z-first', '2026-08-25T00:00:00Z', 'Earlier', 'create'],
    ['a-last', '2026-08-25T00:01:00Z', 'Latest', 'update'],
  ]) {
    fs.writeFileSync(path.join(options.inboxPath, `${name}.json`), JSON.stringify(envelope({ jobId: name, createdAt, manifest: { ...envelope().manifest, sourceId: 'same-story', operation, body } })));
  }
  assert.equal(syncInbox(options).accepted, 2);
  assert.equal(buildStudioApi(options.root).collections.essay[0].content, 'Latest');
});

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

test('publication commit stages Now images through their tracked paths, not public symlinks', () => {
  const { execFileSync } = require('node:child_process');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jgold-stage-'));
  try {
    fs.mkdirSync(path.join(root, 'data'));
    fs.mkdirSync(path.join(root, 'images', 'now-archive'), { recursive: true });
    fs.mkdirSync(path.join(root, 'site-astro', 'public'), { recursive: true });
    fs.symlinkSync('../../images', path.join(root, 'site-astro', 'public', 'images'));
    for (const file of ['data/now.json', '.jgold-publication-state.json', 'images/now-map.jpg', 'images/now-map.jpg.meta', 'images/now-archive/previous.jpg']) fs.writeFileSync(path.join(root, file), 'fixture');
    execFileSync('git', ['init', '-q', root]);
    const workflow = fs.readFileSync(path.join(__dirname, '../../.github/workflows/jgold-publish-sync.yml'), 'utf8');
    const stageLines = workflow.split('\n').filter((line) => line.trim().startsWith('git add ') || line.includes('then git add'));
    execFileSync('bash', ['-e', '-c', stageLines.join('\n')], { cwd: root });
    const staged = execFileSync('git', ['diff', '--cached', '--name-only'], { cwd: root, encoding: 'utf8' });
    assert.match(staged, /images\/now-map.jpg.meta/);
    assert.match(staged, /images\/now-archive\/previous.jpg/);
    assert.match(staged, /data\/now.json/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
