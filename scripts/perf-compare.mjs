#!/usr/bin/env node
/**
 * Side-by-side performance comparison of the Astro build vs the legacy build.
 *
 * Drives Playwright Chromium with cache disabled and CPU throttle 4× (mid-tier
 * laptop), loads each page on both ports, and records:
 *   - TTFB                 — server response time
 *   - DOMContentLoaded     — DOM parsed
 *   - Load                 — load event
 *   - FCP                  — first contentful paint
 *   - LCP                  — largest contentful paint (PerformanceObserver)
 *   - CLS                  — cumulative layout shift
 *   - HTML bytes           — gzipped wire size of the document
 *   - JS bytes             — sum of script transfers
 *   - CSS bytes            — sum of stylesheet transfers
 *   - Image bytes          — sum of image transfers
 *   - Total transfer       — all resources
 *   - Request count        — total resources fetched
 *
 * Each page is sampled 3× per origin and the median is reported.
 *
 * Servers expected on:
 *   http://127.0.0.1:4200  Astro (dist-astro)
 *   http://127.0.0.1:4201  Legacy (dist-legacy-snap)
 */
import { chromium } from 'playwright';

const PAGES = [
  'index.html',
  'about.html',
  'books.html',
  'movies.html',
  'people.html',
  'adventures.html',
  'projects.html',
  'products.html',
  'essays.html',
  'search.html'
];

const SAMPLES = 15;
const ASTRO = 'http://127.0.0.1:4200';
const LEGACY = 'http://127.0.0.1:4201';

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

async function measure(browser, origin, page) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    bypassCSP: true
  });
  const p = await ctx.newPage();
  // Apply CPU throttle (mid-tier laptop) via CDP
  const session = await ctx.newCDPSession(p);
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await session.send('Network.clearBrowserCache');
  await session.send('Network.clearBrowserCookies');

  const requests = [];
  p.on('response', async (res) => {
    try {
      const headers = res.headers();
      const url = res.url();
      const type = res.request().resourceType();
      const size = parseInt(headers['content-length'] || '0', 10) || (await res.body().then((b) => b.byteLength).catch(() => 0));
      requests.push({ url, type, size, status: res.status() });
    } catch {}
  });

  // Track CLS via PerformanceObserver
  await p.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__cls += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
    window.__lcp = 0;
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) window.__lcp = last.renderTime || last.loadTime || last.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  });

  const url = `${origin}/${page}`;
  await p.goto(url, { waitUntil: 'load', timeout: 20000 });
  // Let LCP / CLS settle
  await p.waitForTimeout(1500);

  const metrics = await p.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0;
    return {
      ttfb: nav ? nav.responseStart - nav.requestStart : 0,
      dcl: nav ? nav.domContentLoadedEventEnd - nav.startTime : 0,
      load: nav ? nav.loadEventEnd - nav.startTime : 0,
      fcp,
      lcp: window.__lcp || 0,
      cls: window.__cls || 0
    };
  });

  // Aggregate transfers
  const totals = { html: 0, js: 0, css: 0, image: 0, font: 0, other: 0, count: requests.length };
  for (const r of requests) {
    if (r.type === 'document') totals.html += r.size;
    else if (r.type === 'script') totals.js += r.size;
    else if (r.type === 'stylesheet') totals.css += r.size;
    else if (r.type === 'image') totals.image += r.size;
    else if (r.type === 'font') totals.font += r.size;
    else totals.other += r.size;
  }
  totals.total = totals.html + totals.js + totals.css + totals.image + totals.font + totals.other;

  await ctx.close();
  return { metrics, totals };
}

async function sample(browser, origin, page) {
  const samples = [];
  for (let i = 0; i < SAMPLES; i++) {
    samples.push(await measure(browser, origin, page));
  }
  // Median across samples
  const m = {};
  for (const k of ['ttfb', 'dcl', 'load', 'fcp', 'lcp', 'cls']) {
    m[k] = median(samples.map((s) => s.metrics[k]));
  }
  const t = {};
  for (const k of ['html', 'js', 'css', 'image', 'font', 'other', 'total', 'count']) {
    t[k] = median(samples.map((s) => s.totals[k]));
  }
  return { metrics: m, totals: t };
}

