#!/usr/bin/env node
// Phase 1.1: build-time merge of people.json + books + movies + profiles
// into data/people.merged.generated.json. Port of mergeBookPeople() from
// site-astro/src/scripts/people.js — keeps the runtime free of fetch/merge.
//
// people.astro reads the merged collection and SSRs all 98 cards.
// people.js detects the populated grid and skips wipe-and-render.

const { existsSync, readFileSync, statSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');

const ROOT = resolve(__dirname, '..');
const DATA = resolve(ROOT, 'data');

const _CONFIG = JSON.parse(readFileSync(resolve(DATA, 'people-merge-config.json'), 'utf8'));
const BOOK_PEOPLE = _CONFIG.BOOK_PEOPLE;
const MOVIE_PEOPLE = _CONFIG.MOVIE_PEOPLE;
const GENERATED_PERSON_META = _CONFIG.GENERATED_PERSON_META;
const PERSON_BIOS = _CONFIG.PERSON_BIOS;

function normalizePersonName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generatedImageForPerson(name) {
  const slug = normalizePersonName(name);
  return {
    image: `images/generated/people/${slug}-400.jpg`,
    srcset: [
      `images/generated/people/${slug}-200.jpg 200w`,
      `images/generated/people/${slug}-400.jpg 400w`,
      `images/generated/people/${slug}-800.jpg 800w`
    ].join(', ')
  };
}

function bookLabel(book) {
  const year = book.year || book.published || book.readYear;
  return year ? `${book.title} (${year})` : book.title;
}

function attachBook(person, book) {
  if (!person.books) person.books = [];
  const label = bookLabel(book);
  // Link directly to the book's detail page (/books/{slug}.html). Same
  // slug logic books.astro uses: prefer ISBN, otherwise slugify
  // title-author. Generated detail pages live under /books/.
  const isbn = String(book.isbn || '').replace(/[^0-9X]/gi, '');
  const slug = isbn || (book.slug || `${book.title || ''}-${book.author || ''}`)
    .toString().toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '')
    .trim().replace(/[-\s]+/g, '-');
  if (!person.books.some((entry) => entry.title === book.title)) {
    person.books.push({
      author: book.author || '',
      coverImage: book.coverImageMedium || book.coverImage || '',
      href: slug ? `/books/${slug}.html` : '#',
      label,
      title: book.title
    });
  }
}

function movieLabel(movie) {
  return movie.year ? `${movie.title} (${movie.year})` : movie.title;
}

function attachMovie(person, movie) {
  if (!person.movies) person.movies = [];
  if (!person.movies.some((entry) => entry.title === movie.title)) {
    person.movies.push({
      coverImage: movie.poster || '',
      href: `movies.html?movie=${encodeURIComponent(movie.title)}`,
      label: movieLabel(movie),
      title: movie.title,
      year: movie.year || ''
    });
  }
}

function normalizeSubject(subject) {
  return typeof subject === 'string' ? { name: subject } : subject;
}

function profileForName(profiles, name) {
  const id = normalizePersonName(name);
  return profiles.find((profile) => profile.id === id || profile.name === name) || null;
}

function sourceTypeFor(person) {
  return person.sourceType || (person.title?.toLowerCase().includes('fictional') ? 'fiction' : 'nonfiction');
}

