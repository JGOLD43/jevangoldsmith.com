import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { findBookCompanion } from '../src/domain/book-companions.ts';

const essays = JSON.parse(readFileSync(new URL('../src/constants/book-companions.json', import.meta.url), 'utf8'));
// Titles and authors observed in the installed Who Am I? collection, including imported metadata defects.
const library = [
  ['A New Earth', 'Eckhart Tolle'],
  ['Autobiography of a Yogi: The Original 1946 Edition plus Bonus Material', 'Paramahansa Yogananda'],
  ['Awareness', 'Anthony de Mello'],
  ['Comfortable with Uncertainty', 'Pema Chödrön'],
  ['Doing Nothing', 'Steven Harrison'],
  ['How To Hold a Cockroach A book for those who are free and dont know it', 'Matthew Maxwell, Allie Daigle'],
  ['I Am That Talks With Sri Nisargadatta Maharaj', 'Nisargadatta Maharaj'],
  ['Journey of Souls', 'Michael Newton'],
  ['Letting Go The Pathway of Surrender', 'David R. Hawkins'],
  ['Life Without a Centre - Awakening from the Dream of Separation', 'Gicu'],
  ['Rediscovering Life', 'Anthony de Mello'],
  ['The Book', 'Alan Watts'],
  ['The Great Work of Your Life A Guide for the Journey to Your True Calling', 'Stephen Cope'],
  ['The Kybalion', 'Three Initiates'],
  ['The Power of Now', 'Eckhart Tolle'],
  ['The Presence Process A Journey into Present Moment Awareness', 'Michael Brown'],
  ['The road less traveled', 'M. Scott Peck'],
  ['The Seven Spiritual Laws of Success', 'Deepak Chopra'],
  ['The Untethered Soul: The Journey Beyond Yourself', 'Michael A. Singer'],
  ['The User Illusion', 'Tor Nørretranders'],
  ['The Way of Rest Finding The Courage to Hold Everything in Love', 'Jeff Foster'],
  ['When Things Fall Apart', 'Pema Chödrön'],
  ['You Were Never Broken', 'Jeff Foster'],
  ['Zen and the Art of Motorcycle Maintenance', 'Robert M. Pirsig'],
];

test('every observed collection book has its own essay regardless of reading status', () => {
  const ids = library.map(([title, author]) => {
    const essay = findBookCompanion(essays, { title, author, readingStatus: 'unread' });
    assert.ok(essay, `No essay for ${title} by ${author}`);
    return essay.id;
  });
  assert.equal(essays.length, 24);
  assert.equal(new Set(ids).size, 24);
});

test('ambiguous short titles cannot link another author or another work', () => {
  assert.equal(findBookCompanion(essays, { title: 'The Book', author: 'Someone Else' }), undefined);
  assert.equal(findBookCompanion(essays, { title: 'The Book of Elon', author: 'Alan Watts' }), undefined);
  assert.equal(findBookCompanion(essays, { title: 'Awareness', author: '' }), undefined);
  assert.equal(findBookCompanion(essays, { title: 'The Road Less Stupid', author: 'M. Scott Peck' }), undefined);
  assert.equal(findBookCompanion(essays, { title: 'The User Illusion', author: 'Tor Norretranders' })?.id, 'the-user-illusion');
});

test('all bundled essays contain complete prose, rereading guidance and explicit source coverage', () => {
  for (const essay of essays) {
    const source = readFileSync(new URL(`../content/book-companions/${essay.id}.md`, import.meta.url), 'utf8');
    assert.ok(essay.wordCount >= 750, essay.id);
    assert.ok(essay.sections.length >= 6, essay.id);
    assert.equal(essay.sections.at(-1).heading, 'Sources and scope');
    for (const section of essay.sections) {
      assert.ok(section.heading.length > 5);
      assert.ok(section.paragraphs.length > 0);
      for (const paragraph of section.paragraphs) assert.ok(source.includes(paragraph), `Stale bundle: ${essay.id}`);
    }
    assert.doesNotMatch(source, /TODO|TBD|\[insert|lorem ipsum/i);
  }
});

test('companion content never replaces reviews or enters the publication path', () => {
  const detail = readFileSync(new URL('../src/app/books/[id].tsx', import.meta.url), 'utf8');
  const component = readFileSync(new URL('../src/components/book-companion.tsx', import.meta.url), 'utf8');
  assert.match(detail, /<BookCompanion key=\{book.id\} book=\{book\}/);
  assert.match(component, /constants\/book-companions.json/);
  assert.doesNotMatch(component, /editBook|addAnnotation|queueAndAttemptPublication|fetch\(/);
});