function fmtMs(v) { return v < 1 ? '0ms' : `${Math.round(v)}ms`; }
function fmtKb(v) { return v === 0 ? '0' : `${(v / 1024).toFixed(1)}k`; }
function fmtPct(astro, legacy) {
  if (legacy === 0) return astro === 0 ? '=' : '+∞%';
  const pct = ((astro - legacy) / legacy) * 100;
  const arrow = pct < -2 ? '↓' : pct > 2 ? '↑' : '=';
  return `${arrow}${Math.abs(pct).toFixed(0)}%`;
}

async function main() {
  console.log(`\n[perf] sampling ${PAGES.length} pages × ${SAMPLES} runs × 2 origins (CPU 4× throttle, cache off)\n`);
  const browser = await chromium.launch();
  const rows = [];
  for (const page of PAGES) {
    process.stderr.write(`  ${page}...\n`);
    const a = await sample(browser, ASTRO, page);
    const l = await sample(browser, LEGACY, page);
    rows.push({ page, astro: a, legacy: l });
  }
  await browser.close();

  // Per-page table
  console.log('Per-page (median of 3 samples each)\n');
  console.log('PAGE              METRIC      ASTRO       LEGACY      Δ       NOTE');
  console.log('────────────────  ──────────  ──────────  ──────────  ──────  ────────────────');
  for (const { page, astro, legacy } of rows) {
    const printRow = (label, key, fmt) => {
      const av = astro.metrics?.[key] ?? astro.totals[key];
      const lv = legacy.metrics?.[key] ?? legacy.totals[key];
      console.log(
        `${page.padEnd(16)}  ${label.padEnd(10)}  ${fmt(av).padStart(10)}  ${fmt(lv).padStart(10)}  ${fmtPct(av, lv).padStart(6)}`
      );
    };
    printRow('FCP', 'fcp', fmtMs);
    printRow('LCP', 'lcp', fmtMs);
    printRow('TTFB', 'ttfb', fmtMs);
    printRow('Load', 'load', fmtMs);
    printRow('CLS', 'cls', (v) => v.toFixed(3));
    printRow('HTML', 'html', fmtKb);
    printRow('JS', 'js', fmtKb);
    printRow('CSS', 'css', fmtKb);
    printRow('Total', 'total', fmtKb);
    printRow('Requests', 'count', (v) => String(v));
    console.log('');
  }

  // Site-wide averages
  console.log('Site-wide averages (mean across pages, median samples)\n');
  const avg = (rows, getter) => rows.reduce((s, r) => s + getter(r), 0) / rows.length;
  console.log(`FCP                   astro=${fmtMs(avg(rows, (r) => r.astro.metrics.fcp))}     legacy=${fmtMs(avg(rows, (r) => r.legacy.metrics.fcp))}`);
  console.log(`LCP                   astro=${fmtMs(avg(rows, (r) => r.astro.metrics.lcp))}     legacy=${fmtMs(avg(rows, (r) => r.legacy.metrics.lcp))}`);
  console.log(`TTFB                  astro=${fmtMs(avg(rows, (r) => r.astro.metrics.ttfb))}     legacy=${fmtMs(avg(rows, (r) => r.legacy.metrics.ttfb))}`);
  console.log(`Load                  astro=${fmtMs(avg(rows, (r) => r.astro.metrics.load))}     legacy=${fmtMs(avg(rows, (r) => r.legacy.metrics.load))}`);
  console.log(`CLS                   astro=${avg(rows, (r) => r.astro.metrics.cls).toFixed(3)}    legacy=${avg(rows, (r) => r.legacy.metrics.cls).toFixed(3)}`);
  console.log(`HTML transfer         astro=${fmtKb(avg(rows, (r) => r.astro.totals.html))}    legacy=${fmtKb(avg(rows, (r) => r.legacy.totals.html))}`);
  console.log(`JS transfer           astro=${fmtKb(avg(rows, (r) => r.astro.totals.js))}    legacy=${fmtKb(avg(rows, (r) => r.legacy.totals.js))}`);
  console.log(`CSS transfer          astro=${fmtKb(avg(rows, (r) => r.astro.totals.css))}    legacy=${fmtKb(avg(rows, (r) => r.legacy.totals.css))}`);
  console.log(`Total transfer        astro=${fmtKb(avg(rows, (r) => r.astro.totals.total))}    legacy=${fmtKb(avg(rows, (r) => r.legacy.totals.total))}`);
  console.log(`Requests              astro=${avg(rows, (r) => r.astro.totals.count).toFixed(1)}    legacy=${avg(rows, (r) => r.legacy.totals.count).toFixed(1)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
