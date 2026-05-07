#!/usr/bin/env node
/**
 * Emit dist/api/v1/people-modal.json — a slim payload containing only the
 * fields the people-detail modal needs (bio, thesis, books, movies,
 * profileHref, plus name + image + srcset + lesson + title for header
 * rendering when the modal opens).
 *
 * The full SSR card markup on people.html already carries everything the
 * grid view needs, so this file is fetched lazily only when a user opens
 * a person detail modal. Saves ~95KB on every people.html visit
 * (HTML is must-revalidate — inline JSON paid that 95KB on every visit).
 *
 * Run after people:merge, before purge:css.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DIST = process.argv.find((a) => a.startsWith('--dist='))?.slice(7) || path.join(ROOT, 'dist');
const SOURCE = path.join(ROOT, 'data/people.merged.generated.json');

if (!fs.existsSync(SOURCE)) {
  console.error(`[people-modal] missing ${SOURCE} — run people:merge first`);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
const merged = Array.isArray(raw) ? raw : Array.isArray(raw?.people) ? raw.people : null;
if (!merged) {
  console.error('[people-modal] source is not an array nor { people: [...] }');
  process.exit(1);
}

// Modal needs: name (header), title (kicker), lesson (blurb fallback +
// secondary line), image + srcset (modal hero img), bio (long-form intro),
// books, movies, profileHref. Drop searchText, category, sourceType, id —
// already in card data attrs / card markup.
const slim = merged.map((person) => ({
  name: person.name,
  title: person.title || '',
  lesson: person.lesson || '',
  image: person.image || '',
  srcset: person.srcset || '',
  bio: person.bio || '',
  thesis: person.thesis || '',
  books: Array.isArray(person.books) ? person.books : [],
  movies: Array.isArray(person.movies) ? person.movies : [],
  profileHref: person.profileHref || ''
}));

const outDir = path.join(DIST, 'api/v1');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'people-modal.json');
const json = JSON.stringify(slim);
fs.writeFileSync(outFile, json);

const sourceBytes = fs.statSync(SOURCE).size;
console.log(`[people-modal] ${(sourceBytes / 1024).toFixed(1)}KB merged → ${(json.length / 1024).toFixed(1)}KB slim → ${path.relative(ROOT, outFile)}`);
