#!/usr/bin/env node
/**
 * Per-page JS bundler for the Astro build. Mirrors what
 * scripts/legacy-build/build/js-manifest.js does: concatenates the source
 * files into a single hashed bundle file under dist-astro/assets/js/bundles/,
 * then writes a manifest so the post-build HTML normalizer can rewrite the
 * <script src="/js/X.js"> tags into one <script src="assets/js/bundles/page-X.HASH.js">.
 *
 * Goal: cut request count + close the byte-transfer gap with legacy. Each
 * page currently ships 6-9 separate <script src> tags; legacy ships 1 bundle.
 *
 * Reads source files from /js (and /vendor for dompurify), in the same
 * order the legacy build does. Bundle filenames use a 10-char content hash
 * so cache-busts work the same way.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const DIST = process.argv.find((a) => a.startsWith('--dist='))?.slice(7) || path.join(ROOT, 'dist-astro');

const collectionCore = ['js/grid-zoom.js', 'js/collection-ui.js', 'js/collection-runtime.js', 'js/collection-helpers.js', 'js/data-fetch.js'];

// Mirrors legacy js-manifest.js bundles. Source paths are relative to repo root.
const BUNDLES = {
  'page-common': ['js/theme.js', 'js/analytics.js'],
  'page-home': ['js/sanitize.js', 'js/theme.js', 'js/home.js', 'js/newsletter.js', 'js/analytics.js'],
  'page-field-notes': ['js/theme.js', 'js/newsletter.js', 'js/analytics.js'],
  'page-search': ['js/collection-ui.js', 'js/data-fetch.js', 'js/sanitize.js', 'js/theme.js', 'js/search-astro.js', 'js/analytics.js'],
  'page-videos': ['js/youtube.js', 'js/sanitize.js', 'js/theme.js', 'js/analytics.js'],
  'page-cool-shit': ['js/theme.js', 'js/analytics.js', 'js/cool-shit.js'],
  'page-important-or-not': ['js/theme.js', 'js/important-or-not.js', 'js/analytics.js'],
  'page-dateme': ['js/action-dispatcher.js', 'js/dateme.js', 'js/theme.js', 'js/analytics.js'],
  'page-adventures': ['js/action-dispatcher.js', 'js/adventures-runtime.js', 'js/adventures-ui.js', 'js/adventures-map.js', 'js/adventures.js', 'vendor/dompurify/purify.min.js', 'js/sanitize.js', 'js/theme.js', 'js/analytics.js'],
  'page-adventure-detail': ['js/action-dispatcher.js', 'js/adventure-detail.js', 'js/sanitize.js', 'js/theme.js', 'js/analytics.js'],
  'page-books': [...collectionCore, 'js/books.js', 'js/sanitize.js', 'js/theme.js', 'js/analytics.js'],
  'page-movies': [...collectionCore, 'js/action-dispatcher.js', 'js/movie-stats.js', 'js/letterboxd.js', 'js/sanitize.js', 'js/theme.js', 'js/analytics.js'],
  'page-essays': ['vendor/dompurify/purify.min.js', 'js/sanitize.js', 'js/collection-ui.js', 'js/collection-runtime.js', 'js/data-fetch.js', 'js/action-dispatcher.js', 'js/essays.js', 'js/theme.js', 'js/analytics.js'],
  'page-people': ['js/theme.js', ...collectionCore, 'js/sanitize.js', 'js/action-dispatcher.js', 'js/people.js', 'js/analytics.js'],
  'page-podcasts': [...collectionCore, 'js/sanitize.js', 'js/action-dispatcher.js', 'js/podcasts.js', 'js/theme.js', 'js/analytics.js'],
  'page-projects': ['js/grid-zoom.js', 'js/collection-ui.js', 'js/collection-runtime.js', 'js/action-dispatcher.js', 'js/task-list.js', 'js/projects.js', 'js/theme.js', 'js/analytics.js'],
  'page-challenges': ['js/grid-zoom.js', 'js/collection-ui.js', 'js/collection-runtime.js', 'js/action-dispatcher.js', 'js/task-list.js', 'js/challenges.js', 'js/theme.js', 'js/analytics.js'],
  'page-products-resources': ['js/theme.js', 'js/grid-zoom.js', 'js/shelf.js', 'js/analytics.js'],
  'page-quotes': ['js/theme.js', 'js/collection-filters.js', 'js/analytics.js']
};

// Page → bundle name. Pages not listed get page-common.
const PAGE_TO_BUNDLE = {
  'index.html': 'page-home',
  'field-notes.html': 'page-field-notes',
  'search.html': 'page-search',
  'videos.html': 'page-videos',
  'cool-shit.html': 'page-cool-shit',
  'important-or-not.html': 'page-important-or-not',
  'dateme.html': 'page-dateme',
  'adventures.html': 'page-adventures',
  'books.html': 'page-books',
  'movies.html': 'page-movies',
  'essays.html': 'page-essays',
  'people.html': 'page-people',
  'podcasts.html': 'page-podcasts',
  'projects.html': 'page-projects',
  'challenges.html': 'page-challenges',
  'products.html': 'page-products-resources',
  'free-resources.html': 'page-products-resources',
  'quotes.html': 'page-quotes'
};

function readSources(paths) {
  return paths
    .map((p) => {
      const abs = path.join(ROOT, p);
      if (!fs.existsSync(abs)) {
        console.error(`[bundle] missing source: ${p}`);
        return '';
      }
      return `/* ${p} */\n${fs.readFileSync(abs, 'utf8')}\n`;
    })
    .join('\n');
}

function hash(s) {
  return crypto.createHash('sha256').update(s).digest('hex').slice(0, 10);
}

function buildBundles() {
  const outDir = path.join(DIST, 'assets/js/bundles');
  fs.mkdirSync(outDir, { recursive: true });

  const result = {};
  for (const [name, sources] of Object.entries(BUNDLES)) {
    const content = readSources(sources);
    const h = hash(content);
    const filename = `${name}.${h}.js`;
    fs.writeFileSync(path.join(outDir, filename), content);
    result[name] = `assets/js/bundles/${filename}`;
  }
  return result;
}

function applyBundle(file, html, bundles) {
  const base = path.basename(file);
  const isAdventureDetail = /^adventure-[a-z0-9-]+\.html$/.test(base);
  const bundleName = PAGE_TO_BUNDLE[base] ?? (isAdventureDetail ? 'page-adventure-detail' : 'page-common');
  const bundlePath = bundles[bundleName];
  if (!bundlePath) return html;

  // Set of canonical /js/X.js paths that should be replaced with the bundle.
  const sources = bundleName === 'page-adventure-detail'
    ? BUNDLES['page-adventure-detail']
    : BUNDLES[bundleName];
  const sourceSet = new Set(sources.map((p) => `/${p}`));

  // Strip every <script src="/js/..."> or "/vendor/..." that's part of the bundle.
  let next = html.replace(/\n?\s*<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/gi, (tag, src) => {
    return sourceSet.has(src) ? '' : tag;
  });

  // Insert single bundle tag before </body>.
  const bundleTag = `<script src="${bundlePath}" defer></script>`;
  if (next.includes(bundleTag)) return next;
  return next.replace(/<\/body>/i, `    ${bundleTag}\n</body>`);
}

if (require.main === module) {
  const bundles = buildBundles();
  console.log(`[bundle] wrote ${Object.keys(bundles).length} bundles to ${path.relative(ROOT, path.join(DIST, 'assets/js/bundles'))}`);
  for (const [name, p] of Object.entries(bundles)) {
    const size = fs.statSync(path.join(DIST, p)).size;
    console.log(`  ${name.padEnd(28)} ${(size / 1024).toFixed(1).padStart(6)}k  ${p}`);
  }
  // Walk every HTML file under DIST and replace per-page script tags with bundle.
  function walk(dir) {
    const out = [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) out.push(...walk(full));
      else if (e.isFile() && e.name.endsWith('.html')) out.push(full);
    }
    return out;
  }
  let mutated = 0;
  for (const file of walk(DIST)) {
    const before = fs.readFileSync(file, 'utf8');
    const after = applyBundle(file, before, bundles);
    if (after !== before) {
      mutated++;
      fs.writeFileSync(file, after);
    }
  }
  console.log(`[bundle] rewrote script tags in ${mutated} pages`);
}

module.exports = { BUNDLES, PAGE_TO_BUNDLE, buildBundles, applyBundle };
