#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [inputPath = '/tmp/JGOLD-Kindle-Complete.json', outputPath = '/tmp/JGOLD-Kindle-Library-Repair.json'] = process.argv.slice(2);
const root = path.resolve(import.meta.dirname, '..');
const siteBooks = JSON.parse(await readFile(path.join(root, 'data/books.generated.json'), 'utf8'));
const source = JSON.parse(await readFile(inputPath, 'utf8'));

const normalize = (value) => String(value ?? '')
  .toLowerCase().replace(/&amp;/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
const tokens = (value) => new Set(normalize(value).split(' ').filter((token) => token.length > 1 && !['the', 'and', 'for', 'with', 'from', 'into', 'edition'].includes(token)));
const overlap = (left, right) => {
  const a = tokens(left); const b = tokens(right);
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  return intersection / new Set([...a, ...b]).size;
};
const titleSimilarity = (left, right) => {
  const a = normalize(left); const b = normalize(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if ((a.startsWith(b) || b.startsWith(a)) && Math.min(a.length, b.length) >= 8) return 0.92;
  return overlap(a, b);
};
const cleanTitle = (value) => String(value ?? '')
  .replace(/\.pdf$/i, '').replace(/[-_](harperperennial|dorling kindersley)$/i, '')
  .replace(/^[- ]+/, '').replace(/\s+/g, ' ').trim();

const siteByTitle = new Map(siteBooks.map((book) => [normalize(book.title), book]));
const googleIsbnCover = (isbn) => `https://books.google.com/books/content?vid=ISBN${isbn}&printsec=frontcover&img=1&zoom=2&source=gbs_api`;
const openLibraryIsbnCover = (isbn) => `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
const BOOK_OVERRIDES = new Map(Object.entries({
  'anthony de mello rediscovering life': { title: 'Rediscovering Life', author: 'Anthony de Mello', isbn: '9780385419383', coverUri: openLibraryIsbnCover('9780385419383') },
  'the courage to be disliked the japanese phenomenon that shows you how to free yourself change your life and achieve real happiness': { title: 'The Courage to Be Disliked', author: 'Ichiro Kishimi, Fumitake Koga', isbn: '9781501197277', coverUri: openLibraryIsbnCover('9781501197277') },
  'a comedy of nobodies': { title: 'A Comedy of Nobodies', author: 'Baron Ryan', isbn: '9798874812737', coverUri: googleIsbnCover('9798874812737') },
  'irreducible consciousness life computers and human nature': { title: 'Irreducible', author: 'Federico Faggin', isbn: '9781803415093', coverUri: googleIsbnCover('9781803415093') },
  'the little book of talent 52 tips for improving your skills': { title: 'The Little Book of Talent', author: 'Daniel Coyle', isbn: '9780345536693', coverUri: openLibraryIsbnCover('9780345536693') },
  'a few lessons for investors and managers from warren buffett': { title: 'A Few Lessons for Investors and Managers from Warren Buffett', author: 'Peter Bevelin', isbn: '9781578647453', coverUri: googleIsbnCover('9781578647453') },
  'tao of charlie munger': { title: 'The Tao of Charlie Munger', author: 'David Clark', isbn: '9781501153341', coverUri: googleIsbnCover('9781501153341') },
  'anthony de mello awareness': { title: 'Awareness', author: 'Anthony de Mello', isbn: '9780385249379', coverUri: openLibraryIsbnCover('9780385249379') },
  'the psychology book': { title: 'The Psychology Book', author: 'DK', isbn: '9780756689704', coverUri: openLibraryIsbnCover('9780756689704') },
  'flip the script getting people to think your idea is their idea': { title: 'Flip the Script', author: 'Oren Klaff', isbn: '9780525533948', coverUri: googleIsbnCover('9780525533948') },
  'the new model of selling selling to an unsellable generation': { title: 'The New Model of Selling', author: 'Jerry Acuff, Jeremy Miner', isbn: '9781636980119', coverUri: googleIsbnCover('9781636980119') },
  'the one sentence persuasion course': { title: 'The One Sentence Persuasion Course', author: 'Blair Warren', isbn: '9780979502200', coverUri: googleIsbnCover('9780979502200') },
  'no bad parts healing trauma restoring wholeness with the internal family systems model': { title: 'No Bad Parts', author: 'Richard C. Schwartz', isbn: '9781683646686', coverUri: openLibraryIsbnCover('9781683646686') },
  'the joy of imperfection a stress free guide to silencing your inner critic conquering perfectionism and becoming the best': { title: 'The Joy of Imperfection', author: 'Damon Zahariades', isbn: '9781973356387', coverUri: googleIsbnCover('9781973356387') },
  'the six pillars of self esteem': { title: 'The Six Pillars of Self-Esteem', author: 'Nathaniel Branden', isbn: '9780553374391', coverUri: openLibraryIsbnCover('9780553374391') },
}));

const COLLECTION_RULES = [
  ['Advertising and Copywriting', /advertis|copywrit|ogilvy|whipple|brand|creative act|breakthrough advertising|unpublished david/i],
  ['Autobiographies', /autobiograph|memoir|my journey|moveable feast|driven from within|decoded|jordan|yogananda|reboot/i],
  ['Learning', /learn|skill|talent|practice|mindset|upskill|inner game|mastery|education|science and engineering/i],
  ['Persuasion', /persuad|sell|selling|sales|pitch|offer|leads|flip the script|one to many|influence|storyworthy/i],
  ['Psychology Books', /psycholog|cognitive|cbt|ocd|obsess|compuls|therapy|trauma|self-esteem|self esteem|dialectical|internal family|no bad parts|beliefs|perfection|disowned self|fear of life/i],
  ['Who Am I?', /spiritual|awak|awareness|soul|surrender|conscious|meditat|zen|yogi|nisargadatta|de mello|alan watts|presence|untethered|foster|kybalion|new earth|life without a centre|i am that|doing nothing/i],
  ['Mental Endurance', /courage|resilien|fearless|uncertainty|optimism|change|road less traveled|things fall apart|turning pro|rebel|imperfection|comfortable with uncertainty/i],
  ['Patience and Clear Thinking', /risk|decision|thinking|munger|buffett|taleb|luck|clear|hypocrite|pebbles|user illusion|loserthink|reframe your brain/i],
  ['Strategy and War', /strategy|business|entrepreneur|startup|team|traction|rockefeller|billion|berkshire|table|management|leadership|offers|leads/i],
  ['Out of the Box Thinking', /creative|smartcuts|comedy|moments|sum|hitchhiker|feynman|faggin|eagleman|doing science/i],
  ['Big Ideas', /philosoph|meaning|gatsby|stranger|old man and the sea|finite and infinite|book|great work|character strengths|how to live|wanting|die with zero/i],
];

function topicalCollections(book, metadata = {}) {
  const haystack = [book.title, book.author, ...(metadata.categories ?? []), ...(metadata.subjects ?? [])].join(' ');
  const matches = COLLECTION_RULES.filter(([, pattern]) => pattern.test(haystack)).map(([name]) => name);
  return matches.length ? matches.slice(0, 3) : ['Big Ideas'];
}

function googleCover(info) {
  const links = info?.imageLinks ?? {};
  const uri = links.extraLarge || links.large || links.medium || links.thumbnail || links.smallThumbnail;
  return uri ? uri.replace(/^http:/, 'https:').replace('&zoom=1', '&zoom=2') : '';
}

let googleAvailable = true;
async function googleCandidates(book) {
  if (!googleAvailable) return [];
  const title = cleanTitle(book.title).split(':')[0].slice(0, 120);
  const author = /unknown/i.test(book.author ?? '') ? '' : String(book.author ?? '').split(/[;,]/)[0].slice(0, 80);
  const query = [`intitle:${title}`, author ? `inauthor:${author}` : ''].filter(Boolean).join(' ');
  const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8&printType=books`);
  if (!response.ok) {
    if (response.status === 429 || response.status === 403) googleAvailable = false;
    return [];
  }
  const payload = await response.json();
  return (payload.items ?? []).map((item) => ({
    title: item.volumeInfo?.title ?? '', author: (item.volumeInfo?.authors ?? []).join(', '),
    isbn: item.volumeInfo?.industryIdentifiers?.find((entry) => entry.type === 'ISBN_13')?.identifier
      ?? item.volumeInfo?.industryIdentifiers?.[0]?.identifier ?? '',
    year: String(item.volumeInfo?.publishedDate ?? '').slice(0, 4), coverUri: googleCover(item.volumeInfo),
    categories: item.volumeInfo?.categories ?? [], subjects: [], source: 'Google Books',
  }));
}

