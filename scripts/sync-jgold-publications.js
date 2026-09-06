#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const { validateDocument, renderDocument } = require('../private-companion-app/src/domain/studio-document.cjs');

const REPO_ROOT = path.resolve(__dirname, '..');
const STATE_PATH = path.join(REPO_ROOT, '.jgold-publication-state.json');
const MAX_FILE_BYTES = 300_000;
const MAX_BATCH = 250;
const TYPES = new Set(['essay', 'adventure', 'project', 'challenge', 'product', 'quote', 'now', 'book']);
const CONTENT_TYPES = new Set(['essay', 'adventure', 'project', 'challenge', 'product', 'quote', 'now']);
const TARGETS = {
  essay: { file: 'essays.json', key: 'essays' },
  adventure: { file: 'adventures.json', key: 'adventures' },
  project: { file: 'projects.json', key: 'projects' },
  challenge: { file: 'challenges.json', key: 'challenges' },
  product: { file: 'products.json', key: 'products' },
  quote: { file: 'quotes.json', key: 'fullQuotes' },
  now: { file: 'now.json', key: null },
  book: { file: 'books.json', key: 'books' },
};

function ownKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(`${label} contains unexpected or missing fields`);
  }
}

function boundedString(value, label, max, { empty = true } = {}) {
  if (typeof value !== 'string') throw new Error(`${label} must be text`);
  const normalized = value.replace(/\r\n?/g, '\n').trim();
  if (!empty && !normalized) throw new Error(`${label} is required`);
  if (normalized.length > max) throw new Error(`${label} exceeds ${max} characters`);
  if (/\u0000/.test(normalized)) throw new Error(`${label} contains a null byte`);
  return normalized;
}

function identifier(value, label) {
  const result = boundedString(value, label, 128, { empty: false });
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(result)) throw new Error(`${label} has an invalid format`);
  return result;
}

function nullableIdentifier(value, label) {
  return value === null ? null : identifier(value, label);
}

function slugify(value) {
  const slug = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 128);
  if (!slug) throw new Error('A safe public identifier could not be created');
  return slug;
}

function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function paragraphs(value) {
  return value.split(/\n{2,}/).filter(Boolean).map((part) => `<p>${escapeHtml(part).replace(/\n/g, '<br>')}</p>`).join('');
}

function validateBook(book) {
  ownKeys(book, ['title', 'author', 'isbn', 'year', 'rating', 'reReads', 'category', 'summary', 'review', 'read'], 'book');
  if (!Number.isInteger(book.rating) || book.rating < 0 || book.rating > 5) throw new Error('book.rating must be an integer from 0 to 5');
  if (!Number.isInteger(book.reReads) || book.reReads < 0 || book.reReads > 1000) throw new Error('book.reReads is invalid');
  if (typeof book.read !== 'boolean') throw new Error('book.read must be true or false');
  return {
    title: boundedString(book.title, 'book.title', 240, { empty: false }),
    author: boundedString(book.author, 'book.author', 240),
    isbn: boundedString(book.isbn, 'book.isbn', 32),
    year: boundedString(book.year, 'book.year', 4),
    rating: book.rating,
    reReads: book.reReads,
    category: boundedString(book.category, 'book.category', 120),
    summary: boundedString(book.summary, 'book.summary', 2_000),
    review: boundedString(book.review, 'book.review', 100_000),
    read: book.read,
  };
}

function validateNowLocation(location) {
  ownKeys(location, ['label', 'lat', 'lng', 'zoom'], 'manifest.nowLocation');
  const label = boundedString(location.label, 'manifest.nowLocation.label', 160, { empty: false });
  if (!Number.isFinite(location.lat) || location.lat < -90 || location.lat > 90) throw new Error('manifest.nowLocation.lat is invalid');
  if (!Number.isFinite(location.lng) || location.lng < -180 || location.lng > 180) throw new Error('manifest.nowLocation.lng is invalid');
  if (!Number.isInteger(location.zoom) || location.zoom < 2 || location.zoom > 18) throw new Error('manifest.nowLocation.zoom is invalid');
  return { label, lat: location.lat, lng: location.lng, zoom: location.zoom };
}

