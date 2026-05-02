#!/usr/bin/env node
/**
 * Phase 0.4 + 0.5 — runtime parity checks.
 *
 * Loads every page in Astro through a real browser and verifies:
 *   - theme: html[data-theme] is set on initial load (light or dark),
 *     clicking .theme-toggle flips it, and the new state persists across
 *     a reload via localStorage[jg-theme].
 *   - analytics: clicking a tracked element (button.cta, .btn-primary,
 *     .navbar-contact-btn, [data-cta-id]) fires a `jg:analytics` event
 *     on window with a non-empty payload and pushes to localStorage
 *     queue (since there is no endpoint by default).
 *
 * Each page contributes at most one PASS/FAIL per category. Pages with
 * no theme toggle or no tracked element are reported as N/A for that
 * category (not a failure — the home page should have analytics, but
 * not every static page does).
 *
 * Usage: node scripts/check-runtime.mjs [--pages=index,books] [--target=astro|legacy]
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .map((a) => a.match(/^--([^=]+)(?:=(.*))?$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2] ?? true])
);

const TARGET = args.target || 'astro';
const DIR = path.join(ROOT, TARGET === 'legacy' ? 'dist-legacy-snap' : 'dist-astro');
const PORT = Number(args.port || 4111);

if (!fs.existsSync(DIR)) {
  console.error(`missing dir: ${DIR}`);
  process.exit(2);
}

function startServer(dir, port) {
  const child = spawn(
    process.execPath,
    [
      path.join(ROOT, 'node_modules/http-server/bin/http-server'),
      dir,
      '-p',
      String(port),
      '-s',
      '-c-1'
    ],
    { stdio: 'pipe' }
  );
  child.stderr.on('data', (d) => process.stderr.write(`[srv:${port}] ${d}`));
  return child;
}

async function waitForServer(port, tries = 40) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(`http://127.0.0.1:${port}/`, { method: 'HEAD' }).catch(() => null);
    if (res) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`server :${port} did not come up`);
}

const TRACKED_SELECTORS = [
  '[data-cta-id]',
  '[data-analytics]',
  '.btn-primary',
  '.navbar-contact-btn',
  '.btn-newsletter',
  '.product-cta',
  '.resource-link'
];

async function checkTheme(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForTimeout(120);

  const initial = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  const hasToggle = await page.evaluate(() => !!document.querySelector('.theme-toggle'));

  if (!initial) return { status: 'FAIL', detail: 'html[data-theme] not set on load' };
  if (!hasToggle) return { status: 'NA', detail: 'no .theme-toggle on this page' };

  await page.click('.theme-toggle').catch(() => null);
  await page.waitForTimeout(80);
  const flipped = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  if (flipped === initial) return { status: 'FAIL', detail: `toggle did not flip (still ${initial})` };

  const stored = await page.evaluate(() => localStorage.getItem('jg-theme'));
  if (stored !== flipped) return { status: 'FAIL', detail: `localStorage ${stored} != ${flipped}` };

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(120);
  const afterReload = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  if (afterReload !== flipped) return { status: 'FAIL', detail: `reload lost theme: got ${afterReload}` };

  return { status: 'PASS', detail: `${initial} → ${flipped}, persisted across reload` };
}

async function checkAnalytics(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForTimeout(150);

  const target = await page.evaluateHandle((sels) => {
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent) return el;
    }
    return null;
  }, TRACKED_SELECTORS);

  const exists = await target.evaluate((el) => !!el);
  if (!exists) return { status: 'NA', detail: 'no tracked element on this page' };

  const tagInfo = await target.evaluate((el) => ({
    tag: el.tagName,
    id: el.id || null,
    cls: el.className,
    href: el.getAttribute('href'),
    target: el.getAttribute('target')
  }));

  await page.evaluate(() => {
    window.__jgEvents = [];
    window.addEventListener('jg:analytics', (e) => window.__jgEvents.push(e.detail));
  });

  // Neutralize anchor navigation so we can listen for the event without losing context.
  await target.evaluate((el) => {
    if (el.tagName === 'A') {
      el.removeAttribute('href');
      el.removeAttribute('target');
    }
  });

  await target.evaluate((el) => el.click());
  await page.waitForTimeout(150);

  const events = await page.evaluate(() => window.__jgEvents || []);
  const queue = await page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem('jg_analytics_events') || '[]');
    } catch {
      return [];
    }
  });

  if (!events.length && !queue.length) {
    return { status: 'FAIL', detail: `clicked ${tagInfo.tag}.${(tagInfo.cls || '').split(' ')[0]} but no event` };
  }

  const e = events[0] || queue[queue.length - 1];
  return {
    status: 'PASS',
    detail: `event=${e.name} via ${tagInfo.tag}.${(tagInfo.cls || '').split(' ')[0]}`
  };
}

async function main() {
  const allPages = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith('.html'))
    .sort();

  const pageFilter = args.pages ? new Set(String(args.pages).split(',').map((s) => s.trim())) : null;
  const pages = pageFilter
    ? allPages.filter((p) => pageFilter.has(p.replace(/\.html$/, '')) || pageFilter.has(p))
    : allPages;

  const srv = startServer(DIR, PORT);
  await waitForServer(PORT);

  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const summary = {
    theme: { pass: 0, fail: 0, na: 0 },
    analytics: { pass: 0, fail: 0, na: 0 }
  };

  console.log(`\nruntime check: ${TARGET} (${pages.length} pages)\n`);
  console.log('PAGE                                       THEME                                    ANALYTICS');
  console.log('----                                       -----                                    ---------');

  try {
    for (const file of pages) {
      const url = `http://127.0.0.1:${PORT}/${file}`;
      let theme, analytics;
      try {
        theme = await checkTheme(page, url);
      } catch (e) {
        theme = { status: 'FAIL', detail: `err: ${e.message}` };
      }
      try {
        analytics = await checkAnalytics(page, url);
      } catch (e) {
        analytics = { status: 'FAIL', detail: `err: ${e.message}` };
      }

      summary.theme[theme.status.toLowerCase()]++;
      summary.analytics[analytics.status.toLowerCase()]++;

      const themeStr = `${theme.status.padEnd(5)} ${theme.detail.slice(0, 35).padEnd(35)}`;
      const anaStr = `${analytics.status.padEnd(5)} ${analytics.detail.slice(0, 35)}`;
      console.log(`${file.padEnd(43)}${themeStr}  ${anaStr}`);
    }
  } finally {
    await browser.close();
    srv.kill();
  }

  console.log(
    `\ntheme:     pass=${summary.theme.pass} fail=${summary.theme.fail} na=${summary.theme.na}`
  );
  console.log(
    `analytics: pass=${summary.analytics.pass} fail=${summary.analytics.fail} na=${summary.analytics.na}`
  );

  process.exit(summary.theme.fail + summary.analytics.fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
