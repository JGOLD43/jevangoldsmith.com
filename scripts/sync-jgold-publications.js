#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

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
  ownKeys(raw, ['version', 'id', 'type', 'title', 'summary', 'body', 'sourceId', 'operation'], 'content manifest');
  return {
    version: 1,
    id: identifier(raw.id, 'manifest.id'),
    type: raw.type,
    title: boundedString(raw.title, 'manifest.title', 240, { empty: false }),
    summary: boundedString(raw.summary, 'manifest.summary', 2_000),
    body: boundedString(raw.body, 'manifest.body', 200_000, { empty: false }),
    sourceId: nullableIdentifier(raw.sourceId, 'manifest.sourceId'),
    operation: raw.operation,
  };
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
  switch (manifest.type) {
    case 'essay':
      return { ...existing, id: publicId, title: manifest.title, subtitle: manifest.summary, author: 'Jevan Goldsmith', date: String(existing.date || timestamp.slice(0, 10)), category: existing.category || 'Ideas', status: 'published', content: paragraphs(manifest.body), featuredImage: existing.featuredImage ?? null, media: Array.isArray(existing.media) ? existing.media : [], createdAt: existing.createdAt || timestamp, updatedAt: timestamp };
    case 'adventure':
      return { ...existing, id: publicId, title: manifest.title, subtitle: manifest.summary, shortDescription: manifest.summary, content: paragraphs(manifest.body), status: 'published', location: existing.location || '', region: existing.region || '', startDate: existing.startDate || timestamp.slice(0, 10), endDate: existing.endDate || '', duration: existing.duration || '', heroImage: existing.heroImage || '', highlights: Array.isArray(existing.highlights) ? existing.highlights : [], gallery: Array.isArray(existing.gallery) ? existing.gallery : [], tags: Array.isArray(existing.tags) ? existing.tags : [] };
    case 'project':
      return { ...existing, id: publicId, slug: existing.slug || publicId, title: manifest.title, shortDescription: manifest.summary, description: manifest.body, status: existing.status === 'draft' ? 'active' : existing.status || 'active', category: existing.category || 'building' };
    case 'challenge':
      return { ...existing, id: publicId, slug: existing.slug || publicId, title: manifest.title, shortDescription: manifest.summary || manifest.body, status: existing.status === 'draft' ? 'active' : existing.status || 'active', category: existing.category || 'personal', timeframe: existing.timeframe || 'In progress' };
    case 'product':
      return { ...existing, id: publicId, slug: existing.slug || publicId, title: manifest.title, shortDescription: manifest.summary, description: manifest.body, status: existing.status === 'draft' ? 'available' : existing.status || 'available', category: existing.category || 'tech', type: existing.type || 'recommendation' };
    case 'quote':
      return { ...existing, id: publicId, slug: existing.slug || publicId, text: manifest.body || manifest.title, author: manifest.summary || existing.author || 'Jevan Goldsmith', status: 'available', category: existing.category || 'ideas', topics: Array.isArray(existing.topics) ? existing.topics : [], tags: Array.isArray(existing.tags) ? existing.tags : [] };
    case 'now':
      return { ...existing, lastUpdated: timestamp.slice(0, 10), sections: [{ title: manifest.title, body: paragraphs(manifest.body) }] };
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
    Object.assign(document, applyPublicFields(document, manifest, publicId, timestamp));
    writeJsonAtomic(filePath, document);
    return publicId;
  }
  const records = Array.isArray(document[target.key]) ? [...document[target.key]] : [];
  const index = records.findIndex((record) => record.id === publicId || record.slug === publicId || (manifest.type === 'book' && ((manifest.book.isbn && record.isbn === manifest.book.isbn) || (record.title === manifest.book.title && record.author === manifest.book.author))));
  const next = applyPublicFields(index >= 0 ? records[index] : {}, manifest, publicId, timestamp);
  if (index >= 0) records[index] = next;
  else records.unshift(next);
  document[target.key] = records;
  if (Object.hasOwn(document, 'lastUpdated')) document.lastUpdated = timestamp;
  writeJsonAtomic(filePath, document);
  return publicId;
}

function syncInbox({ inboxPath, root = REPO_ROOT, statePath = path.join(root, '.jgold-publication-state.json') }) {
  const submissionsPath = path.resolve(inboxPath);
  if (!fs.existsSync(submissionsPath)) return { accepted: 0, rejected: 0, skipped: 0 };
  const state = readState(statePath);
  const files = fs.readdirSync(submissionsPath, { withFileTypes: true }).filter((entry) => entry.isFile() && /^[A-Za-z0-9._:-]+\.json$/.test(entry.name)).map((entry) => entry.name).sort();
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
      const publicId = applyManifest(envelope.manifest, envelope.createdAt, root);
      state.receipts[envelope.jobId] = { status: 'accepted', hash, type: envelope.manifest.type, publicId, processedAt: new Date().toISOString() };
      knownHashes.add(hash);
      result.accepted += 1;
    } catch (error) {
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
