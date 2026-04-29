#!/usr/bin/env node
// Capture canonical-page screenshots into tests/visual-baselines/.
// Usage:
//   node scripts/check/visual-baselines.js          # capture or refresh baseline
//
// Requires gstack browse binary at ~/.claude/skills/gstack/browse/dist/browse
// and http-server already running on port 3000 with dist/ as root.
//
// Baselines are reference screenshots for human review during refactors.
// They are NOT diffed mechanically — pages with maps, animations, or async
// content produce too many false positives for byte-size or pixel diffs.
// To verify a refactor visually: capture before, refactor, re-capture, then
// compare the two folders side-by-side in the file viewer of your choice.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { root } = require('./harness');

const baselineDir = path.join(root, 'tests', 'visual-baselines');
const browseBin = process.env.GSTACK_BROWSE
  || path.join(process.env.HOME || '/root', '.claude', 'skills', 'gstack', 'browse', 'dist', 'browse');

const PAGES = [
  'index.html',
  'books.html',
  'movies.html',
  'projects.html',
  'challenges.html',
  'quotes.html',
  'products.html',
  'free-resources.html',
  'adventures.html',
  'adventure-japan-adventure.html'
];

fs.mkdirSync(baselineDir, { recursive: true });

if (!fs.existsSync(browseBin)) {
  console.error(`gstack browse binary not found at ${browseBin}.`);
  console.error('Skipping visual baselines (run /browse setup once to install).');
  process.exit(0);
}

for (const page of PAGES) {
  const url = `http://localhost:3000/${page}`;
  const out = path.join(baselineDir, `${page.replace(/\.html$/, '')}.png`);
  spawnSync(browseBin, ['goto', url], { stdio: 'inherit' });
  spawnSync(browseBin, ['screenshot', out], { stdio: 'inherit' });
}

console.log(`Captured ${PAGES.length} baselines into ${path.relative(root, baselineDir)}/`);
