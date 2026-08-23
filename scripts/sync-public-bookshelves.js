#!/usr/bin/env node
// Fetch and snapshot public bookshelves for people represented on the site.
//
// The website reads the committed snapshot, never the third-party site at
// page-load time. That keeps the comparison fast, private, and resilient to
// a remote outage. Run `npm run bookshelves:sync` to re-verify every listed
// source after adding a person to data/bookshelf-sources.json.

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

const ROOT = path.resolve(__dirname, '..');
const CONFIG = path.join(ROOT, 'data', 'bookshelf-sources.json');
const PEOPLE = path.join(ROOT, 'data', 'people.profiles.json');
const OUT = path.join(ROOT, 'data', 'bookshelf-comparisons.generated.json');

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'user-agent': 'JevanGoldsmithBookshelfVerifier/1.0 (+https://jevangoldsmith.com)' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(fetchText(new URL(res.headers.location, url).href));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`${url} returned HTTP ${res.statusCode}`));
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve(body));
    }).on('error', reject).setTimeout(30_000, function onTimeout() {
      this.destroy(new Error(`${url} timed out`));
    });
  });
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseNeverEnoughBookTiles(html) {
  const books = [];
  // A tile has a stable data-book-tile marker followed by a cover image whose
  // alt text is `Title by Author`. The marker prevents collecting unrelated
  // images elsewhere on the page.
  const pattern = /data-book-tile="[^"]+"[\s\S]*?<img[^>]+alt="([^"]+)"/g;
  for (const match of html.matchAll(pattern)) {
    const label = decodeHtml(match[1]).trim();
    const separator = label.lastIndexOf(' by ');
    const title = (separator > 0 ? label.slice(0, separator) : label).trim();
    const author = (separator > 0 ? label.slice(separator + 4) : '').trim();
    if (title) books.push({ title, ...(author ? { author } : {}) });
  }
  const unique = new Map(books.map((book) => [book.title.toLocaleLowerCase(), book]));
  return [...unique.values()];
}

const parsers = { 'never-enough-book-tiles': parseNeverEnoughBookTiles };

async function generate() {
  const config = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  const profiles = JSON.parse(fs.readFileSync(PEOPLE, 'utf8')).profiles || [];
  const people = new Map(profiles.map((person) => [person.id, person]));
  const sources = [];

  for (const source of config.sources || []) {
    const person = people.get(source.personId);
    if (!person || person.name !== source.personName) {
      throw new Error(`Source ${source.id} does not match a person profile.`);
    }
    const parser = parsers[source.parser];
    if (!parser) throw new Error(`Source ${source.id} uses an unknown parser: ${source.parser}`);
    const books = parser(await fetchText(source.sourceUrl));
    if (!books.length) throw new Error(`Source ${source.id} returned no books; its public markup may have changed.`);
    sources.push({
      id: source.id,
      personId: source.personId,
      personName: source.personName,
      sourceName: source.sourceName,
      sourceUrl: source.sourceUrl,
      verifiedAt: new Date().toISOString().slice(0, 10),
      bookCount: books.length,
      books
    });
    console.log(`[bookshelves:sync] ${source.personName}: ${books.length} public books`);
  }
  return `${JSON.stringify({ sources }, null, 2)}\n`;
}

async function main() {
  const generated = await generate();
  if (process.argv.includes('--check')) {
    const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (current !== generated) {
      console.error('[bookshelves:sync] snapshot is stale. Run: npm run bookshelves:sync');
      process.exit(1);
    }
    console.log('[bookshelves:sync] snapshot is up to date.');
    return;
  }
  fs.writeFileSync(OUT, generated);
  console.log(`[bookshelves:sync] wrote ${OUT}`);
}

main().catch((error) => { console.error(`[bookshelves:sync] ${error.message}`); process.exit(1); });
