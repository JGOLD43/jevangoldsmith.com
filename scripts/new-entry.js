#!/usr/bin/env node
// Scaffold a new content entry from a valid skeleton, so adding content starts
// from a correct shape instead of copy-pasting and forgetting fields.
//
// Usage:
//   node scripts/new-entry.js <collection> "<title>"
//   npm run new:essay -- "Why I Keep a Commonplace Book"
//
// Collections: essay, book, adventure, podcast, person, project, challenge
//
// Appends a stub to the source data/*.json (id/slug derived from the title),
// preserving 2-space formatting. Required fields are filled; the rest are
// blank for you to complete. Run `npm run content:validate` afterward.

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');

function slugify(s) {
  return String(s).toLowerCase().trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const nowIso = () => new Date().toISOString();

// Each builder returns a stub entry given a title + slug. `key` is the wrapper
// property (null = the file is a bare array). Required fields are populated so
// content:validate passes immediately.
const REGISTRY = {
  essay: {
    file: 'essays.json', key: 'essays',
    build: (title, slug) => ({ id: slug, title, subtitle: '', author: 'Jevan Goldsmith', date: '', category: '', status: 'draft', content: '', featuredImage: null, media: [], createdAt: nowIso(), updatedAt: nowIso() })
  },
  book: {
    file: 'books.json', key: 'books',
    build: (title) => ({ title, author: '', isbn: '', year: '', rating: 0, category: '', shortDescription: '', review: '', read: false })
  },
  adventure: {
    file: 'adventures.json', key: 'adventures',
    build: (title, slug) => ({ id: slug, title, subtitle: '', location: '', region: '', startDate: '', endDate: '', duration: '', heroImage: '', shortDescription: '', content: '', highlights: [], gallery: [], tags: [], status: 'draft' })
  },
  podcast: {
    file: 'podcasts.json', key: 'podcasts',
    build: (title, slug) => ({ id: slug, title, host: '', description: '', category: '', image: '', link: '', notes: '', takeaways: [], episodes: [] })
  },
  person: {
    file: 'people.json', key: 'people',
    build: (title, slug) => ({ id: slug, name: title, title: '', lesson: '', category: '', image: '' })
  },
  project: {
    file: 'projects.json', key: 'projects',
    build: (title, slug) => ({ id: slug, slug, title, status: 'planned', category: '', shortDescription: '', description: '', technologies: [], tags: [], buildLog: [], links: [] })
  },
  challenge: {
    file: 'challenges.json', key: 'challenges',
    build: (title, slug) => ({ id: slug, slug, title, status: 'planned', category: '', timeframe: '', shortDescription: '', progress: { label: 'Progress', value: '', percent: 0 }, searchTerms: [] })
  }
};

function main() {
  const [collection, ...titleParts] = process.argv.slice(2);
  const title = titleParts.join(' ').trim();

  if (!collection || !REGISTRY[collection]) {
    console.error(`Usage: node scripts/new-entry.js <collection> "<title>"`);
    console.error(`Collections: ${Object.keys(REGISTRY).join(', ')}`);
    process.exit(1);
  }
  if (!title) {
    console.error(`Missing title. Example: node scripts/new-entry.js ${collection} "My New Title"`);
    process.exit(1);
  }

  const { file, key, build } = REGISTRY[collection];
  const filePath = path.join(DATA, file);
  const raw = fs.readFileSync(filePath, 'utf8');
  const endsNl = raw.endsWith('\n');
  const data = JSON.parse(raw);
  const arr = key ? data[key] : data;
  if (!Array.isArray(arr)) {
    console.error(`Expected an array at ${file}${key ? `["${key}"]` : ''}`);
    process.exit(1);
  }

  const slug = slugify(title);
  if (slug && arr.some((it) => it.id === slug || it.slug === slug)) {
    console.error(`An entry with id/slug "${slug}" already exists in ${file}. Pick a different title.`);
    process.exit(1);
  }

  const entry = build(title, slug);
  arr.push(entry);

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + (endsNl ? '\n' : ''));
  console.log(`✓ Added ${collection} "${title}"${slug ? ` (id: ${slug})` : ''} to data/${file}`);
  console.log(`  Next: fill in the blank fields, then run \`npm run content:validate\`.`);
}

main();
