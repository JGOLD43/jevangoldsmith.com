#!/usr/bin/env node
const { spawnSync } = require('node:child_process');

const fast = process.argv.includes('--fast');

const phases = fast
  ? [
      ['content:validate'],
      ['search:audit:strict'],
      ['routes:split'],
      ['people:merge'],
      ['astro:build'],
      ['purge:css'],
      ['slim:json'],
      ['prune:dist'],
      ['perf:budget'],
      ['csp:hashes']
    ]
  : [
      ['lint'],
      ['check'],
      ['content:validate'],
      ['search:audit:strict'],
      ['snap:routes'],
      ['routes:split'],
      ['assets:optimize'],
      ['people:merge'],
      ['astro:build'],
      ['purge:css'],
      ['slim:json'],
      ['prune:dist'],
      ['perf:budget'],
      ['csp:hashes']
    ];

const commands = {
  'astro:build': ['npm', ['run', '--prefix', 'site-astro', 'build']],
  check: ['npm', ['run', '--prefix', 'site-astro', 'astro', 'check']],
  'content:validate': ['node', ['scripts/validate-content.js']],
  lint: ['npx', ['biome', 'check', 'scripts']],
  'people:merge': ['node', ['scripts/merge-people.js']],
  'perf:budget': ['node', ['scripts/check-performance-budgets.js', '--dist=dist']],
  'csp:hashes': ['node', ['scripts/update-csp-hashes.js', '--dist=dist']],
  'prune:dist': ['node', ['scripts/prune-dist-assets.js', '--dist=dist']],
  'purge:css': ['node', ['scripts/purge-css-per-page.js', '--dist=dist']],
  'slim:json': ['node', ['scripts/slim-runtime-json.js', '--dist=dist']],
  'routes:split': ['node', ['scripts/split-popular-routes.js']],
  'search:audit:strict': ['node', ['scripts/audit-search-index.js', '--strict']],
  'snap:routes': ['node', ['scripts/snap-popular-routes.js']],
  'assets:optimize': ['node', ['scripts/optimize-assets.js']]
};

for (const [name] of phases) {
  const command = commands[name];
  if (!command) {
    console.error(`[build] unknown phase: ${name}`);
    process.exit(2);
  }
  const [bin, args] = command;
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
