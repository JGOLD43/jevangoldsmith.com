const test = require('node:test');
const assert = require('node:assert/strict');

test('highlight counts distinguish zero, unknown, duplicates, and other authors', async () => {
  const { highlightCountFor } = await import('../../private-companion-app/src/domain/book-highlight-counts.ts');
  const book = { id: '9781501124020', title: 'Principles', author: 'Ray Dalio' };
  const record = { publicId: `isbn:${book.id}`, isbn: '', title: 'Principles: Life and Work', author: book.author, highlightCount: 0 };
  assert.equal(highlightCountFor(book, []), null);
  assert.equal(highlightCountFor(book, [record]), 0);
  assert.equal(highlightCountFor(book, [record, { ...record, highlightCount: 12 }]), 12);
  assert.equal(highlightCountFor(book, [{ ...record, publicId: null, author: 'Another Author', highlightCount: 99 }]), null);
  for (const highlightCount of [-1, 1.5, NaN, Infinity]) assert.equal(highlightCountFor(book, [{ ...record, highlightCount }]), null);
  assert.equal(highlightCountFor({ id: '', title: 'Churchill', author: 'Paul Johnson' }, [{ isbn: '', title: 'Churchill: Walking with Destiny', author: 'Andrew Roberts', highlightCount: 5 }]), null);
});
