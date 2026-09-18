import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { libraryCountResponse, libraryCountScript, isLibraryUrl } from '../src/services/library-highlight-bridge.ts';

const book = { id: '9780735211292', title: 'Atomic Habits', author: 'James Clear' };
const counts = [{ ...book, isbn: book.id, highlightCount: 7, selectedText: 'PRIVATE EXCERPT', note: 'PRIVATE NOTE' }];

test('bridge only returns aggregate counts for requested, matching books', () => {
  const reply = libraryCountResponse([book], counts);
  assert.deepEqual(reply, [{ publicId: book.id, isbn: '', title: book.title, author: book.author, highlightCount: 7 }]);
  assert.doesNotMatch(JSON.stringify(reply), /PRIVATE|selectedText|note/);
  assert.deepEqual(libraryCountResponse([{ ...book, id: 'unknown', title: 'Unknown' }], counts), []);
  assert.deepEqual(libraryCountResponse(Array(501).fill(book), counts), []);
});

test('bridge refuses outside destinations and treats book strings as data', () => {
  assert.equal(isLibraryUrl('https://jevangoldsmith.com/books.html?view=library'), true);
  for (const url of ['https://jevangoldsmith.com.evil.test/books.html', 'http://jevangoldsmith.com/books', 'file:///books.html', 'https://jevangoldsmith.com/essays.html']) assert.equal(isLibraryUrl(url), false);
  const records = libraryCountResponse([{ ...book, title: '</script>\"; throw Error(1)' }], counts);
  let received;
  const context = { location: { origin: 'https://jevangoldsmith.com', pathname: '/books.html' }, window: { dispatchEvent: event => { received = event.detail; } }, CustomEvent: class { constructor(_, options) { this.detail = options.detail; } } };
  vm.runInNewContext(libraryCountScript(records), context);
  assert.equal(received[0].title, '</script>\"; throw Error(1)');
  received = undefined;
  context.location.origin = 'https://evil.test';
  vm.runInNewContext(libraryCountScript(records), context);
  assert.equal(received, undefined);
});
