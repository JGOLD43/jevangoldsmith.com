#!/usr/bin/env node
/**
 * Post-build HTML normalizer for the Astro output.
 *
 * Wraps optimized <img> tags in <picture> with AVIF + WebP <source> siblings,
 * localizes remote unsplash/openlibrary references to local generated rasters,
 * strips static leaflet/font links, and rewrites the legacy hard-coded image
 * paths (images/profile.jpg, images/logo.png, images/zen-nature.jpg) to their
 * generated variants. Mirrors what the legacy build does in build-site.js
 * (steps 266-278 of buildPage), so the Astro output reaches parity without
 * each Astro page being rewritten by hand.
 *
 * Requires: data/remote-assets.generated.json (produced by snap:routes /
 * assets:optimize). Reuses scripts/legacy-build/build/html-normalize.js
 * directly so we don't fork the implementation.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

const DIST = process.argv.find((a) => a.startsWith('--dist='))?.slice(7)
  || path.join(ROOT, 'dist-astro');

if (!fs.existsSync(DIST)) {
  console.error(`[normalize] missing dir: ${DIST}`);
  process.exit(2);
}

const remoteAssetsPath = path.join(ROOT, 'data/remote-assets.generated.json');
const remoteAssets = fs.existsSync(remoteAssetsPath)
  ? JSON.parse(fs.readFileSync(remoteAssetsPath, 'utf8'))
  : {};

const ctas = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ctas.json'), 'utf8'));
const ctaByHref = new Map((ctas.ctas || []).map((c) => [c.href, c]));

const SITE_ORIGIN = 'https://jevangoldsmith.com';

function ctaLocationFor(file) {
  return file.replace(/\.html$/, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}

// Legacy injectRelatedInternalLinks puts <section class="seo-related-section">
// INSIDE </main>. Astro's Base.astro emits it AFTER </main> via the SeoRelated
// component. To match legacy layout, move the section so it's the last element
// inside <main>...</main>.
function moveSeoRelatedInsideMain(html) {
  const sectionRegex = /<section class="seo-related-section"[\s\S]*?<\/section>/g;
  const matches = [...html.matchAll(sectionRegex)];
  if (matches.length === 0) return html;
  // Use the LAST occurrence (in case there are multiples) to move inside main.
  const last = matches[matches.length - 1];
  const sectionHtml = last[0];
  const mainCloseIdx = html.indexOf('</main>');
  if (mainCloseIdx < 0) return html;
  // Skip if the section is already inside <main>: section position < </main> position.
  if (last.index < mainCloseIdx) return html;

  // Strip the section from where it currently sits.
  const stripped = html.slice(0, last.index) + html.slice(last.index + sectionHtml.length);
  // Re-find </main> in the stripped string and insert before it.
  const newMainCloseIdx = stripped.indexOf('</main>');
  if (newMainCloseIdx < 0) return html;
  return stripped.slice(0, newMainCloseIdx) + sectionHtml + '\n' + stripped.slice(newMainCloseIdx);
}

function injectFieldNotesCta(file, html) {
  const base = path.basename(file);
  const eligible = base === 'essays.html' || base === 'reading-philosophy.html';
  if (!eligible || html.includes('data-field-notes-inline')) return html;
  const location = escapeHtmlAttr(base.replace(/\.html$/, ''));
  const block = `<section class="field-notes-inline-cta" data-field-notes-inline>
        <p class="archive-kicker">Field Notes</p>
        <h2>Want more notes like this?</h2>
        <p>Field Notes is where I send useful ideas before they become polished essays: books, objects, questions, and experiments worth keeping.</p>
        <a href="field-notes.html" class="btn-primary" data-analytics="cta" data-cta-id="newsletter" data-cta-location="${location}-inline">Get Field Notes</a>
    </section>`;
  return html.replace('</main>', `    ${block}\n</main>`);
}

function decorateTrackedLinks(file, html) {
  const location = ctaLocationFor(file);
  return html.replace(/<a\b([^>]*?)href=(["'])([^"']+)\2([^>]*)>/gi, (match, before, quote, href, after) => {
    if (/data-analytics=/.test(match)) return match;
    const cta = ctaByHref.get(href);
    if (cta) {
      return `<a${before}href=${quote}${href}${quote}${after} data-analytics="cta" data-cta-id="${escapeHtmlAttr(cta.id)}" data-cta-location="${escapeHtmlAttr(location)}">`;
    }
    if (/^mailto:/i.test(href) || href.includes('contact.html') || href.includes('meet.html')) {
      return `<a${before}href=${quote}${href}${quote}${after} data-analytics="contact" data-cta-location="${escapeHtmlAttr(location)}">`;
    }
    return match;
  });
}

function escapeHtmlAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function absolutizeAsset(asset) {
  if (!asset) return `${SITE_ORIGIN}/images/logo.png`;
  if (/^https?:\/\//i.test(asset)) return asset;
  return `${SITE_ORIGIN}/${asset.replace(/^\//, '')}`;
}

const { createHtmlNormalizers } = require(
  path.join(ROOT, 'scripts/legacy-build/build/html-normalize.js')
);

const normalizers = createHtmlNormalizers({ remoteAssets, escapeHtmlAttr, absolutizeAsset });
const {
  optimizeLocalImageReferences,
  localizeRemainingRemoteAssetReferences,
  removeStaticLeafletTags,
  removeExternalFontLinks
} = normalizers;

function walkHtml(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkHtml(full));
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const files = walkHtml(DIST);

let changed = 0;
let totalDelta = 0;
const sample = [];

for (const file of files) {
  const before = fs.readFileSync(file, 'utf8');
  let after = before;

  // Adventures gets the static leaflet tags removed in the legacy build (the
  // map ships its own loader). Match: adventure-* detail pages too.
  const rel = path.relative(DIST, file);
  const isAdventure = rel === 'adventures.html' || /^adventure-/.test(rel);
  if (isAdventure) after = removeStaticLeafletTags(after);

  after = removeExternalFontLinks(after);
  after = optimizeLocalImageReferences(after);
  after = localizeRemainingRemoteAssetReferences(after);
  after = injectFieldNotesCta(rel, after);
  after = moveSeoRelatedInsideMain(after);
  after = decorateTrackedLinks(rel, after);

  if (after !== before) {
    changed++;
    const delta = after.length - before.length;
    totalDelta += delta;
    if (sample.length < 5) sample.push({ rel, delta });
    fs.writeFileSync(file, after);
  }
}

console.log(`[normalize] processed ${files.length} files, mutated ${changed}, total delta ${totalDelta >= 0 ? '+' : ''}${totalDelta} bytes`);
for (const s of sample) console.log(`  ${s.rel} ${s.delta >= 0 ? '+' : ''}${s.delta}`);
