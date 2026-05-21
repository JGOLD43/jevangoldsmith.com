#!/usr/bin/env node
// Content validation guard for the Phase 2 normalized collection contract.
//
// Always-fatal:
//   - duplicate normalized ids within a collection
//   - duplicate explicit slugs within a collection
//   - published items missing a title (cannot render a card without it)
//
// Strict-only (--strict, gated until source data is cleaned up):
//   - published items missing a description in collections that require one
//   - published items missing an image in collections that require one
//
// Mirrors the shape used by site-astro/src/lib/content-types.ts so the build
// catches data drift at the source instead of at deploy time.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.resolve(REPO_ROOT, 'data');

function readJson(relPath) {
  const absPath = path.resolve(DATA_DIR, relPath);
  return JSON.parse(fs.readFileSync(absPath, 'utf8'));
}

function unwrap(raw, key) {
  if (Array.isArray(raw)) return raw;
  if (key && Array.isArray(raw[key])) return raw[key];
  throw new Error(`Expected array (key=${key ?? 'root'}) in source file`);
}

function nonEmptyString(v) {
  return typeof v === 'string' && v.trim() !== '';
}

function isPublishedRaw(item, defaultStatus) {
  const status = nonEmptyString(item.status) ? item.status.toLowerCase() : defaultStatus;
  return status === 'published' || status === 'available';
}

const COLLECTIONS = [
  {
    name: 'books',
    file: 'books.json',
    key: null,
    defaultStatus: 'published',
    idFrom: ['id', 'isbn'],
    titleFrom: ['title'],
    descriptionFrom: ['shortDescription', 'review'],
    imageFrom: [],
    requiresImage: false,
    requiresDescription: true
  },
  {
    name: 'people',
    file: 'people.json',
    key: 'people',
    defaultStatus: 'published',
    idFrom: ['id'],
    titleFrom: ['name'],
    descriptionFrom: ['lesson', 'title'],
    imageFrom: ['image'],
    // Image is auto-derived from name slug in merge-people.js. The
    // merged generated file is the runtime consumer; source can omit.
    requiresImage: false,
    requiresDescription: false
  },
  {
    name: 'movies',
    file: 'movies.json',
    key: null,
    defaultStatus: 'published',
    idFrom: ['id', 'tmdbId'],
    titleFrom: ['title'],
    descriptionFrom: ['overview'],
    imageFrom: ['poster'],
    requiresImage: false,
    requiresDescription: false
  },
  {
    name: 'podcasts',
    file: 'podcasts.json',
    key: 'podcasts',
    defaultStatus: 'published',
    idFrom: ['id'],
    titleFrom: ['title'],
    descriptionFrom: ['description'],
    imageFrom: ['image'],
    requiresImage: false,
    requiresDescription: true
  },
  {
    name: 'adventures',
    file: 'adventures.json',
    key: 'adventures',
    defaultStatus: 'published',
    idFrom: ['id'],
    titleFrom: ['title'],
    descriptionFrom: ['shortDescription'],
    imageFrom: ['heroImage'],
    requiresImage: true,
    requiresDescription: true
  },
  {
    name: 'projects',
    file: 'projects.json',
    key: 'projects',
    defaultStatus: 'published',
    idFrom: ['id'],
    titleFrom: ['title'],
    descriptionFrom: ['shortDescription', 'description'],
    imageFrom: [],
    requiresImage: false,
    requiresDescription: true
  },
  {
    name: 'challenges',
    file: 'challenges.json',
    key: 'challenges',
    defaultStatus: 'published',
    idFrom: ['id'],
    titleFrom: ['title'],
    descriptionFrom: ['shortDescription', 'description'],
    imageFrom: [],
    requiresImage: false,
    requiresDescription: true
  }
];

