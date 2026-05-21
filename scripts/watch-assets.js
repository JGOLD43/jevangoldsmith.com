#!/usr/bin/env node
// Dev-mode asset watcher. Watches images/source/, images/people/, images/products/
// for additions and re-runs optimize-assets so new images get variants generated
// without a manual rebuild. Pairs with `npm run dev:full`.
//
// Uses fs.watch (no chokidar dep) — debounced so a single image add doesn't
// re-trigger the optimize pass mid-write.

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const WATCH_DIRS = [
  path.join(ROOT, 'images', 'source'),
  path.join(ROOT, 'images', 'people'),
  path.join(ROOT, 'images', 'products')
];

let timer = null;
let running = false;
let pending = false;

function runOptimize() {
  if (running) { pending = true; return; }
  running = true;
  console.log('[watch-assets] running optimize-assets...');
  const child = spawn('node', ['scripts/optimize-assets.js'], { cwd: ROOT, stdio: 'inherit' });
  child.on('exit', (code) => {
    running = false;
    if (code !== 0) console.warn(`[watch-assets] optimize-assets exited ${code}`);
    if (pending) { pending = false; schedule(); }
  });
}

function schedule() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(runOptimize, 250);
}

function watchDir(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`[watch-assets] skipping missing dir: ${path.relative(ROOT, dir)}`);
    return;
  }
  console.log(`[watch-assets] watching ${path.relative(ROOT, dir)}`);
  fs.watch(dir, { recursive: true }, (event, file) => {
    if (!file) return;
    // Ignore the generated tree if it lives inside a watched dir.
    if (file.includes('generated')) return;
    console.log(`[watch-assets] change: ${file} (${event})`);
    schedule();
  });
}

for (const dir of WATCH_DIRS) watchDir(dir);

console.log('[watch-assets] ready. Drop images into watched dirs and variants will regenerate.');
