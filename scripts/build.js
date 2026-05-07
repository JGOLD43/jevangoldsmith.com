#!/usr/bin/env node
const { spawnSync } = require('node:child_process');

const fast = process.argv.includes('--fast');

// Phase = [name, bin, [args...]]. Ordering matters in the post-astro:build
// pipeline: purge → critical CSS → minify → SW finalize → CSP hashes go
// last (every prior phase mutates HTML).
const COMMON_TAIL = [
  ['astro:build', 'npm', ['run', '--prefix', 'site-astro', 'build']],
  ['people:modal', 'node', ['scripts/build-people-modal-json.js', '--dist=dist']],
  ['icons:sprite', 'node', ['scripts/generate-icon-sprite.js', '--dist=dist']],
  ['purge:css', 'node', ['scripts/purge-css-per-page.js', '--dist=dist']],
  ['critical:css', 'node', ['scripts/extract-critical-css.js', '--dist=dist']],
  ['css:validate', 'node', ['scripts/validate-css-parse.js', '--dist=dist']],
  ['sw:finalize', 'node', ['scripts/finalize-sw.js', '--dist=dist']],
  ['modulepreload', 'node', ['scripts/inject-modulepreload.js', '--dist=dist']],
  ['html:min', 'node', ['scripts/minify-html.js', '--dist=dist']],
  ['slim:json', 'node', ['scripts/slim-runtime-json.js', '--dist=dist']],
  ['prune:dist', 'node', ['scripts/prune-dist-assets.js', '--dist=dist']],
  ['perf:budget', 'node', ['scripts/check-performance-budgets.js', '--dist=dist']],
  ['csp:hashes', 'node', ['scripts/update-csp-hashes.js', '--dist=dist']]
];

const phases = fast
  ? [
      ['content:validate', 'node', ['scripts/validate-content.js']],
      ['search:audit:strict', 'node', ['scripts/audit-search-index.js', '--strict']],
      ['routes:split', 'node', ['scripts/split-popular-routes.js']],
      ['people:merge', 'node', ['scripts/merge-people.js']],
      ...COMMON_TAIL
    ]
  : [
      ['lint', 'npx', ['biome', 'check', 'scripts']],
      ['check', 'npm', ['run', '--prefix', 'site-astro', 'astro', 'check']],
      ['content:validate', 'node', ['scripts/validate-content.js']],
      ['search:audit:strict', 'node', ['scripts/audit-search-index.js', '--strict']],
      ['snap:routes', 'node', ['scripts/snap-popular-routes.js']],
      ['routes:split', 'node', ['scripts/split-popular-routes.js']],
      ['assets:optimize', 'node', ['scripts/optimize-assets.js']],
      ['people:merge', 'node', ['scripts/merge-people.js']],
      ...COMMON_TAIL
    ];

for (const [name, bin, args] of phases) {
  console.log(`\n[build] ${name}`);
  const result = spawnSync(bin, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
  if (result.status !== 0) {
    console.error(`[build] failed: ${name}`);
    process.exit(result.status || 1);
  }
}