function pickFirst(item, fields) {
  for (const f of fields) {
    const v = item[f];
    if (v == null) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    return String(v);
  }
  return null;
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function resolveId(item, cfg) {
  const fromCfg = pickFirst(item, cfg.idFrom);
  if (fromCfg) return fromCfg;
  const title = pickFirst(item, cfg.titleFrom);
  if (title) return slugify(title);
  return null;
}

// Field-shape validators. Only fire if the field is present (not null/empty)
// — never tighten the required/optional contract. Catch malformed data that
// the loose Zod schemas would accept and ship as-is.

// ISBN-10 (9 digits + checksum digit/X) or ISBN-13 (13 digits). Hyphens
// allowed and stripped before length check.
const ISBN_RE = /^[0-9X-]{10,17}$/i;
function validateIsbn(value) {
  if (value == null || value === '') return null;
  const raw = String(value);
  if (!ISBN_RE.test(raw)) return `malformed ISBN "${raw}"`;
  const digits = raw.replace(/[-\s]/g, '');
  if (digits.length !== 10 && digits.length !== 13) {
    return `ISBN "${raw}" should be 10 or 13 digits (got ${digits.length})`;
  }
  return null;
}

// URL fields — accept http/https/protocol-relative + repo-relative paths.
const URL_RE = /^(https?:\/\/|\/\/|\/|images\/|data\/|\.\.?\/)/i;
function validateUrl(value, fieldName) {
  if (value == null || value === '') return null;
  const raw = String(value).trim();
  if (raw === '#') return null;
  if (!URL_RE.test(raw)) return `${fieldName} "${raw}" doesn't look like a URL or path`;
  return null;
}

function validateYear(value, fieldName = 'year') {
  if (value == null || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return `${fieldName} "${value}" is not numeric`;
  if (num < 1000 || num > 2200) return `${fieldName} ${num} out of range (1000–2200)`;
  return null;
}

function validateDate(value, fieldName, { warnFuture = false } = {}) {
  if (value == null || value === '') return null;
  const raw = String(value).trim();
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return { error: `${fieldName} "${raw}" is not a parseable date` };
  if (warnFuture && parsed.getTime() > Date.now() + 86400000) {
    return { warning: `${fieldName} "${raw}" is in the future` };
  }
  return null;
}

const URL_LIKE_FIELDS = ['url', 'link', 'website', 'href', 'image', 'poster', 'heroImage', 'coverImage', 'coverImageMedium'];

function shapeChecks(item, cfg) {
  const errors = [];
  const warnings = [];

  if (cfg.name === 'books') {
    const isbnErr = validateIsbn(item.isbn);
    if (isbnErr) errors.push(`${cfg.name}: ${isbnErr}`);
    const yearErr = validateYear(item.year);
    if (yearErr) errors.push(`${cfg.name}: ${yearErr}`);
  }

  for (const field of URL_LIKE_FIELDS) {
    if (item[field] != null) {
      const urlErr = validateUrl(item[field], field);
      if (urlErr) errors.push(`${cfg.name}: ${urlErr}`);
    }
  }

  if (item.year != null && cfg.name !== 'books') {
    const yearErr = validateYear(item.year);
    if (yearErr) warnings.push(`${cfg.name}: ${yearErr}`);
  }

  for (const dateField of ['date', 'published', 'releaseDate', 'created', 'updated']) {
    if (item[dateField] != null) {
      const dateRes = validateDate(item[dateField], dateField, { warnFuture: isPublishedRaw(item, cfg.defaultStatus) });
      if (dateRes?.error) errors.push(`${cfg.name}: ${dateRes.error}`);
      if (dateRes?.warning) warnings.push(`${cfg.name}: ${dateRes.warning}`);
    }
  }

  return { errors, warnings };
}

function validateCollection(cfg, strict) {
  let raw;
  try {
    raw = readJson(cfg.file);
  } catch (err) {
    return { errors: [`${cfg.name}: failed to read ${cfg.file}: ${err.message}`], warnings: [] };
  }
  let arr;
  try {
    arr = unwrap(raw, cfg.key);
  } catch (err) {
    return { errors: [`${cfg.name}: ${err.message}`], warnings: [] };
  }

  const errors = [];
  const warnings = [];
  const seenIds = new Map();
  const seenSlugs = new Map();

  for (let i = 0; i < arr.length; i += 1) {
    const item = arr[i];
    if (!item || typeof item !== 'object') {
      errors.push(`${cfg.name}[${i}]: expected object, got ${typeof item}`);
      continue;
    }

    const id = resolveId(item, cfg);
    if (!id) {
      errors.push(`${cfg.name}[${i}]: cannot derive id (looked at ${cfg.idFrom.concat(cfg.titleFrom).join(', ')})`);
      continue;
    }
    if (seenIds.has(id)) {
      errors.push(`${cfg.name}: duplicate id "${id}" at index ${i} (first at ${seenIds.get(id)})`);
    } else {
      seenIds.set(id, i);
    }

    if (typeof item.slug === 'string' && item.slug.trim() !== '') {
      const slug = item.slug.trim();
      if (seenSlugs.has(slug)) {
        errors.push(`${cfg.name}: duplicate slug "${slug}" at index ${i} (first at ${seenSlugs.get(slug)})`);
      } else {
        seenSlugs.set(slug, i);
      }
    }

    if (!isPublishedRaw(item, cfg.defaultStatus)) continue;

    const title = pickFirst(item, cfg.titleFrom);
    if (!title) {
      errors.push(`${cfg.name}: published item id="${id}" missing title (looked at ${cfg.titleFrom.join(', ')})`);
    }

    if (cfg.requiresDescription) {
      const description = pickFirst(item, cfg.descriptionFrom);
      if (!description) {
        const message = strict
          ? `${cfg.name}: published item id="${id}" missing description (looked at ${cfg.descriptionFrom.join(', ')})`
          : `${cfg.name}: missing description`;
        (strict ? errors : warnings).push(message);
      }
    }

    if (cfg.requiresImage) {
      const image = pickFirst(item, cfg.imageFrom);
      if (!image) {
        const message = strict
          ? `${cfg.name}: published item id="${id}" missing image (looked at ${cfg.imageFrom.join(', ')})`
          : `${cfg.name}: missing image`;
        (strict ? errors : warnings).push(message);
      }
    }

    const shapes = shapeChecks(item, cfg);
    errors.push(...shapes.errors);
    warnings.push(...shapes.warnings);
  }

  return { errors, warnings };
}

function main() {
  const strict = process.argv.includes('--strict');
  const quiet = process.argv.includes('--quiet');
  const allErrors = [];
  const allWarnings = [];
  for (const cfg of COLLECTIONS) {
    const { errors, warnings } = validateCollection(cfg, strict);
    allErrors.push(...errors);
    allWarnings.push(...warnings);
  }

  if (!quiet) {
    const summary = new Map();
    for (const w of allWarnings) {
      summary.set(w, (summary.get(w) ?? 0) + 1);
    }
    for (const [key, count] of summary) {
      process.stdout.write(`[content-validate] WARN ${key} (${count} item${count === 1 ? '' : 's'})\n`);
    }
  }

  if (allErrors.length > 0) {
    for (const e of allErrors) {
      process.stderr.write(`[content-validate] ERROR ${e}\n`);
    }
    process.exit(1);
  }

  process.stdout.write(`[content-validate] ok: ${COLLECTIONS.length} collections passed${strict ? ' (strict)' : ''}\n`);
}

main();
