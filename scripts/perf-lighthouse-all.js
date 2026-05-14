#!/usr/bin/env node
// Run lighthouse against every HTML file in dist/, summarize as markdown.
// Drop-in companion to scripts/perf-lighthouse.js — same Chrome path,
// same flags, same output dimensions, but iterates all 81 routes.
'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const BASE = process.env.LIGHTHOUSE_BASE || 'http://localhost:8765';
const LH_CLI = path.join(ROOT, 'site-astro/node_modules/lighthouse/cli/index.js');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const argOut = process.argv.find((a) => a.startsWith('--out='))?.slice(6);
const outPath = path.resolve(ROOT, argOut || `docs/perf-lighthouse-all-${new Date().toISOString().slice(0, 10)}.md`);

function listRoutes() {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile() && e.name.endsWith('.html')) out.push('/' + path.relative(DIST, p).split(path.sep).join('/'));
    }
  };
  walk(DIST);
  return out.sort();
}

function runOne(route) {
  const url = BASE + route;
  const tmp = path.join(ROOT, '.perf-tmp', `lh-${route.replace(/[^a-z0-9]/gi, '_')}.json`);
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  const args = [
    LH_CLI, url,
    '--quiet',
    '--output=json', `--output-path=${tmp}`,
    '--preset=desktop',
    '--only-categories=performance',
    `--chrome-path=${CHROME}`,
    '--chrome-flags=--headless=new --no-sandbox --disable-gpu'
  ];
  const start = Date.now();
  const r = spawnSync('node', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const ms = Date.now() - start;
  if (r.status !== 0) {
    return { route, error: r.stderr.split('\n').filter(Boolean).slice(-1)[0] || 'unknown', ms };
  }
  try {
    const lh = JSON.parse(fs.readFileSync(tmp, 'utf8'));
    const cat = lh.categories?.performance;
    const aud = lh.audits || {};
    return {
      route,
      score: cat ? Math.round(cat.score * 100) : null,
      lcp: aud['largest-contentful-paint']?.numericValue ?? null,
      cls: aud['cumulative-layout-shift']?.numericValue ?? null,
      tbt: aud['total-blocking-time']?.numericValue ?? null,
      fcp: aud['first-contentful-paint']?.numericValue ?? null,
      si: aud['speed-index']?.numericValue ?? null,
      bytes: aud['total-byte-weight']?.numericValue ?? null,
      ms
    };
  } catch (e) {
    return { route, error: e.message, ms };
  } finally {
    try { fs.unlinkSync(tmp); } catch {}
  }
}

function fmtMs(v) { return v == null ? '-' : `${Math.round(v)}ms`; }
function fmtKB(v) { return v == null ? '-' : `${(v / 1024).toFixed(1)}KB`; }
function fmtCLS(v) { return v == null ? '-' : v.toFixed(3); }

function main() {
  // Sanity: server reachable
  const s = spawnSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', BASE], { encoding: 'utf8' });
  if (s.stdout.trim() !== '200') {
    process.stderr.write(`[perf-all] ${BASE} not reachable. Start dist-static first.\n`);
    process.exit(2);
  }

  const routes = listRoutes();
  process.stdout.write(`[perf-all] auditing ${routes.length} routes...\n`);
  const rows = [];
  routes.forEach((route, i) => {
    const r = runOne(route);
    rows.push(r);
    const summary = r.error
      ? `ERROR ${r.error}`
      : `score=${r.score} LCP=${fmtMs(r.lcp)} CLS=${fmtCLS(r.cls)} TBT=${fmtMs(r.tbt)} bytes=${fmtKB(r.bytes)}`;
    process.stdout.write(`[perf-all]   [${i + 1}/${routes.length}] ${route} ... ${summary} (${r.ms}ms)\n`);
  });

  // Sort by score ascending so worst pages float to top
  rows.sort((a, b) => (a.score ?? 0) - (b.score ?? 0));

  const lines = [];
  lines.push(`# Lighthouse — all ${routes.length} routes`);
  lines.push('');
  lines.push(`Date: ${new Date().toISOString().slice(0, 10)}`);
  lines.push(`Base: ${BASE}`);
  lines.push('Preset: desktop, simulated throttling, performance category only');
  lines.push('');
  lines.push('| Route | Score | LCP | CLS | TBT | FCP | SI | Total Bytes |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|---:|');
  for (const r of rows) {
    if (r.error) lines.push(`| \`${r.route}\` | - | error: ${r.error} | | | | | |`);
    else lines.push(`| \`${r.route}\` | **${r.score}** | ${fmtMs(r.lcp)} | ${fmtCLS(r.cls)} | ${fmtMs(r.tbt)} | ${fmtMs(r.fcp)} | ${fmtMs(r.si)} | ${fmtKB(r.bytes)} |`);
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, lines.join('\n') + '\n');
  process.stdout.write(`\n[perf-all] wrote ${path.relative(ROOT, outPath)}\n`);

  // Summary stats
  const scores = rows.map((r) => r.score).filter((v) => typeof v === 'number');
  if (scores.length) {
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    const sub90 = scores.filter((v) => v < 90).length;
    process.stdout.write(`[perf-all] scores: avg=${avg.toFixed(1)} min=${min} max=${max} | <90: ${sub90} routes\n`);
  }
}

main();
