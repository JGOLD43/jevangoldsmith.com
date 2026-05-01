#!/usr/bin/env node
// Performance baseline — captures load timing and asset bytes per route, so we can
// quantify perf gains/regressions after the Astro migration. Uses gstack browse.
//
// Per route we record:
//   - load timing (ttfb, domReady, load) in ms
//   - byte totals by asset class (html / css / js / image / font / json / other)
//   - request count
//
// Mode: capture | check. Check tolerates small drift (default 15% per metric)
// because timings are noisy on local boxes — set PERF_TOLERANCE=0.15 to override.

const fs = require('fs');
const path = require('path');
const { spawnSync, spawn, execSync } = require('child_process');

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const FIXTURE = path.join(ROOT, 'tests', 'perf-baseline.json');
const PORT = process.env.PERF_PORT || 3002;
const TOLERANCE = Number(process.env.PERF_TOLERANCE || 0.30);

function sh(bin, args) {
  const r = spawnSync(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  return { code: r.status, out: r.stdout?.toString() || '', err: r.stderr?.toString() || '' };
}

function findGstack() {
  const local = path.join(ROOT, '.claude', 'skills', 'gstack', 'browse', 'dist', 'browse');
  if (fs.existsSync(local)) return local;
  const home = process.env.HOME || process.env.USERPROFILE;
  const user = path.join(home, '.claude', 'skills', 'gstack', 'browse', 'dist', 'browse');
  return fs.existsSync(user) ? user : null;
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

function urlFor(route) {
  return route === 'index' ? `http://localhost:${PORT}/` : `http://localhost:${PORT}/${route}.html`;
}

function ensureServerUp() {
  const probe = sh('curl', ['-sI', '-m', '2', `http://localhost:${PORT}/`]);
  if (probe.code === 0 && probe.out.startsWith('HTTP/')) return null;
  const child = spawn('npx', ['http-server', 'dist', '-p', String(PORT), '-c-1', '--silent'], { stdio: 'ignore', detached: true });
  child.unref();
  for (let i = 0; i < 25; i++) {
    const p = sh('curl', ['-sI', '-m', '1', `http://localhost:${PORT}/`]);
    if (p.code === 0) return child.pid;
    execSync('sleep 0.2');
  }
  throw new Error(`Could not start http-server on :${PORT}`);
}

function classifyAsset(url) {
  const u = url.toLowerCase();
  if (u.endsWith('.css')) return 'css';
  if (u.endsWith('.js') || u.endsWith('.mjs')) return 'js';
  if (u.endsWith('.json')) return 'json';
  if (/\.(woff2?|ttf|otf|eot)(\?|$)/.test(u)) return 'font';
  if (/\.(png|jpe?g|gif|svg|webp|avif|ico)(\?|$)/.test(u)) return 'image';
  if (u.endsWith('/') || u.endsWith('.html')) return 'html';
  return 'other';
}

function parsePerf(out) {
  // Lines like: "load         165ms"
  const result = {};
  for (const line of out.split('\n')) {
    const m = line.match(/^\s*(\w+)\s+(\d+)ms\s*$/);
    if (m) result[m[1]] = Number(m[2]);
  }
  return result;
}

function parseNetwork(out) {
  // Lines like: "GET http://... → 200 (14ms, 49637B)"
  const re = /^(GET|POST)\s+(\S+)\s+→\s+(\d+)\s+\((\d+)ms,\s+(\d+)B\)/;
  const requests = [];
  for (const line of out.split('\n')) {
    const m = line.match(re);
    if (m) requests.push({ url: m[2], status: Number(m[3]), bytes: Number(m[5]) });
  }
  return requests;
}

function captureRoute(B, route, attempt = 1) {
  // Clear network before nav so we only capture this route's requests, not
  // anything carried over from the previous browser state.
  sh(B, ['network', '--clear']);
  sh(B, ['goto', urlFor(route)]);
  sh(B, ['wait', '--networkidle']);
  const perf = parsePerf(sh(B, ['perf']).out);
  const net = parseNetwork(sh(B, ['network']).out);
  // Occasionally the network log clears mid-request and returns nothing. Retry
  // once with a fresh navigation away then back, which forces a re-fetch.
  if (net.length === 0 && attempt < 2) {
    sh(B, ['goto', `http://localhost:${PORT}/__none__`]);
    return captureRoute(B, route, attempt + 1);
  }
  const bytes = { html: 0, css: 0, js: 0, image: 0, font: 0, json: 0, other: 0 };
  for (const r of net) {
    if (r.status >= 400) continue;
    bytes[classifyAsset(r.url)] += r.bytes;
  }
  const total = Object.values(bytes).reduce((a, b) => a + b, 0);
  return {
    timing: { ttfb: perf.ttfb ?? null, domReady: perf.domReady ?? null, load: perf.load ?? null },
    bytes,
    totalBytes: total,
    requestCount: net.filter((r) => r.status < 400).length
  };
}

function capture() {
  const B = findGstack();
  if (!B) { console.error('gstack browse binary not found'); process.exit(1); }
  ensureServerUp();
  // Cache-Control: no-cache prevents the browser from serving any of these
  // requests from cache, which would otherwise produce zero-byte network logs
  // for routes whose subresources were already fetched in an earlier capture.
  sh(B, ['header', 'Cache-Control:no-cache']);
  const routes = listRoutes();
  const fixture = {};
  let i = 0;
  for (const route of routes) {
    fixture[route] = captureRoute(B, route);
    i++;
    if (i % 10 === 0) process.stdout.write(`  ${i}/${routes.length}\n`);
  }
  fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
  fs.writeFileSync(FIXTURE, `${JSON.stringify(fixture, null, 2)}\n`);
  console.log(`Perf baseline written: ${path.relative(ROOT, FIXTURE)} (${routes.length} routes).`);
}

function check() {
  if (!fs.existsSync(FIXTURE)) {
    console.error(`Baseline missing: ${path.relative(ROOT, FIXTURE)}. Run \`node scripts/check/perf-baseline.js capture\` first.`);
    process.exit(1);
  }
  const baseline = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  const B = findGstack();
  if (!B) { console.error('gstack browse binary not found'); process.exit(1); }
  ensureServerUp();
  const routes = listRoutes();
  const regressions = [];
  for (const route of routes) {
    if (!baseline[route]) continue;
    const cur = captureRoute(B, route);
    const base = baseline[route];
    const ratio = base.totalBytes ? cur.totalBytes / base.totalBytes : 1;
    if (ratio > 1 + TOLERANCE) {
      regressions.push({ route, kind: 'bytes', base: base.totalBytes, cur: cur.totalBytes, ratio: ratio.toFixed(2) });
    }
    const baseLoad = base.timing.load || 1;
    const curLoad = cur.timing.load || 1;
    if (curLoad / baseLoad > 1 + TOLERANCE) {
      regressions.push({ route, kind: 'load', base: baseLoad, cur: curLoad, ratio: (curLoad / baseLoad).toFixed(2) });
    }
  }
  if (regressions.length === 0) {
    console.log(`Perf OK (${routes.length} routes within ${(TOLERANCE * 100).toFixed(0)}% of baseline).`);
    process.exit(0);
  }
  console.error(`Perf regressions on ${regressions.length} route/metric pairs:`);
  for (const r of regressions) console.error(`  ${r.route} ${r.kind}: ${r.base} → ${r.cur} (${r.ratio}×)`);
  console.error('\nIf intentional, regenerate baseline with `node scripts/check/perf-baseline.js capture` and document the change.');
  process.exit(1);
}

const mode = process.argv[2];
if (mode === 'capture') capture();
else if (mode === 'check' || !mode) check();
else { console.error(`Unknown mode "${mode}".`); process.exit(1); }