async function openLibraryCandidates(book) {
  const author = book.author && !/unknown/i.test(book.author) ? String(book.author).split(/[;,]/)[0] : '';
  const params = new URLSearchParams({ q: `${cleanTitle(book.title)} ${author}`.trim(), limit: '10', fields: 'title,author_name,isbn,first_publish_year,cover_i,subject' });
  let response = await fetch(`https://openlibrary.org/search.json?${params}`);
  if (!response.ok) return [];
  let payload = await response.json();
  if (!(payload.docs ?? []).length) {
    params.set('q', cleanTitle(book.title).split(':')[0]);
    response = await fetch(`https://openlibrary.org/search.json?${params}`);
    if (!response.ok) return [];
    payload = await response.json();
  }
  return (payload.docs ?? []).map((item) => ({
    title: item.title ?? '', author: (item.author_name ?? []).join(', '), isbn: item.isbn?.[0] ?? '',
    year: String(item.first_publish_year ?? ''),
    coverUri: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg` : '',
    categories: [], subjects: item.subject ?? [], source: 'Open Library',
  }));
}

function bestCandidate(book, candidates) {
  const knownAuthor = book.author && !/unknown/i.test(book.author);
  return candidates
    .map((candidate) => ({
      ...candidate,
      score: titleSimilarity(cleanTitle(book.title), candidate.title) * (knownAuthor ? 0.78 : 1)
        + (knownAuthor ? overlap(book.author, candidate.author) * 0.22 : 0),
    }))
    .filter((candidate) => candidate.coverUri)
    .sort((left, right) => right.score - left.score)[0];
}

async function resolveBook(book) {
  const sourceTitle = book.title;
  const override = BOOK_OVERRIDES.get(normalize(cleanTitle(book.title)));
  if (override) {
    const collections = topicalCollections({ ...book, ...override });
    return { ...book, ...override, sourceTitle, category: collections[0], collections: ['Kindle', ...collections], metadataSource: 'Curated repair', metadataConfidence: 1 };
  }
  const site = siteByTitle.get(normalize(book.title));
  if (site) return {
    ...book, sourceTitle, title: site.title, author: site.author || book.author, isbn: site.isbn || '', year: site.year || '',
    coverUri: site.coverImage ? `https://jevangoldsmith.com/${site.coverImage}` : site.coverImageMedium ? `https://jevangoldsmith.com/${site.coverImageMedium}` : '',
    category: site.category || topicalCollections(book)[0], collections: ['Kindle', site.category || topicalCollections(book)[0]],
    metadataSource: 'JGOLD website', metadataConfidence: 1,
  };

  let candidate = bestCandidate(book, await googleCandidates(book));
  if (!candidate || candidate.score < 0.54) {
    const fallback = bestCandidate(book, await openLibraryCandidates(book));
    if (!candidate || (fallback?.score ?? 0) > candidate.score) candidate = fallback;
  }
  const collections = topicalCollections(book, candidate);
  const accepted = Boolean(candidate && candidate.score >= 0.54);
  return {
    ...book, sourceTitle, title: cleanTitle(book.title), author: accepted ? candidate.author || book.author || '' : book.author || '', isbn: accepted ? candidate.isbn || '' : '',
    year: accepted ? candidate.year || '' : '', coverUri: accepted ? candidate.coverUri : '',
    category: collections[0], collections: ['Kindle', ...collections], metadataSource: candidate?.source ?? 'Rules only',
    metadataConfidence: Number((candidate?.score ?? 0).toFixed(3)),
    metadataMatchTitle: candidate?.title ?? '',
  };
}

const books = [];
for (let index = 0; index < source.books.length; index += 4) {
  const batch = source.books.slice(index, index + 4);
  books.push(...await Promise.all(batch.map(resolveBook)));
  process.stderr.write(`\rResolved ${Math.min(index + batch.length, source.books.length)}/${source.books.length}`);
}
process.stderr.write('\n');

const document = { format: 'jgold-kindle-export', version: 2, generatedAt: new Date().toISOString(), books };
await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`);
const covers = books.filter((book) => book.coverUri).length;
const uncertain = books.filter((book) => book.metadataSource !== 'JGOLD website' && book.metadataConfidence < 0.62);
console.log(JSON.stringify({ outputPath, books: books.length, covers, withoutCover: books.length - covers, uncertain: uncertain.length }, null, 2));
if (uncertain.length) console.log(uncertain.map((book) => `${book.metadataConfidence}\t${book.title}\t${book.metadataMatchTitle}`).join('\n'));
