#!/usr/bin/env node
// Parallel Lighthouse runner — N workers, same metrics as perf-lighthouse-all.js.
'use strict';

const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const BASE = process.env.LIGHTHOUSE_BASE || 'http://localhost:8765';
const LH_CLI = path.join(ROOT, 'site-astro/node_modules/lighthouse/cli/index.js');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CONCURRENCY = Number(process.env.LH_PARALLEL || 6);
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

function runOne(route, workerId) {
  return new Promise((resolve) => {
    const url = BASE + route;
    const tmp = path.join(ROOT, '.perf-tmp', `lh-w${workerId}-${route.replace(/[^a-z0-9]/gi, '_')}.json`);
    fs.mkdirSync(path.dirname(tmp), { recursive: true });
    const port = 9300 + workerId;
    const args = [
      LH_CLI, url,
      '--quiet',
      '--output=json', `--output-path=${tmp}`,
      '--preset=desktop',
      '--only-categories=performance',
      `--chrome-path=${CHROME}`,
      `--port=${port}`,
      '--chrome-flags=--headless=new --no-sandbox --disable-gpu'
    ];
    const start = Date.now();
    const child = spawn('node', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => {
      const ms = Date.now() - start;
      if (code !== 0) {
        resolve({ route, error: stderr.split('\n').filter(Boolean).slice(-1)[0] || `exit ${code}`, ms });
        return;
      }
      try {
        const lh = JSON.parse(fs.readFileSync(tmp, 'utf8'));
        const cat = lh.categories?.performance;
        const aud = lh.audits || {};
        resolve({
          route,
          score: cat ? Math.round(cat.score * 100) : null,
          lcp: aud['largest-contentful-paint']?.numericValue ?? null,
          cls: aud['cumulative-layout-shift']?.numericValue ?? null,
          tbt: aud['total-blocking-time']?.numericValue ?? null,
          fcp: aud['first-contentful-paint']?.numericValue ?? null,
          si: aud['speed-index']?.numericValue ?? null,
          bytes: aud['total-byte-weight']?.numericValue ?? null,
          ms
        });
      } catch (e) {
        resolve({ route, error: e.message, ms });
      } finally {
        try { fs.unlinkSync(tmp); } catch {}
      }
    });
  });
}

const fmtMs = (v) => v == null ? '-' : `${Math.round(v)}ms`;
const fmtKB = (v) => v == null ? '-' : `${(v / 1024).toFixed(1)}KB`;
const fmtCLS = (v) => v == null ? '-' : v.toFixed(3);

async function main() {
  const s = spawnSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', BASE], { encoding: 'utf8' });
  if (s.stdout.trim() !== '200') {
    process.stderr.write(`[perf-par] ${BASE} not reachable (got ${s.stdout.trim()})\n`);
    process.exit(2);
  }

  const routes = listRoutes();
  process.stdout.write(`[perf-par] auditing ${routes.length} routes with ${CONCURRENCY} workers...\n`);
  const startedAt = Date.now();
  const rows = [];
  let cursor = 0;
  let done = 0;

  async function worker(id) {
    while (true) {
      const i = cursor++;
      if (i >= routes.length) return;
      const route = routes[i];
      const r = await runOne(route, id);
      rows.push(r);
      done++;
      const summary = r.error ? `ERROR ${r.error}` : `score=${r.score} LCP=${fmtMs(r.lcp)} TBT=${fmtMs(r.tbt)} bytes=${fmtKB(r.bytes)}`;
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0);
      process.stdout.write(`[perf-par] [${done}/${routes.length} t=${elapsed}s w${id}] ${route} ... ${summary} (${r.ms}ms)\n`);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i)));

  rows.sort((a, b) => (a.score ?? 0) - (b.score ?? 0));

  const lines = [];
  lines.push(`# Lighthouse — all ${routes.length} routes (parallel x${CONCURRENCY})`);
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

  const scores = rows.map((r) => r.score).filter((v) => typeof v === 'number');
  const totalSec = ((Date.now() - startedAt) / 1000).toFixed(0);
  process.stdout.write(`\n[perf-par] wrote ${path.relative(ROOT, outPath)} in ${totalSec}s\n`);
  if (scores.length) {
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    const sub90 = scores.filter((v) => v < 90).length;
    const sub50 = scores.filter((v) => v < 50).length;
    process.stdout.write(`[perf-par] scores: avg=${avg.toFixed(1)} min=${min} max=${max} | <90: ${sub90} | <50: ${sub50}\n`);
  }
}

main();
