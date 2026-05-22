#!/usr/bin/env node
// Phase 1 (Tier 1+2 plan, slice 1.1): regression guard. Re-runs Lighthouse
// against the dist server and fails if any route regresses past tolerance
// vs the committed `docs/perf-baseline.md`.
//
// Tolerances (any one trips a fail). Set above typical Lighthouse run-to-
// run noise so green runs stay green; under intentional regressions still
// trip them.
//   LCP regression > 300ms (typical run-to-run noise on simulated throttling
//                           is ~200ms; 300ms catches anything bigger).
//   CLS regression > 0.05
//   Total Bytes regression > 35KB
//   Performance score drop > 5 points
// /books.html is intentionally image-dense and can swing on cover image
// discovery/layout timing in CI. /adventures.html uses third-party map tiles,
// which Lighthouse includes in total-byte-weight. Those routes get targeted
// wider tolerances while the rest of the site stays strict.
//
// Re-uses the existing scripts/perf-lighthouse.js runner; this is a
// thin wrapper that parses the markdown table.
//
// Usage:
//   npm run perf:check                       # default base http://localhost:8765
//   LIGHTHOUSE_BASE=https://x npm run perf:check

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const BASELINE_PATH = path.join(ROOT, 'docs/perf-baseline.md');
const OUT_PATH = path.join(ROOT, '.perf-tmp/perf-current.md');

const TOLERANCES = {
    lcpMs: 300,
    cls: 0.05,
    bytesKb: 35,
    score: 5
};

const ROUTE_TOLERANCES = {
    '/books.html': { bytesKb: 200, cls: 0.2, score: 10 },
    '/adventures.html': { bytesKb: 1600, lcpMs: 500 }
};

function parseTable(markdown) {
    const lines = markdown.split('\n');
    const rows = [];
    let inTable = false;
    for (const line of lines) {
        if (/^\|\s*Route\s*\|/.test(line)) { inTable = true; continue; }
        if (!inTable) continue;
        if (/^\|---/.test(line)) continue;
        if (!line.startsWith('|')) { inTable = false; continue; }
        const cells = line.split('|').slice(1, -1).map((c) => c.trim());
        if (cells.length < 8) continue;
        const [route, score, lcp, cls, tbt, fcp, si, bytes] = cells;
        rows.push({
            route,
            score: Number(score),
            lcpMs: Number(String(lcp).replace(/ms/, '')),
            cls: Number(cls),
            bytesKb: Number(String(bytes).replace(/KB/, ''))
        });
    }
    return rows;
}

function readMarkdown(p) {
    if (!fs.existsSync(p)) {
        process.stderr.write(`[perf:check] missing ${path.relative(ROOT, p)}\n`);
        process.exit(2);
    }
    return fs.readFileSync(p, 'utf8');
}

function runFreshLighthouse() {
    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    const result = spawnSync('node', ['scripts/perf-lighthouse.js', `--out=${OUT_PATH}`], {
        cwd: ROOT,
        stdio: 'inherit',
        env: process.env
    });
    if (result.status !== 0) {
        process.stderr.write(`[perf:check] perf-lighthouse.js exited ${result.status}\n`);
        process.exit(result.status || 1);
    }
}

function main() {
    runFreshLighthouse();
    const baseline = parseTable(readMarkdown(BASELINE_PATH));
    const current = parseTable(readMarkdown(OUT_PATH));
    const baselineByRoute = new Map(baseline.map((r) => [r.route, r]));

    const failures = [];
    process.stdout.write('\n[perf:check] route-by-route delta vs baseline:\n');
    process.stdout.write('| Route | Score Δ | LCP Δ | CLS Δ | Bytes Δ |\n');
    process.stdout.write('|---|---:|---:|---:|---:|\n');

    for (const cur of current) {
        const base = baselineByRoute.get(cur.route);
        if (!base) {
            process.stdout.write(`| ${cur.route} | (no baseline) | | | |\n`);
            continue;
        }
        const dScore = cur.score - base.score;
        const dLcp = cur.lcpMs - base.lcpMs;
        const dCls = cur.cls - base.cls;
        const dBytes = cur.bytesKb - base.bytesKb;
        process.stdout.write(`| ${cur.route} | ${dScore >= 0 ? '+' : ''}${dScore} | ${dLcp >= 0 ? '+' : ''}${Math.round(dLcp)}ms | ${(dCls >= 0 ? '+' : '') + dCls.toFixed(3)} | ${dBytes >= 0 ? '+' : ''}${dBytes.toFixed(1)}KB |\n`);

        const tolerances = { ...TOLERANCES, ...(ROUTE_TOLERANCES[cur.route] ?? {}) };
        if (dScore < -tolerances.score) failures.push(`${cur.route}: score regressed by ${-dScore} (tolerance ${tolerances.score})`);
        if (dLcp > tolerances.lcpMs) failures.push(`${cur.route}: LCP regressed by ${Math.round(dLcp)}ms (tolerance ${tolerances.lcpMs}ms)`);
        if (dCls > tolerances.cls) failures.push(`${cur.route}: CLS regressed by ${dCls.toFixed(3)} (tolerance ${tolerances.cls})`);
        if (dBytes > tolerances.bytesKb) failures.push(`${cur.route}: Total Bytes regressed by ${dBytes.toFixed(1)}KB (tolerance ${tolerances.bytesKb}KB)`);
    }

    if (failures.length) {
        process.stderr.write('\n[perf:check] FAILURES:\n');
        for (const f of failures) process.stderr.write(`  - ${f}\n`);
        process.stderr.write(
            '\n  If the regression is intentional, update docs/perf-baseline.md ' +
            'with `npm run perf:lighthouse -- --out=docs/perf-baseline.md`.\n'
        );
        process.exit(1);
    }
    process.stdout.write('\n[perf:check] OK — no regressions past tolerance.\n');
}

main();
