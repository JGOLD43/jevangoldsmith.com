import assert from 'node:assert/strict';
import test from 'node:test';
import { canPublish, createAiContext, createPublishManifest } from '../src/domain/privacy.ts';
import { writeDocument, legacyDocument, renderDocument, bodyText } from '../src/domain/studio-document.cjs';

const draft = { id: 'draft-1', type: 'essay', title: 'Starting a business', summary: '', sourceId: null, operation: 'create', nowLocation: null };

test('existing website photos and paragraphs remain ordered when opened for editing', () => {
  const document = legacyDocument('<h2>First</h2><p>Words &amp; ideas.</p><img src="/images/trip.jpg" alt="My trip"><p>After the photo.</p>');
  assert.deepEqual(document.blocks.map((block) => block.type), ['text', 'text', 'image', 'text']);
  assert.equal(document.blocks[0].style, 'heading');
  assert.equal(document.blocks[1].text, 'Words & ideas.');
  assert.equal(document.blocks[2].src, '/images/trip.jpg');
  assert.match(renderDocument(document), /src="\/images\/trip.jpg"/);
  assert.doesNotMatch(bodyText(writeDocument(document)), /JGOLD-DOCUMENT/);
});

test('empty rich documents cannot be published', () => {
  assert.equal(canPublish({ ...draft, body: writeDocument({ version: 1, blocks: [] }) }), false);
  assert.equal(canPublish({ ...draft, body: writeDocument({ version: 1, blocks: [{ type: 'text', font: 'serif', style: 'heading', text: '   ' }] }) }), false);
});

test('rich public manifests carry formatting while AI context excludes media file paths', () => {
  const document = { version: 1, blocks: [{ type: 'text', font: 'serif', style: 'paragraph', text: 'My first business.' }, { type: 'image', src: 'file:///studio-media/photo.jpg', caption: 'An idea' }] };
  const input = { ...draft, body: writeDocument(document) };
  const manifest = createPublishManifest(input);
  assert.equal(manifest.body, 'My first business.\n\nAn idea');
  assert.deepEqual(manifest.document, document);
  assert.equal(canPublish(input), true);
  assert.doesNotMatch(JSON.stringify(createAiContext('Help me edit', input)), /file:\/\/\/|studio-media/);
});