function validateManifest(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('manifest must be an object');
  if (!TYPES.has(raw.type)) throw new Error('manifest.type is not allowed');
  if (raw.version !== 1) throw new Error('manifest.version is not supported');
  if (raw.operation !== 'create' && raw.operation !== 'update') throw new Error('manifest.operation is invalid');
  if (raw.type === 'book') {
    ownKeys(raw, ['version', 'id', 'type', 'sourceId', 'operation', 'book'], 'book manifest');
    return { version: 1, id: identifier(raw.id, 'manifest.id'), type: 'book', sourceId: nullableIdentifier(raw.sourceId, 'manifest.sourceId'), operation: raw.operation, book: validateBook(raw.book) };
  }
  if (!CONTENT_TYPES.has(raw.type)) throw new Error('manifest.type is not a content type');
  const contentKeys = ['version', 'id', 'type', 'title', 'summary', 'body', 'sourceId', 'operation'];
  if (Object.hasOwn(raw, 'document')) contentKeys.push('document');
  ownKeys(raw, raw.type === 'now' ? [...contentKeys, 'nowLocation'] : contentKeys, 'content manifest');
  const manifest = {
    version: 1,
    id: identifier(raw.id, 'manifest.id'),
    type: raw.type,
    title: boundedString(raw.title, 'manifest.title', 240, { empty: false }),
    summary: boundedString(raw.summary, 'manifest.summary', 2_000),
    body: boundedString(raw.body, 'manifest.body', 200_000, { empty: false }),
    ...(Object.hasOwn(raw, 'document') ? { document: validateDocument(raw.document) } : {}),
    sourceId: nullableIdentifier(raw.sourceId, 'manifest.sourceId'),
    operation: raw.operation,
  };
  return raw.type === 'now' ? { ...manifest, nowLocation: validateNowLocation(raw.nowLocation) } : manifest;
}

function validateEnvelope(raw) {
  ownKeys(raw, ['schemaVersion', 'jobId', 'createdAt', 'client', 'manifest'], 'submission');
  if (raw.schemaVersion !== 1) throw new Error('submission schema is not supported');
  if (raw.client !== 'jgold-android') throw new Error('submission client is not allowed');
  const created = new Date(raw.createdAt);
  if (!Number.isFinite(created.getTime())) throw new Error('submission createdAt is invalid');
  if (created.getTime() > Date.now() + 5 * 60_000) throw new Error('submission createdAt is too far in the future');
  return { schemaVersion: 1, jobId: identifier(raw.jobId, 'submission.jobId'), createdAt: created.toISOString(), client: raw.client, manifest: validateManifest(raw.manifest) };
}

function readState(statePath = STATE_PATH) {
  if (!fs.existsSync(statePath)) return { schemaVersion: 1, receipts: {} };
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  if (state.schemaVersion !== 1 || !state.receipts || typeof state.receipts !== 'object' || Array.isArray(state.receipts)) throw new Error('Publication state is corrupt');
  return state;
}

