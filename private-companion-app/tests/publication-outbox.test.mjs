import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';
import { publicationPageUrl } from '../src/services/site-navigation.ts';

// Exercise the production service with an in-memory DB and network boundary;
// native Expo modules are unavailable in Node's test runner.
function outbox({ status = 'queued', connected = true, receipt, fail = false } = {}) {
  let job = { id: 'job', localId: 'draft', itemType: 'essay', status, error: '', manifestJson: JSON.stringify({ type: 'essay', id: 'draft', title: 'Starting a business' }) };
  let submissions = 0;
  const dependencies = {
    publicationPageUrl,
    listPublicationJobs: async () => [job],
    queuePublicationJob: async () => job,
    updatePublicationJob: async (id, next, options) => (job = { ...job, status: next, error: options.error || '' }),
    hasPublishingConnection: async () => connected,
    publicationJobId: async () => 'receipt',
    loadStudioSnapshot: async () => ({ receipts: receipt ? { receipt } : {} }),
    publishManifest: async () => { submissions++; if (fail) throw new Error('Token expired'); return { commitUrl: 'inbox' }; },
  };
  const code = stripTypeScriptTypes(readFileSync(new URL('../src/services/publication-outbox.ts', import.meta.url), 'utf8'))
    .replace(/^import .*;$/gm, '').replace(/^export /gm, '');
  const service = new Function(...Object.keys(dependencies), `${code}\nreturn { refreshPublicationJobs, retryPendingPublications };`)(...Object.values(dependencies));
  return { ...service, submissions: () => submissions };
}

test('offline approved drafts explain the missing publishing connection', async () => {
  const service = outbox({ connected: false });
  const [job] = await service.refreshPublicationJobs();
  assert.equal(job.status, 'queued');
  assert.match(job.error, /Settings/);
  assert.equal(service.submissions(), 0);
});

test('inbox submission is not mistaken for a live website publication', async () => {
  const service = outbox();
  const [job] = await service.refreshPublicationJobs();
  assert.equal(job.status, 'submitted');
  assert.notEqual(job.delivery, 'live');
  assert.equal(service.submissions(), 1);
});

test('only a deployed receipt confirms the publication is live', async () => {
  const service = outbox({ status: 'submitted', receipt: { status: 'accepted' } });
  const [job] = await service.refreshPublicationJobs();
  assert.equal(job.delivery, 'live');
  assert.equal(service.submissions(), 0);
});

test('rejected submissions remain visible and are not blindly retried', async () => {
  const service = outbox({ status: 'submitted', receipt: { status: 'rejected', reason: 'A media file is missing' } });
  const [job] = await service.retryPendingPublications();
  assert.equal(job.delivery, 'rejected');
  assert.match(job.error, /media file/);
  assert.equal(service.submissions(), 0);
});

test('failed submissions preserve the actionable error until explicit retry', async () => {
  const service = outbox({ fail: true });
  const [job] = await service.refreshPublicationJobs();
  assert.equal(job.status, 'failed');
  assert.equal(job.error, 'Token expired');
  await service.refreshPublicationJobs();
  assert.equal(service.submissions(), 1);
  await service.retryPendingPublications();
  assert.equal(service.submissions(), 2);
});

test('focus and background refresh share one submission', async () => {
  const service = outbox();
  await Promise.all([service.refreshPublicationJobs(), service.refreshPublicationJobs()]);
  assert.equal(service.submissions(), 1);
});
