#!/usr/bin/env node
// Visual baseline checker. Compares current dist/ render against
// tests/visual-baselines/ at 3 viewports (desktop/tablet/mobile).
//
// Strategy: byte-identical PNG SHA-256 comparison. Anti-aliasing,
// font hinting, and image lazy-load can produce harmless byte drift,
// so this is a "fail loudly, regenerate fixture in same PR" gate, not
// a perfect pixel diff. Re-run capture after intentional visual changes.
//
// Mode: capture | check
// Capture is destructive (overwrites baselines). Check is read-only.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync, spawn, execSync } = require('child_process');

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const BASELINE_DIR = path.join(ROOT, 'tests', 'visual-baselines');
const SERVER_PORT = process.env.VISUAL_PORT || 3001;
const VIEWPORTS = [
  { label: 'desktop', size: '1440x900' },
  { label: 'tablet', size: '768x1024' },
  { label: 'mobile', size: '390x844' }
];

function sh(bin, args) {
  const res = spawnSync(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  return { code: res.status, out: res.stdout?.toString() || '', err: res.stderr?.toString() || '' };
}

function findGstack() {
  const localBin = path.join(ROOT, '.claude', 'skills', 'gstack', 'browse', 'dist', 'browse');
  if (fs.existsSync(localBin)) return localBin;
  const home = process.env.HOME || process.env.USERPROFILE;
  if (!home) return null;
  const userBin = path.join(home, '.claude', 'skills', 'gstack', 'browse', 'dist', 'browse');
  if (fs.existsSync(userBin)) return userBin;
  return null;
}

function listRoutes() {
  const skip = new Set(['api', 'assets', 'images', 'vendor', 'data', 'fonts']);
  function walk(dir, base) {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (skip.has(entry.name)) continue;
        out.push(...walk(path.join(dir, entry.name), path.posix.join(base, entry.name)));
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        out.push(path.posix.join(base, entry.name).replace(/\.html$/, ''));
      }
    }
    return out;
  }
  return walk(DIST, '').sort();
}

function safeBaselineName(route) {
  return route.replace(/\//g, '__');
}

function urlFor(route) {
  return route === 'index' ? `http://localhost:${SERVER_PORT}/` : `http://localhost:${SERVER_PORT}/${route}.html`;
}

function ensureServerUp() {
  const probe = sh('curl', ['-sI', '-m', '2', `http://localhost:${SERVER_PORT}/`]);
  if (probe.code === 0 && probe.out.startsWith('HTTP/')) return null;
  const child = spawn(
    'npx',
    ['http-server', 'dist', '-p', String(SERVER_PORT), '-c-1', '--silent'],
    { stdio: 'ignore', detached: true }
  );
  child.unref();
  for (let i = 0; i < 25; i++) {
    const probe2 = sh('curl', ['-sI', '-m', '1', `http://localhost:${SERVER_PORT}/`]);
    if (probe2.code === 0) return child.pid;
    execSync('sleep 0.2');
  }
  throw new Error(`Could not start http-server on :${SERVER_PORT}`);
}

function sha256(file) {
  if (!fs.existsSync(file)) return null;
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(file));
  return h.digest('hex');
}

function captureRoute(B, route, viewport, outDir) {
  sh(B, ['viewport', viewport.size]);
  sh(B, ['goto', urlFor(route)]);
  sh(B, ['wait', '--networkidle']);
  const out = path.join(outDir, `${safeBaselineName(route)}-${viewport.label}.png`);
  sh(B, ['screenshot', out]);
  return out;
}

function capture() {
  const B = findGstack();
  if (!B) { console.error('gstack browse binary not found'); process.exit(1); }
  ensureServerUp();
  fs.mkdirSync(BASELINE_DIR, { recursive: true });
  const routes = listRoutes();
  let count = 0;
  for (const route of routes) {
    for (const vp of VIEWPORTS) {
      captureRoute(B, route, vp, BASELINE_DIR);
      count++;
    }
  }
  console.log(`Captured ${count} baselines (${routes.length} routes × ${VIEWPORTS.length} viewports).`);
}

function check() {
  if (!fs.existsSync(BASELINE_DIR)) {
    console.error(`No baselines at ${path.relative(ROOT, BASELINE_DIR)}. Run \`node scripts/check/visual-baselines.js capture\` first.`);
    process.exit(1);
  }
  const B = findGstack();
  if (!B) { console.error('gstack browse binary not found'); process.exit(1); }
  ensureServerUp();
  const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'visual-check-'));
  const routes = listRoutes();
  const failures = [];
  let count = 0;
  for (const route of routes) {
    for (const vp of VIEWPORTS) {
      const baseline = path.join(BASELINE_DIR, `${safeBaselineName(route)}-${vp.label}.png`);
      if (!fs.existsSync(baseline)) {
        failures.push({ route, viewport: vp.label, reason: 'no baseline' });
        continue;
      }
      const current = captureRoute(B, route, vp, tmpDir);
      const a = sha256(baseline);
      const b = sha256(current);
      if (a !== b) failures.push({ route, viewport: vp.label, reason: 'pixel drift' });
      count++;
    }
  }
  if (failures.length === 0) {
    console.log(`Visual baselines OK (${count} comparisons).`);
    process.exit(0);
  }
  console.error(`Visual regressions on ${failures.length} of ${count} comparisons:`);
  for (const f of failures) console.error(`  ${f.route} (${f.viewport}): ${f.reason}`);
  console.error(`\nIf intentional, regenerate baselines with \`node scripts/check/visual-baselines.js capture\`.`);
  process.exit(1);
}

const mode = process.argv[2];
if (mode === 'capture') capture();
else if (mode === 'check' || !mode) check();
else { console.error(`Unknown mode "${mode}".`); process.exit(1); }
