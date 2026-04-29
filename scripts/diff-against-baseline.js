#!/usr/bin/env node
// Behavior-preserving refactor harness.
// Diffs current dist/ against dist-baseline/ ignoring noise that should not
// fail a structural refactor:
//   - asset filename hashes (foo.0840071790.css -> foo.HASH.css)
//   - asset-manifest.json (regenerated each build)
//   - data/generated-manifest.json (regenerated each build)
//   - whitespace-only differences inside HTML
//   - JSON-LD key ordering inside <script type="application/ld+json"> blocks
//
// Exits 1 when a meaningful diff is found, 0 otherwise.

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const baselineDir = path.join(root, 'dist-baseline');
const currentDir = path.join(root, 'dist');

if (!fs.existsSync(baselineDir)) {
  console.error('dist-baseline/ missing. Run `cp -R dist dist-baseline` at a known-good commit.');
  process.exit(2);
}

const IGNORED_FILES = new Set([
  'asset-manifest.json',
  'data/generated-manifest.json'
]);

const HASH_PATTERN = /\.([a-f0-9]{8,16})\.(css|js)\b/g;

function walk(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(base, full);
    if (entry.isDirectory()) walk(full, base, out);
    else out.push(rel);
  }
  return out;
}

function normalizeAssetHashes(text) {
  return text.replace(HASH_PATTERN, '.HASH.$2');
}

function sortJsonLd(text) {
  return text.replace(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
    (match, body) => {
      try {
        const data = JSON.parse(body);
        return `<script type="application/ld+json">${JSON.stringify(data, Object.keys(data).sort())}</script>`;
      } catch {
        return match;
      }
    }
  );
}

function collapseWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function normalizeHtml(text) {
  return collapseWhitespace(sortJsonLd(normalizeAssetHashes(text)));
}

function normalizeJson(text) {
  try {
    const data = JSON.parse(text);
    return JSON.stringify(data, Object.keys(data).sort());
  } catch {
    return text;
  }
}

function normalizeFor(file, text) {
  if (file.endsWith('.html')) return normalizeHtml(text);
  if (file.endsWith('.json')) return normalizeAssetHashes(normalizeJson(text));
  if (file.endsWith('.css') || file.endsWith('.js') || file.endsWith('.txt') || file.endsWith('.xml')) {
    return normalizeAssetHashes(text);
  }
  return text;
}

function readSafe(file) {
  if (!fs.existsSync(file)) return null;
  const stat = fs.statSync(file);
  if (stat.isDirectory()) return null;
  if (stat.size > 5 * 1024 * 1024) return `__BINARY__:${stat.size}`;
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return `__BINARY__:${stat.size}`;
  }
}

function diff() {
  const baselineFiles = new Set(walk(baselineDir).map((p) => p.replace(/\\/g, '/')));
  const currentFiles = new Set(walk(currentDir).map((p) => p.replace(/\\/g, '/')));

  const missing = [];
  const added = [];
  const changed = [];

  for (const file of baselineFiles) {
    if (IGNORED_FILES.has(file)) continue;
    if (!currentFiles.has(file)) {
      // strip out hashed assets that just got renamed
      const baseStripped = file.replace(HASH_PATTERN, '.HASH.$2');
      const currentMatch = [...currentFiles].some(
        (cf) => cf.replace(HASH_PATTERN, '.HASH.$2') === baseStripped
      );
      if (!currentMatch) missing.push(file);
    }
  }

  for (const file of currentFiles) {
    if (IGNORED_FILES.has(file)) continue;
    if (!baselineFiles.has(file)) {
      const stripped = file.replace(HASH_PATTERN, '.HASH.$2');
      const baselineMatch = [...baselineFiles].some(
        (bf) => bf.replace(HASH_PATTERN, '.HASH.$2') === stripped
      );
      if (!baselineMatch) added.push(file);
    }
  }

  for (const file of baselineFiles) {
    if (IGNORED_FILES.has(file)) continue;
    if (!currentFiles.has(file)) continue;
    const a = readSafe(path.join(baselineDir, file));
    const b = readSafe(path.join(currentDir, file));
    if (a === null || b === null) continue;
    if (typeof a === 'string' && a.startsWith('__BINARY__')) {
      if (a !== b) changed.push({ file, reason: 'binary-size-changed' });
      continue;
    }
    const na = normalizeFor(file, a);
    const nb = normalizeFor(file, b);
    if (na !== nb) {
      changed.push({ file, reason: 'content-changed', sizeBaseline: a.length, sizeCurrent: b.length });
    }
  }

  return { missing, added, changed };
}

function summarize(result) {
  const { missing, added, changed } = result;
  const total = missing.length + added.length + changed.length;
  if (total === 0) {
    console.log('diff-against-baseline: clean (HTML normalized for asset hashes, JSON-LD ordering, whitespace).');
    return 0;
  }

  console.log(`diff-against-baseline: ${total} difference(s).`);
  if (missing.length) {
    console.log(`  missing (${missing.length}):`);
    for (const f of missing.slice(0, 20)) console.log(`    - ${f}`);
    if (missing.length > 20) console.log(`    ... ${missing.length - 20} more`);
  }
  if (added.length) {
    console.log(`  added (${added.length}):`);
    for (const f of added.slice(0, 20)) console.log(`    + ${f}`);
    if (added.length > 20) console.log(`    ... ${added.length - 20} more`);
  }
  if (changed.length) {
    console.log(`  changed (${changed.length}):`);
    for (const c of changed.slice(0, 20)) console.log(`    ~ ${c.file} [${c.reason}] ${c.sizeBaseline ?? ''} -> ${c.sizeCurrent ?? ''}`);
    if (changed.length > 20) console.log(`    ... ${changed.length - 20} more`);
  }
  return 1;
}

const code = summarize(diff());
process.exit(code);