function mergeBookPeople(people, books, movies, profiles) {
  const byName = new Map();
  people.forEach((person) => {
    const profile = profileForName(profiles, person.name);
    // Derive image + srcset from filesystem slug pattern when source
    // data doesn't supply them. Eliminates the manual srcset footgun:
    // adding a new person now only requires dropping the source image
    // and re-running optimize-assets — no JSON path bookkeeping.
    const imageMeta = generatedImageForPerson(person.name);
    byName.set(person.name, {
      ...person,
      bio: profile?.bio || PERSON_BIOS[person.name] || person.lesson || '',
      image: person.image || imageMeta.image,
      srcset: person.srcset || imageMeta.srcset,
      movies: [],
      profileHref: profile ? `people/${profile.id}.html` : '',
      sourceType: sourceTypeFor(person),
      thesis: profile?.thesis || person.lesson || '',
      books: []
    });
  });

  books.forEach((book) => {
    const subjects = BOOK_PEOPLE[book.title];
    if (!subjects) return;
    subjects.forEach((name) => {
      const existing = byName.get(name);
      const meta = GENERATED_PERSON_META[name] || {};
      const profile = profileForName(profiles, name);
      const imageMeta = generatedImageForPerson(name);
      const person = existing || {
        bio: profile?.bio || meta.bio || PERSON_BIOS[name] || '',
        category: meta.category || 'writers',
        image: imageMeta.image,
        lesson: meta.lesson || 'Learn from the life behind the work',
        name,
        movies: [],
        profileHref: profile ? `people/${profile.id}.html` : '',
        srcset: imageMeta.srcset,
        sourceType: meta.sourceType || 'nonfiction',
        thesis: profile?.thesis || meta.lesson || '',
        title: meta.title || 'Subject'
      };
      byName.set(name, {
        ...person,
        ...meta,
        bio: person.bio || profile?.bio || meta.bio || PERSON_BIOS[name] || '',
        image: person.image || imageMeta.image,
        movies: person.movies || [],
        profileHref: person.profileHref || (profile ? `people/${profile.id}.html` : ''),
        srcset: person.srcset || imageMeta.srcset,
        sourceType: person.sourceType || meta.sourceType || 'nonfiction',
        thesis: person.thesis || profile?.thesis || meta.lesson || ''
      });
      attachBook(byName.get(name), book);
    });
  });

  movies.forEach((movie) => {
    const subjects = MOVIE_PEOPLE[movie.title];
    if (!subjects) return;
    subjects.map(normalizeSubject).forEach((subject) => {
      const name = subject.name;
      if (!name) return;
      const existing = byName.get(name);
      const profile = profileForName(profiles, name);
      const meta = GENERATED_PERSON_META[name] || {};
      const imageMeta = generatedImageForPerson(name);
      const sourceType = subject.sourceType || meta.sourceType || 'fiction';
      const person = existing || {
        bio: profile?.bio || subject.bio || meta.bio || PERSON_BIOS[name] || '',
        category: subject.category || meta.category || 'creators',
        image: subject.image || movie.poster || imageMeta.image,
        lesson: subject.lesson || meta.lesson || 'Study the character under pressure',
        name,
        profileHref: profile ? `people/${profile.id}.html` : '',
        sourceType,
        srcset: subject.srcset || '',
        thesis: profile?.thesis || subject.lesson || meta.lesson || '',
        title: subject.title || meta.title || 'Fictional Character'
      };
      byName.set(name, {
        ...person,
        ...subject,
        bio: person.bio || profile?.bio || subject.bio || meta.bio || PERSON_BIOS[name] || '',
        books: person.books || [],
        category: person.category || subject.category || meta.category || 'creators',
        image: person.image || subject.image || movie.poster || imageMeta.image,
        movies: person.movies || [],
        profileHref: person.profileHref || (profile ? `people/${profile.id}.html` : ''),
        sourceType: person.sourceType || sourceType,
        srcset: person.srcset || subject.srcset || '',
        thesis: person.thesis || profile?.thesis || subject.lesson || meta.lesson || ''
      });
      attachMovie(byName.get(name), movie);
    });
  });

  return Array.from(byName.values())
    .map((person) => ({
      ...person,
      bio: person.bio || PERSON_BIOS[person.name] || person.lesson || '',
      books: person.books || [],
      movies: person.movies || [],
      sourceType: sourceTypeFor(person),
      searchText: [
        person.name,
        person.title,
        person.lesson,
        sourceTypeFor(person) === 'fiction' ? 'fiction fictional character' : 'non-fiction nonfiction real historical',
        ...(person.books || []).map((book) => book.label),
        ...(person.movies || []).map((movie) => movie.label)
      ].join(' ')
    }))
    .sort((a, b) =>
      (b.books.length + b.movies.length) - (a.books.length + a.movies.length) ||
      a.name.localeCompare(b.name)
    );
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(DATA, path), 'utf8'));
}

function outputIsFresh(outputPath, inputPaths) {
  if (!existsSync(outputPath)) return false;
  const outputMtime = statSync(outputPath).mtimeMs;
  return inputPaths.every((inputPath) => existsSync(inputPath) && statSync(inputPath).mtimeMs <= outputMtime);
}

function main() {
  const inputPaths = [
    resolve(DATA, 'people.json'),
    resolve(DATA, 'books.generated.json'),
    resolve(DATA, 'movies.json'),
    resolve(DATA, 'people.profiles.json')
  ];
  const outPath = resolve(DATA, 'people.merged.generated.json');
  if (outputIsFresh(outPath, inputPaths)) {
    console.log('merge-people: skipped, generated data is fresh');
    return;
  }

  const peopleRaw = readJson('people.json');
  const booksGenerated = readJson('books.generated.json');
  const movies = readJson('movies.json');
  const profilesRaw = readJson('people.profiles.json');

  const people = Array.isArray(peopleRaw.people) ? peopleRaw.people : [];
  const books = Array.isArray(booksGenerated) ? booksGenerated : (booksGenerated.books || []);
  const movieList = Array.isArray(movies) ? movies : (movies.movies || []);
  const profiles = Array.isArray(profilesRaw.profiles) ? profilesRaw.profiles : [];

  const merged = mergeBookPeople(people, books, movieList, profiles);
  const out = { people: merged };
  writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
  console.log(`merge-people: wrote ${merged.length} merged records to ${outPath}`);
}

main();
