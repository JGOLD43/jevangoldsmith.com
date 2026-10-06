const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const lib = import('../../site-astro/src/lib/private-library.ts');
const vaultId = 'a'.repeat(32), key = 'b'.repeat(64);
const snapshot = () => ({ version: 1, vaultId, tables: {
  books: { rows: [{ id: 'book', title: '<script>private book</script>', author: 'Author', progress: 0.5 }] },
  book_annotations: { rows: [{ id: 'h', book_id: 'book', kind: 'highlight', selected_text: 'Saved on phone', note: 'Private note', locator: 'page:3' }] },
  vault_items: { rows: [{ body: 'UNRELATED PRIVATE DATA' }] }
} });
function encrypt(value) {
  const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  return Buffer.concat([iv, cipher.update(JSON.stringify(value)), cipher.final(), cipher.getAuthTag()]);
}
test('browser reads existing Expo AES-GCM snapshots and exposes only library fields', async () => {
  const { decryptSyncSnapshot, privateLibraryFromSnapshot, parseConnectionCode } = await lib;
  assert.deepEqual(parseConnectionCode(`JG1.${vaultId}.${key}`), { vaultId, key });
  assert.throws(() => parseConnectionCode('JG1.invalid'));
  const bytes = encrypt(snapshot());
  const books = privateLibraryFromSnapshot(await decryptSyncSnapshot(new Uint8Array(bytes), key), vaultId);
  assert.equal(books[0].highlights[0].text, 'Saved on phone');
  assert.equal(books[0].highlights[0].note, 'Private note');
  assert.doesNotMatch(JSON.stringify(books), /UNRELATED/);
  assert.throws(() => privateLibraryFromSnapshot(snapshot(), 'c'.repeat(32)), /different/);
  await assert.rejects(decryptSyncSnapshot(new Uint8Array(bytes), 'c'.repeat(64)), /cannot unlock/);
  bytes[15] ^= 1;
  await assert.rejects(decryptSyncSnapshot(new Uint8Array(bytes), key), /cannot unlock/);
});
test('private reader only requests immutable encrypted data from the private GitHub repository', async t => {
  const { loadPrivateLibrary, PRIVATE_INBOX } = await lib;
  const calls = [], bytes = encrypt(snapshot());
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push([url, options]);
    const path = url.slice(PRIVATE_INBOX.length);
    const data = path === '' ? { private: true, full_name: 'JGOLD43/jgold-publishing-inbox' }
      : path.startsWith('/git/ref/') ? { object: { sha: '1'.repeat(40) } }
      : path.startsWith('/git/commits/') ? { tree: { sha: '2'.repeat(40) } }
      : path.startsWith('/git/trees/') ? { tree: [{ path: `sync/${vaultId}/state.enc`, type: 'blob', sha: '3'.repeat(40) }] }
      : { encoding: 'base64', content: bytes.toString('base64'), size: bytes.length };
    return new Response(JSON.stringify(data));
  });
  const result = await loadPrivateLibrary('github_pat_test', `JG1.${vaultId}.${key}`);
  assert.equal(result[0].highlights.length, 1);
  assert.equal(calls.length, 5);
  for (const [url, options] of calls) {
    assert.ok(url.startsWith(PRIVATE_INBOX)); assert.equal(options.body, undefined);
    assert.equal(options.cache, 'no-store'); assert.equal(options.credentials, 'omit');
    assert.ok(!url.includes(key));
  }
});
test('public repository, duplicate rows and unknown formats fail closed', async t => {
  const { loadPrivateLibrary, privateLibraryFromSnapshot } = await lib;
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ private: false, full_name: 'JGOLD43/jgold-publishing-inbox' })));
  await assert.rejects(loadPrivateLibrary('github_pat_test', `JG1.${vaultId}.${key}`), /private/);
  const data = snapshot(); data.tables.books.rows.push(data.tables.books.rows[0]);
  assert.throws(() => privateLibraryFromSnapshot(data, vaultId), /invalid/);
  assert.throws(() => privateLibraryFromSnapshot({ ...snapshot(), version: 2 }, vaultId), /different/);
});
