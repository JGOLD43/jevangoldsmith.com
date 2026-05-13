#!/usr/bin/env node
// Phase 0: Lighthouse baseline runner.
//
// Drives lighthouse against the served dist on http://localhost:8765
// for the 8 highest-traffic routes and writes a markdown summary to
// docs/perf-baseline-<date>.md (or wherever --out points).
//
// Usage:
//   npm run perf:lighthouse
//   npm run perf:lighthouse -- --out=docs/perf-after-phase-1.md
//
// Requires Chrome installed (uses macOS default location). The runner
// itself is the @lhci/cli node_modules CLI under site-astro/.

'use strict';

const { execSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const BASE = process.env.LIGHTHOUSE_BASE || 'http://localhost:8765';
const ROUTES = [
  '/',
  '/books.html',
  '/movies.html',
  '/people.html',
  '/adventures.html',
  '/podcasts.html',
  '/essays.html',
  '/search.html'
];

const argOut = process.argv.find((a) => a.startsWith('--out='))?.slice(6);
const outPath = path.resolve(
  ROOT,
  argOut || `docs/perf-baseline-${new Date().toISOString().slice(0, 10)}.md`
);

function checkBaseUp() {
  const result = spawnSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', BASE], { encoding: 'utf8' });
  if (result.stdout.trim() !== '200') {
    process.stderr.write(`[perf] ${BASE} not reachable (got ${result.stdout || 'connection error'}). Start http-server first.\n`);
    process.exit(2);
  }
}

const RUNS_PER_ROUTE = Number(process.env.LIGHTHOUSE_RUNS || 3);

function runLighthouseOnce(url, idx) {
  const lighthouseBin = path.resolve(ROOT, 'site-astro/node_modules/lighthouse/cli/index.js');
  if (!fs.existsSync(lighthouseBin)) {
    return { error: `lighthouse not installed at ${lighthouseBin}` };
  }
  const tmp = path.join(ROOT, '.perf-tmp', `${encodeURIComponent(url)}.run-${idx}.json`);
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  const fullUrl = url.startsWith('http') ? url : `${BASE}${url}`;

  const args = [
    lighthouseBin,
    fullUrl,
    '--output=json',
    `--output-path=${tmp}`,
    '--quiet',
    '--chrome-flags=--headless=new --no-sandbox --disable-gpu',
    '--only-categories=performance',
    '--throttling-method=simulate',
    '--preset=desktop'
  ];

  const result = spawnSync('node', args, { encoding: 'utf8', timeout: 120000 });
  if (result.status !== 0) {
    return { error: `lighthouse exited ${result.status}: ${(result.stderr || '').slice(0, 400)}` };
  }
  const report = JSON.parse(fs.readFileSync(tmp, 'utf8'));
  const audits = report.audits || {};
  return {
    score: Math.round(((report.categories?.performance?.score) || 0) * 100),
    lcp: audits['largest-contentful-paint']?.numericValue ?? null,
    cls: audits['cumulative-layout-shift']?.numericValue ?? null,
    tbt: audits['total-blocking-time']?.numericValue ?? null,
    fcp: audits['first-contentful-paint']?.numericValue ?? null,
    si: audits['speed-index']?.numericValue ?? null,
    totalBytes: audits['total-byte-weight']?.numericValue ?? null
  };
}

function median(values) {
  const filtered = values.filter((v) => v != null);
  if (filtered.length === 0) return null;
  const sorted = filtered.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function runLighthouse(url) {
  const runs = [];
  for (let i = 0; i < RUNS_PER_ROUTE; i++) {
    const r = runLighthouseOnce(url, i);
    if (r.error) return r;
    runs.push(r);
  }
  return {
    url,
    fullUrl: url.startsWith('http') ? url : `${BASE}${url}`,
    score: Math.round(median(runs.map((r) => r.score))),
    lcp: median(runs.map((r) => r.lcp)),
    cls: median(runs.map((r) => r.cls)),
    tbt: median(runs.map((r) => r.tbt)),
    fcp: median(runs.map((r) => r.fcp)),
    si: median(runs.map((r) => r.si)),
    totalBytes: median(runs.map((r) => r.totalBytes))
  };
}

function fmtMs(v) {
  if (v == null) return '—';
  return `${Math.round(v)}ms`;
}
function fmtCls(v) {
  if (v == null) return '—';
  return v.toFixed(3);
}
function fmtKb(v) {
  if (v == null) return '—';
  return `${(v / 1024).toFixed(1)}KB`;
}

function main() {
  checkBaseUp();
  process.stdout.write(`[perf] running lighthouse against ${BASE} for ${ROUTES.length} routes...\n`);

  const results = [];
  for (const route of ROUTES) {
    process.stdout.write(`[perf]   ${route} ... `);
    const t0 = Date.now();
    const r = runLighthouse(route);
    if (r.error) {
      process.stdout.write(`ERROR: ${r.error}\n`);
      results.push({ url: route, error: r.error });
    } else {
      process.stdout.write(`score=${r.score} LCP=${fmtMs(r.lcp)} CLS=${fmtCls(r.cls)} TBT=${fmtMs(r.tbt)} bytes=${fmtKb(r.totalBytes)} (${Date.now() - t0}ms)\n`);
      results.push(r);
    }
  }

  let buildHash = '';
  try {
    buildHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {}

  const lines = [];
  lines.push(`# Lighthouse baseline — ${new Date().toISOString().slice(0, 10)}`);
  lines.push('');
  lines.push(`**Build**: \`${buildHash}\``);
  lines.push(`**Base URL**: \`${BASE}\``);
  lines.push(`**Preset**: desktop, simulated throttling, performance category only`);
  lines.push('');
  lines.push('| Route | Score | LCP | CLS | TBT | FCP | SI | Total Bytes |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|---:|');
  for (const r of results) {
    if (r.error) {
      lines.push(`| ${r.url} | — | — | — | — | — | — | (error: ${r.error.slice(0, 60)}) |`);
    } else {
      lines.push(`| ${r.url} | ${r.score} | ${fmtMs(r.lcp)} | ${fmtCls(r.cls)} | ${fmtMs(r.tbt)} | ${fmtMs(r.fcp)} | ${fmtMs(r.si)} | ${fmtKb(r.totalBytes)} |`);
    }
  }
  lines.push('');
  lines.push(`Captured by \`scripts/perf-lighthouse.js\`. Re-run with \`npm run perf:lighthouse\`.`);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, lines.join('\n') + '\n');
  process.stdout.write(`\n[perf] wrote ${path.relative(ROOT, outPath)}\n`);
}

main();
