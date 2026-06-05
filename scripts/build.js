#!/usr/bin/env node
const { spawn, spawnSync } = require('node:child_process');

const fast = process.argv.includes('--fast');

// Phase = [name, bin, [args...]]. Ordering matters in the post-astro:build
// pipeline: purge → critical CSS → minify → SW finalize → CSP hashes go
// last (every prior phase mutates HTML).
const COMMON_TAIL = [
  // Generate public/sprite.svg BEFORE astro:build so Base.astro can inline it
  // (lib/icon-sprite.ts reads it at build time → icons paint with first HTML).
  ['sprite:public', 'node', ['scripts/generate-icon-sprite.js', '--public-out=site-astro/public/sprite.svg']],
  ['astro:build', 'npm', ['run', '--prefix', 'site-astro', 'build']],
  ['people:modal', 'node', ['scripts/build-people-modal-json.js', '--dist=dist']],
  ['icons:sprite', 'node', ['scripts/generate-icon-sprite.js', '--dist=dist']],
  ['post-html', 'node', ['scripts/post-html.js', '--dist=dist']],
  ['purge:css', 'node', ['scripts/purge-css-per-page.js', '--dist=dist']],
  ['critical:css', 'node', ['scripts/extract-critical-css.js', '--dist=dist']],
  ['css:validate', 'node', ['scripts/validate-css-parse.js', '--dist=dist']],
  ['sw:finalize', 'node', ['scripts/finalize-sw.js', '--dist=dist']],
  ['html:min', 'node', ['scripts/minify-html.js', '--dist=dist']],
  ['slim:json', 'node', ['scripts/slim-runtime-json.js', '--dist=dist']],
  ['prune:dist', 'node', ['scripts/prune-dist-assets.js', '--dist=dist']],
  ['perf:budget', 'node', ['scripts/check-performance-budgets.js', '--dist=dist']],
  ['csp:hashes', 'node', ['scripts/update-csp-hashes.js', '--dist=dist']]
];

function spawnAsync(name, bin, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { cwd: process.cwd(), env: process.env, stdio: 'inherit', shell: process.platform === 'win32' });
    p.on('exit', (status) => status === 0 ? resolve() : reject(new Error(`${name} exited ${status}`)));
  });
}

function runSync(name, bin, args) {
  const result = spawnSync(bin, args, { cwd: process.cwd(), env: process.env, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) { console.error(`[build] failed: ${name}`); process.exit(result.status || 1); }
}

async function main() {
  // Pre-Astro: lint + astro-check are pure-read and disjoint, parallelize.
  if (!fast) {
    console.log('\n[build] lint + check (parallel)');
    try {
      await Promise.all([
        spawnAsync('lint', 'npx', ['biome', 'check', 'scripts']),
        spawnAsync('check', 'npm', ['run', '--prefix', 'site-astro', 'astro', 'check'])
      ]);
    } catch (err) {
      console.error(`[build] failed: ${err.message}`);
      process.exit(1);
    }
  }

  // search:sync regenerates search-index.json from the source content
  // collections (books, movies, adventures, people, …). Runs BEFORE the
  // strict audit so the audit is a sanity check on the sync output, not
  // a content-drift detector that breaks the deploy every time someone
  // adds content without manually re-running the sync. (Previously the
  // index was hand-maintained, which silently rotted whenever content
  // was added in a sibling worktree / auto-batch.)
  const sequential = fast
    ? [
        ['css:build-legacy', 'node', ['scripts/build-legacy-css.js']],
        ['content:validate', 'node', ['scripts/validate-content.js']],
        ['search:sync', 'node', ['scripts/sync-search-index.js', '--write']],
        ['search:audit:strict', 'node', ['scripts/audit-search-index.js', '--strict']],
        ['routes:split', 'node', ['scripts/split-popular-routes.js']],
        ['books:generate', 'node', ['scripts/build-books-generated.js']],
        ['people:merge', 'node', ['scripts/merge-people.js']],
        ['assets:integrity', 'node', ['scripts/check-asset-integrity.js']],
        ['slim:countries', 'node', ['scripts/slim-countries.js']],
        ...COMMON_TAIL
      ]
    : [
        ['css:build-legacy', 'node', ['scripts/build-legacy-css.js']],
        ['content:validate', 'node', ['scripts/validate-content.js']],
        ['search:sync', 'node', ['scripts/sync-search-index.js', '--write']],
        ['search:audit:strict', 'node', ['scripts/audit-search-index.js', '--strict']],
        ['snap:routes', 'node', ['scripts/snap-popular-routes.js']],
        ['routes:split', 'node', ['scripts/split-popular-routes.js']],
        ['assets:optimize', 'node', ['scripts/optimize-assets.js']],
        ['books:generate', 'node', ['scripts/build-books-generated.js']],
        ['people:merge', 'node', ['scripts/merge-people.js']],
        ['assets:integrity', 'node', ['scripts/check-asset-integrity.js']],
        ['slim:countries', 'node', ['scripts/slim-countries.js']],
        ...COMMON_TAIL
      ];

  for (const [name, bin, args] of sequential) {
    console.log(`\n[build] ${name}`);
    runSync(name, bin, args);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
