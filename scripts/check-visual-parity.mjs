#!/usr/bin/env node
/**
 * Phase 0.2 — visual parity diff.
 *
 * Spins up two static http servers (one for dist-legacy-snap, one for
 * dist-astro), drives Playwright Chromium through each page at desktop
 * (1280x800) and mobile (375x812) viewports, and pixel-diffs full-page
 * screenshots. Writes diff PNGs to tests/visual-diff/ for any page+viewport
 * exceeding the threshold.
 *
 * Usage:
 *   node scripts/check-visual-parity.mjs
 *   node scripts/check-visual-parity.mjs --pages=index,books        # subset
 *   node scripts/check-visual-parity.mjs --viewport=desktop         # one viewport
 *   node scripts/check-visual-parity.mjs --threshold=0.02           # 2% diff tolerance
 *   node scripts/check-visual-parity.mjs --keep-pass                # also write same-as-legacy
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

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

const LEGACY_DIR = path.join(ROOT, args.legacy || 'dist-legacy-snap');
const ASTRO_DIR = path.join(ROOT, args.astro || 'dist-astro');
const OUT_DIR = path.join(ROOT, 'tests/visual-diff');
const PORT_LEGACY = Number(args.portLegacy || 4101);
const PORT_ASTRO = Number(args.portAstro || 4102);
const THRESHOLD = Number(args.threshold || 0.02); // 2% mismatched pixels => fail
const KEEP_PASS = !!args['keep-pass'];

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 375, height: 812 }
];
if (args.viewport) {
  const v = String(args.viewport);
  if (!VIEWPORTS.find((x) => x.name === v)) {
    console.error(`bad viewport: ${v}`);
    process.exit(2);
  }
  VIEWPORTS.splice(0, VIEWPORTS.length, VIEWPORTS.find((x) => x.name === v));
}

if (!fs.existsSync(LEGACY_DIR) || !fs.existsSync(ASTRO_DIR)) {
  console.error(`missing dirs. legacy=${LEGACY_DIR} astro=${ASTRO_DIR}`);
  process.exit(2);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

function startServer(dir, port) {
  const child = spawn(
    process.execPath,
    [
      path.join(ROOT, 'node_modules/http-server/bin/http-server'),
      dir,
      '-p',
      String(port),
      '-s',
      '-c-1',
      '--cors'
    ],
    { stdio: 'pipe' }
  );
  child.stderr.on('data', (d) => process.stderr.write(`[srv:${port}] ${d}`));
  return child;
}

async function waitForServer(port, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`, { method: 'HEAD' }).catch(() => null);
      if (res) return;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`server :${port} did not come up`);
}

async function shoot(page, url, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => null);
  // small settle for late layout (web fonts, deferred islands)
  await page.waitForTimeout(150);
  return page.screenshot({ fullPage: true, type: 'png' });
}

function diffPng(legacyBuf, astroBuf, viewport) {
  const lp = PNG.sync.read(legacyBuf);
  const ap = PNG.sync.read(astroBuf);
  const w = Math.min(lp.width, ap.width);
  const h = Math.min(lp.height, ap.height);

  // crop both to common size
  const lImg = cropPng(lp, w, h);
  const aImg = cropPng(ap, w, h);
  const diff = new PNG({ width: w, height: h });
  const mismatched = pixelmatch(lImg.data, aImg.data, diff.data, w, h, {
    threshold: 0.15,
    includeAA: false
  });
  return {
    width: w,
    height: h,
    legacyHeight: lp.height,
    astroHeight: ap.height,
    legacyWidth: lp.width,
    astroWidth: ap.width,
    mismatched,
    fraction: mismatched / (w * h),
    diffPng: diff
  };
}

function cropPng(src, w, h) {
  if (src.width === w && src.height === h) return src;
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    const srcOff = y * src.width * 4;
    const dstOff = y * w * 4;
    src.data.copy(out.data, dstOff, srcOff, srcOff + w * 4);
  }
  return out;
}

async function main() {
  const allPages = fs
    .readdirSync(LEGACY_DIR)
    .filter((f) => f.endsWith('.html') && fs.existsSync(path.join(ASTRO_DIR, f)))
    .sort();

  const pageFilter = args.pages ? new Set(String(args.pages).split(',').map((s) => s.trim())) : null;
  const pages = pageFilter
    ? allPages.filter((p) => pageFilter.has(p.replace(/\.html$/, '')) || pageFilter.has(p))
    : allPages;

  console.error(`[visual] ${pages.length} pages × ${VIEWPORTS.length} viewports`);

  const legacySrv = startServer(LEGACY_DIR, PORT_LEGACY);
  const astroSrv = startServer(ASTRO_DIR, PORT_ASTRO);
  await waitForServer(PORT_LEGACY);
  await waitForServer(PORT_ASTRO);

  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const lPage = await ctx.newPage();
  const aPage = await ctx.newPage();

  const results = [];
  let pass = 0;
  let fail = 0;

  try {
    for (const file of pages) {
      for (const viewport of VIEWPORTS) {
        const legacyUrl = `http://127.0.0.1:${PORT_LEGACY}/${file}`;
        const astroUrl = `http://127.0.0.1:${PORT_ASTRO}/${file}`;
        const slug = `${file.replace(/\.html$/, '')}-${viewport.name}`;
        try {
          const [lShot, aShot] = await Promise.all([
            shoot(lPage, legacyUrl, viewport),
            shoot(aPage, astroUrl, viewport)
          ]);
          const d = diffPng(lShot, aShot, viewport);
          const failed = d.fraction > THRESHOLD;
          if (failed) fail++;
          else pass++;

          if (failed || KEEP_PASS) {
            const diffPath = path.join(OUT_DIR, `${slug}.diff.png`);
            fs.writeFileSync(diffPath, PNG.sync.write(d.diffPng));
            fs.writeFileSync(path.join(OUT_DIR, `${slug}.legacy.png`), lShot);
            fs.writeFileSync(path.join(OUT_DIR, `${slug}.astro.png`), aShot);
          }
          results.push({ slug, file, viewport: viewport.name, ...d, failed });
          console.log(
            `${failed ? 'FAIL' : 'PASS'} ${slug.padEnd(50)} ${(d.fraction * 100).toFixed(2).padStart(5)}%  legacyH=${d.legacyHeight} astroH=${d.astroHeight}`
          );
        } catch (e) {
          fail++;
          console.log(`ERR  ${slug.padEnd(50)} ${e.message}`);
          results.push({ slug, file, viewport: viewport.name, error: e.message, failed: true });
        }
      }
    }
  } finally {
    await browser.close();
    legacySrv.kill();
    astroSrv.kill();
  }

  const total = pages.length * VIEWPORTS.length;
  console.log(`\nresult: ${pass} / ${total} viewport-pairs within ${THRESHOLD * 100}%`);
  console.log(`        ${fail} fail, diffs in tests/visual-diff/`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