function writeJsonAtomic(filePath, value) {
  const temporary = `${filePath}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(temporary, filePath);
}

function applyPublicFields(existing, manifest, publicId, timestamp) {
  if (manifest.type === 'book') {
    return { ...existing, title: manifest.book.title, author: manifest.book.author, isbn: manifest.book.isbn, year: manifest.book.year, rating: manifest.book.rating, reReads: manifest.book.reReads, category: manifest.book.category, shortDescription: manifest.book.summary, review: manifest.book.review || null, read: manifest.book.read };
  }
  const html = manifest.document ? renderDocument(manifest.document) : paragraphs(manifest.body);
  existing = { ...existing, studioDocument: manifest.document || null, studioBody: manifest.body };
  switch (manifest.type) {
    case 'essay':
      return { ...existing, id: publicId, title: manifest.title, subtitle: manifest.summary, author: 'Jevan Goldsmith', date: String(existing.date || timestamp.slice(0, 10)), category: existing.category || 'Ideas', status: 'published', content: html, featuredImage: existing.featuredImage ?? null, media: Array.isArray(existing.media) ? existing.media : [], createdAt: existing.createdAt || timestamp, updatedAt: timestamp };
    case 'adventure':
      return { ...existing, id: publicId, title: manifest.title, subtitle: manifest.summary, shortDescription: manifest.summary, content: html, status: 'published', location: existing.location || '', region: existing.region || '', startDate: existing.startDate || timestamp.slice(0, 10), endDate: existing.endDate || '', duration: existing.duration || '', heroImage: existing.heroImage || '', highlights: Array.isArray(existing.highlights) ? existing.highlights : [], gallery: Array.isArray(existing.gallery) ? existing.gallery : [], tags: Array.isArray(existing.tags) ? existing.tags : [] };
    case 'project':
      return { ...existing, id: publicId, slug: existing.slug || publicId, title: manifest.title, shortDescription: manifest.summary, description: manifest.body, studioHtml: html, status: existing.status === 'draft' ? 'active' : existing.status || 'active', category: existing.category || 'building' };
    case 'challenge':
      return { ...existing, id: publicId, slug: existing.slug || publicId, title: manifest.title, shortDescription: manifest.summary || manifest.body, studioHtml: html, status: existing.status === 'draft' ? 'active' : existing.status || 'active', category: existing.category || 'personal', timeframe: existing.timeframe || 'In progress' };
    case 'product':
      return { ...existing, id: publicId, slug: existing.slug || publicId, title: manifest.title, shortDescription: manifest.summary, description: manifest.body, studioHtml: html, status: existing.status === 'draft' ? 'available' : existing.status || 'available', category: existing.category || 'tech', type: existing.type || 'recommendation' };
    case 'quote':
      return { ...existing, id: publicId, slug: existing.slug || publicId, text: manifest.body || manifest.title, author: manifest.summary || existing.author || 'Jevan Goldsmith', status: 'available', category: existing.category || 'ideas', topics: Array.isArray(existing.topics) ? existing.topics : [], tags: Array.isArray(existing.tags) ? existing.tags : [] };
    case 'now':
      return {
        ...existing,
        lastUpdated: new Date(timestamp).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Australia/Brisbane' }),
        location: manifest.nowLocation,
        sections: [{ title: manifest.title, body: html }],
      };
    default:
      throw new Error('Unsupported manifest type');
  }
}

function applyManifest(manifest, timestamp, root = REPO_ROOT) {
  const target = TARGETS[manifest.type];
  const filePath = path.join(root, 'data', target.file);
  const document = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const publicId = manifest.sourceId || (manifest.type === 'book' ? (manifest.book.isbn || slugify(`${manifest.book.title}-${manifest.book.author}`)) : slugify(manifest.title));
  if (!target.key) {
    if (document.lastUpdated && Array.isArray(document.sections) && document.sections.length) {
      const historyPath = path.join(root, 'data', 'now-history.json');
      const history = fs.existsSync(historyPath) ? JSON.parse(fs.readFileSync(historyPath, 'utf8')) : [];
      const same = history.some((entry) => entry.lastUpdated === document.lastUpdated && JSON.stringify(entry.sections) === JSON.stringify(document.sections) && JSON.stringify(entry.location) === JSON.stringify(document.location));
      if (!same) {
        const previousId = `now-${crypto.createHash('sha256').update(JSON.stringify(document)).digest('hex').slice(0, 16)}`;
        const mapSource = path.join(root, 'site-astro/public/images/now-map.jpg');
        let map = null;
        if (fs.existsSync(mapSource)) {
          const archive = path.join(root, 'site-astro/public/images/now-archive');
          fs.mkdirSync(archive, { recursive: true });
          fs.copyFileSync(mapSource, path.join(archive, `${previousId}.jpg`));
          map = `/images/now-archive/${previousId}.jpg`;
        }
        history.unshift({ ...document, id: previousId, map, archivedAt: timestamp });
        writeJsonAtomic(historyPath, history);
      }
    }
    Object.assign(document, applyPublicFields(document, manifest, publicId, timestamp));
    writeJsonAtomic(filePath, document);
    return publicId;
  }
  const records = Array.isArray(document[target.key]) ? [...document[target.key]] : [];
  const index = records.findIndex((record) => record.id === publicId || record.slug === publicId || (manifest.type === 'book' && ((manifest.book.isbn && record.isbn === manifest.book.isbn) || (record.title === manifest.book.title && record.author === manifest.book.author))));
  if (manifest.operation === 'update' && index < 0) throw new Error('This item no longer exists on the website. Create a new draft instead.');
  const next = applyPublicFields(index >= 0 ? records[index] : {}, manifest, publicId, timestamp);
  if (index >= 0) records[index] = next;
  else records.unshift(next);
  document[target.key] = records;
  if (Object.hasOwn(document, 'lastUpdated')) document.lastUpdated = timestamp;
  writeJsonAtomic(filePath, document);
  return publicId;
}


function copyManifestMedia(manifest, submissionsPath, root) {
  const media = manifest.document?.blocks.filter((block) => block.type !== 'text' && block.src.startsWith('/media/studio/')) || [];
  let total = 0;
  const copies = media.map((block) => {
    const name = path.basename(block.src);
    const source = path.join(submissionsPath, '..', 'media', name);
    if (!fs.existsSync(source) || fs.lstatSync(source).isSymbolicLink() || !fs.statSync(source).isFile() || fs.statSync(source).size > 20 * 1024 * 1024) throw new Error('A media file is missing or exceeds 20 MB.');
    const bytes = fs.readFileSync(source);
    total += bytes.length;
    if (total > 100 * 1024 * 1024) throw new Error('Keep each story below 100 MB of media.');
    if (crypto.createHash('sha256').update(bytes).digest('hex') !== name.split('.')[0]) throw new Error('Media checksum does not match.');
    const ext = path.extname(name);
    const valid = ext === '.jpg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : ext === '.png' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
      : ext === '.webp' ? bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
      : ext === '.mp4' ? bytes.toString('ascii', 4, 8) === 'ftyp'
      : ext === '.webm' && bytes.subarray(0, 4).equals(Buffer.from([26,69,223,163]));
    if (!valid) throw new Error('Unsupported or damaged media file.');
    return { name, bytes };
  });
  for (const { name, bytes } of copies) {
    const directory = path.join(root, 'site-astro', 'public', 'media', 'studio');
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, name), bytes);
  }
}

function syncInbox({ inboxPath, root = REPO_ROOT, statePath = path.join(root, '.jgold-publication-state.json') }) {
  const submissionsPath = path.resolve(inboxPath);
  if (!fs.existsSync(submissionsPath)) return { accepted: 0, rejected: 0, skipped: 0 };
  const state = readState(statePath);
  const files = fs.readdirSync(submissionsPath, { withFileTypes: true }).filter((entry) => entry.isFile() && /^[A-Za-z0-9._:-]+\.json$/.test(entry.name)).map((entry) => entry.name).sort((a, b) => {
    const date = (name) => { try { return String(JSON.parse(fs.readFileSync(path.join(submissionsPath, name), 'utf8')).createdAt || ''); } catch { return ''; } };
    return date(a).localeCompare(date(b)) || a.localeCompare(b);
  });
  const knownHashes = new Set(Object.values(state.receipts).map((receipt) => receipt && receipt.hash).filter(Boolean));
  const result = { accepted: 0, rejected: 0, skipped: 0 };
  let attempted = 0;
  for (const name of files) {
    const filePath = path.join(submissionsPath, name);
    const stat = fs.statSync(filePath);
    const bytes = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(bytes).digest('hex');
    if (knownHashes.has(hash)) {
      result.skipped += 1;
      continue;
    }
    if (attempted >= MAX_BATCH) break;
    attempted += 1;
    if (stat.size > MAX_FILE_BYTES) {
      state.receipts[`oversize:${hash}`] = { status: 'rejected', hash, reason: 'submission file is too large', processedAt: new Date().toISOString() };
      if (!state.receipts[name.slice(0, -5)]) state.receipts[name.slice(0, -5)] = { status: 'rejected', hash, reason: 'This story is too large. Split it into shorter posts.', processedAt: new Date().toISOString() };
      knownHashes.add(hash);
      result.rejected += 1;
      continue;
    }
    try {
      const envelope = validateEnvelope(JSON.parse(bytes.toString('utf8')));
      const existingReceipt = state.receipts[envelope.jobId];
      if (existingReceipt) {
        if (existingReceipt.hash !== hash) throw new Error('jobId was replayed with different content');
        result.skipped += 1;
        continue;
      }
      const prior = Object.values(state.receipts).filter((receipt) => receipt.status === 'accepted' && receipt.type === envelope.manifest.type && receipt.manifestId === envelope.manifest.id).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
      if (prior?.createdAt && prior.createdAt > envelope.createdAt) throw new Error('A newer version of this draft has already been published.');
      // Renaming and re-sending a create draft updates its first public copy.
      if (prior && !envelope.manifest.sourceId) envelope.manifest.sourceId = prior.publicId;
      copyManifestMedia(envelope.manifest, submissionsPath, root);
      const publicId = applyManifest(envelope.manifest, envelope.createdAt, root);
      state.receipts[envelope.jobId] = { status: 'accepted', hash, type: envelope.manifest.type, manifestId: envelope.manifest.id, createdAt: envelope.createdAt, publicId, processedAt: new Date().toISOString() };
      knownHashes.add(hash);
      result.accepted += 1;
    } catch (error) {
      const rejectedId = name.slice(0, -5);
      if (!state.receipts[rejectedId]) state.receipts[rejectedId] = { status: 'rejected', hash, reason: String(error instanceof Error ? error.message : error).slice(0, 300), processedAt: new Date().toISOString() };
      state.receipts[`rejected:${hash}`] = { status: 'rejected', hash, reason: String(error instanceof Error ? error.message : error).slice(0, 300), processedAt: new Date().toISOString() };
      knownHashes.add(hash);
      result.rejected += 1;
    }
  }
  writeJsonAtomic(statePath, state);
  return result;
}

if (require.main === module) {
  const argument = process.argv.find((value) => value.startsWith('--inbox='));
  if (!argument) throw new Error('Usage: sync-jgold-publications.js --inbox=/path/to/submissions');
  const result = syncInbox({ inboxPath: argument.slice('--inbox='.length) });
  process.stdout.write(`JGOLD publishing sync: ${result.accepted} accepted, ${result.rejected} rejected, ${result.skipped} already processed\n`);
}

module.exports = { applyManifest, escapeHtml, paragraphs, syncInbox, validateEnvelope, validateManifest };
