#!/usr/bin/env node
// Walks books.generated.json, people.merged.generated.json and products.json to verify
// `image` and `srcset` path resolves to a file on disk under images/. Run
// after people:merge in the build pipeline so a missing image variant
// fails the build instead of shipping broken <img> URLs.
//
// Keep the checks focused on data shapes that the runtime renders via
// SSR or hydration. Remote URLs (Unsplash, openlibrary) are excluded
// because they're not local files.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');

function pathExists(rel) {
  if (!rel) return false;
  if (/^https?:\/\//.test(rel)) return true; // remote, can't verify offline
  const clean = rel.replace(/^\//, '');
  return fs.existsSync(path.join(ROOT, clean));
}

function checkSrcset(srcset, label, failures) {
  if (!srcset) return;
  const entries = String(srcset).split(',').map((s) => s.trim());
  for (const entry of entries) {
    const [url] = entry.split(/\s+/);
    if (!url) continue;
    if (!pathExists(url)) failures.push(`${label}: srcset entry missing on disk: ${url}`);
  }
}

function checkPeople(failures) {
  const file = path.join(ROOT, 'data', 'people.merged.generated.json');
  if (!fs.existsSync(file)) {
    failures.push('people.merged.generated.json does not exist (run people:merge first)');
    return;
  }
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  const people = Array.isArray(parsed) ? parsed : (parsed.people || []);
  for (const p of people) {
    const label = `person "${p.name}"`;
    if (p.image && !pathExists(p.image)) {
      failures.push(`${label}: image missing on disk: ${p.image}`);
    }
    checkSrcset(p.srcset, label, failures);
  }
}

function checkProducts(failures) {
  const file = path.join(ROOT, 'data', 'products.json');
  if (!fs.existsSync(file)) return;
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  const products = parsed.products || [];
  for (const p of products) {
    const slug = p.slug || p.id;
    if (!slug) continue;
    // Products derive variants at SSR via filesystem; require the 640 width
    // to exist as the basic floor (matches products.astro:15 fallback).
    const found = ['jpg', 'png'].some((ext) =>
      fs.existsSync(path.join(ROOT, 'images', 'generated', 'products', `${slug}-640.${ext}`))
    );
    if (!found && p.image && !pathExists(p.image)) {
      failures.push(`product "${p.title || slug}": no generated variant or fallback image found`);
    }
  }
}

async function checkBooks(failures) {
  const books = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'books.generated.json'), 'utf8'));
  const checked = new Map();
  for (const book of books) {
    for (const field of ['coverImage', 'coverImageMedium']) {
      const cover = book[field];
      const label = `book "${book.title}": ${field}`;
      if (!cover || !pathExists(cover)) {
        failures.push(`${label} is missing${cover ? ` on disk: ${cover}` : ''}`);
        continue;
      }
      if (/^https?:\/\//.test(cover)) continue;
      if (!checked.has(cover)) {
        try {
          const { info } = await sharp(path.join(ROOT, cover.replace(/^\//, ''))).raw().toBuffer({ resolveWithObject: true });
          checked.set(cover, info.width >= 20 && info.height >= 20);
        } catch {
          checked.set(cover, false);
        }
      }
      if (!checked.get(cover)) failures.push(`${label} is not a valid cover image: ${cover}`);
    }
  }
}

async function main() {
  const failures = [];
  await checkBooks(failures);
  checkPeople(failures);
  checkProducts(failures);
  if (failures.length > 0) {
    console.error('[check-asset-integrity] FAILURES:');
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log('[check-asset-integrity] ok');
}

main().catch((error) => {
  console.error(`[check-asset-integrity] ${error.message}`);
  process.exitCode = 1;
});
