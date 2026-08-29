import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  canPublish,
  createAiContext,
  createBookPublishManifest,
  createPublicDraftFromVault,
  createPublishManifest,
} from '../src/domain/privacy.ts';

const privateFinance = {
  id: 'private-1',
  kind: 'finance',
  title: 'Private account',
  body: 'Account number 1234',
  amount: 4200,
  attachmentUri: 'file:///private/receipt.vault',
  createdAt: '2026-08-23T00:00:00.000Z',
  updatedAt: '2026-08-23T00:00:00.000Z',
};

const publicDraft = {
  id: 'draft-1',
  type: 'essay',
  title: 'A public idea',
  summary: 'Safe summary',
  body: 'Safe public body',
  sourceId: null,
  operation: 'create',
  status: 'draft',
  createdAt: '2026-08-23T00:00:00.000Z',
  updatedAt: '2026-08-23T00:00:00.000Z',
};

test('cloud services cannot read encrypted learning evidence', () => {
  const aiService = readFileSync(new URL('../src/services/ai.ts', import.meta.url), 'utf8');
  const publishingService = readFileSync(new URL('../src/services/publishing.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(aiService, /learning-repository|learning_attempts|learning_sessions/);
  assert.doesNotMatch(publishingService, /learning-repository|learning_attempts|learning_sessions/);
});

test('finance records produce an empty public body', () => {
  const copy = createPublicDraftFromVault(privateFinance);
  assert.equal(copy.body, '');
  assert.equal('amount' in copy, false);
  assert.equal('attachmentUri' in copy, false);
});

test('general AI context contains only the typed prompt', () => {
  assert.deepEqual(createAiContext('Plan a public essay'), {
    source: 'general',
    content: 'Plan a public essay',
  });
});

test('draft AI context contains the selected public draft', () => {
  const context = createAiContext('Improve this', publicDraft);
  assert.equal(context.source, 'public-draft');
  assert.match(context.content, /Safe public body/);
  assert.doesNotMatch(context.content, /Account number/);
});

test('publish manifest contains only public schema fields', () => {
  const manifest = createPublishManifest(publicDraft);
  assert.deepEqual(Object.keys(manifest), ['version', 'id', 'type', 'title', 'summary', 'body', 'sourceId', 'operation']);
  assert.equal(canPublish(publicDraft), true);
  assert.equal(canPublish({ ...publicDraft, body: ' ' }), false);
});

test('book publishing cannot include files, progress, highlights, or private notes', () => {
  const manifest = createBookPublishManifest('book-1', null, {
    title: 'Public title', author: 'Public author', isbn: '123', year: '2026', rating: 5,
    reReads: 1, category: 'Ideas', summary: 'Public summary', review: 'Public review', read: true,
  });
  assert.deepEqual(Object.keys(manifest), ['version', 'id', 'type', 'sourceId', 'operation', 'book']);
  assert.deepEqual(Object.keys(manifest.book), ['title', 'author', 'isbn', 'year', 'rating', 'reReads', 'category', 'summary', 'review', 'read']);
  const serialized = JSON.stringify(manifest);
  assert.doesNotMatch(serialized, /file|progress|locator|highlight|annotation|note|collection/i);
});
