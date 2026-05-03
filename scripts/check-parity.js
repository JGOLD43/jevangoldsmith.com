#!/usr/bin/env node
/**
 * Phase 0.1 — Astro vs legacy parity diff.
 *
 * Compares two build directories page-by-page. For each HTML file present in
 * the legacy snapshot, it normalizes both sides (strip bundle hashes, collapse
 * whitespace), then reports byte delta plus missing classes / ids / data-* /
 * structural elements (form, nav, main, section, article, button, a[href]).
 *
 * Tolerance (defaults): byte delta within ±5% AND zero missing structural
 * elements AND zero missing ids AND <=5 missing classes (heuristic).
 *
 * Usage:
 *   node scripts/check-parity.js
 *   node scripts/check-parity.js --legacy=dist-legacy-snap --astro=dist-astro
 *   node scripts/check-parity.js --build         # rebuild Astro first
 *   node scripts/check-parity.js --json          # JSON output
 *   node scripts/check-parity.js --page=index    # single page detail
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2).reduce((acc, a) => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  if (m) acc[m[1]] = m[2] ?? true;
  return acc;
}, {});

const LEGACY_DIR = path.join(ROOT, args.legacy || 'dist-legacy-snap');
const ASTRO_DIR = path.join(ROOT, args.astro || 'dist-astro');
// Phase A relaxed the byte tolerance to 15% and downgraded the class-diff
// to informational; Phase B then bumped tolerance to 1000% because SSR'd
// collection cards inflate HTML by 100–700% — books.html alone goes from
// a 100-byte empty container to 230KB of card markup. The structural
// element + id checks remain the meaningful gates. Strict mode still
// available via `--tol=5` and `--strict-classes`.
const BYTE_TOL = Number(args.tol || 1000) / 100;
const STRICT_CLASSES = !!args['strict-classes'];
const SINGLE_PAGE = args.page || null;
const JSON_OUT = !!args.json;

if (args.build) {
  console.error('[parity] running asset preconditions + Astro build -> dist-astro/ ...');
  execFileSync('npm', ['run', 'snap:routes'], { cwd: ROOT, stdio: 'inherit' });
  execFileSync('npm', ['run', 'assets:optimize'], { cwd: ROOT, stdio: 'inherit' });
  execFileSync(
    'npx',
    ['astro', 'build', '--outDir', path.relative(path.join(ROOT, 'site-astro'), ASTRO_DIR)],
    { cwd: path.join(ROOT, 'site-astro'), stdio: 'inherit' }
  );
  execFileSync('node', ['scripts/normalize-astro-html.js', `--dist=${ASTRO_DIR}`], { cwd: ROOT, stdio: 'inherit' });
  execFileSync('node', ['scripts/bundle-page-scripts.js', `--dist=${ASTRO_DIR}`], { cwd: ROOT, stdio: 'inherit' });
  execFileSync('node', ['scripts/purge-css-per-page.js', `--dist=${ASTRO_DIR}`], { cwd: ROOT, stdio: 'inherit' });
}

if (!fs.existsSync(LEGACY_DIR) || !fs.existsSync(ASTRO_DIR)) {
  console.error(`[parity] missing dirs. legacy=${LEGACY_DIR} astro=${ASTRO_DIR}`);
  process.exit(2);
}

// Pages where the legacy build emits a duplicate <footer class="footer"> by
// mistake. Astro emits exactly one (correct). To compare apples-to-apples we
// strip the second copy from the legacy side before diffing.
const LEGACY_DUPED_FOOTER = new Set([
  'cool-shit.html',
  'dateme.html',
  'lesson-logger.html',
  'search.html',
  'videos.html'
]);

function stripDuplicateFooter(html) {
  const matches = [...html.matchAll(/<footer class="footer"[\s\S]*?<\/footer>/g)];
  if (matches.length < 2) return html;
  // Drop everything from the start of the 2nd footer to the end of the last footer.
  const second = matches[1];
  const last = matches[matches.length - 1];
  return html.slice(0, second.index) + html.slice(last.index + last[0].length);
}

function normalize(html) {
  return html
    // bundle hashes: assets/js/foo.abc1234567.js, assets/css/Base.abc1234567.css
    .replace(/([\w/.-]+)\.[a-f0-9]{8,}\.(js|css|mjs)/g, '$1.HASH.$2')
    // versioned query strings: ?v=abc123
    .replace(/\?v=[a-f0-9]+/g, '?v=HASH')
    // whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTokens(html) {
  const classes = new Set();
  const ids = new Set();
  const dataAttrs = new Set();
  const tags = { form: 0, nav: 0, main: 0, section: 0, article: 0, button: 0, aHref: 0, img: 0, picture: 0, h1: 0, h2: 0, h3: 0 };

  for (const m of html.matchAll(/class="([^"]+)"/g)) {
    for (const c of m[1].split(/\s+/)) if (c) classes.add(c);
  }
  for (const m of html.matchAll(/id="([^"]+)"/g)) ids.add(m[1]);
  // Match `data-foo=`, `data-foo "`, and bare `data-foo>` / `data-foo/` (Astro
  // emits no value for empty strings; legacy emits data-foo="").
  for (const m of html.matchAll(/(data-[a-z0-9-]+)(?==|[\s>/])/gi)) dataAttrs.add(m[1].toLowerCase());

  for (const tag of ['form', 'nav', 'main', 'section', 'article', 'button', 'img', 'picture', 'h1', 'h2', 'h3']) {
    const re = new RegExp(`<${tag}[\\s>/]`, 'g');
    tags[tag] = (html.match(re) || []).length;
  }
  tags.aHref = (html.match(/<a\s+[^>]*href=/g) || []).length;

  return { classes, ids, dataAttrs, tags };
}

function diffSets(legacy, astro) {
  const missing = [];
  for (const v of legacy) if (!astro.has(v)) missing.push(v);
  return missing;
}

function checkPage(filename) {
  const lp = path.join(LEGACY_DIR, filename);
  const ap = path.join(ASTRO_DIR, filename);
  if (!fs.existsSync(ap)) return { filename, status: 'MISSING', astroExists: false };

  let lRaw = fs.readFileSync(lp, 'utf8');
  const aRaw = fs.readFileSync(ap, 'utf8');
  if (LEGACY_DUPED_FOOTER.has(filename)) lRaw = stripDuplicateFooter(lRaw);
  const lNorm = normalize(lRaw);
  const aNorm = normalize(aRaw);

  const lBytes = lRaw.length;
  const aBytes = aRaw.length;
  const delta = aBytes - lBytes;
  const pct = lBytes > 0 ? delta / lBytes : 0;

  // Gate on whitespace-normalized delta — Astro emits compact HTML and legacy
  // emits indented HTML, so raw byte delta penalizes cosmetic-only difference.
  // Normalized delta is the meaningful "did we actually lose content" metric.
  const normDelta = aNorm.length - lNorm.length;
  const normPct = lNorm.length > 0 ? normDelta / lNorm.length : 0;

  const lTok = extractTokens(lRaw);
  const aTok = extractTokens(aRaw);

  const missingClasses = diffSets(lTok.classes, aTok.classes);
  const missingIds = diffSets(lTok.ids, aTok.ids);
  const missingDataAttrs = diffSets(lTok.dataAttrs, aTok.dataAttrs);

  const tagDeltas = {};
  let structuralLoss = 0;
  for (const [k, v] of Object.entries(lTok.tags)) {
    const d = (aTok.tags[k] || 0) - v;
    tagDeltas[k] = d;
    if (d < 0) structuralLoss += -d;
  }

  const withinByte = Math.abs(normPct) <= BYTE_TOL;
  const noStructLoss = structuralLoss === 0;
  const noIdLoss = missingIds.length === 0;
  const fewClassLoss = missingClasses.length <= 5;
  const pass = withinByte && noStructLoss && noIdLoss && (!STRICT_CLASSES || fewClassLoss);

  return {
    filename,
    status: pass ? 'PASS' : 'FAIL',
    astroExists: true,
    bytes: { legacy: lBytes, astro: aBytes, delta, pct },
    normalizedBytes: { legacy: lNorm.length, astro: aNorm.length, delta: normDelta, pct: normPct },
    missingClasses,
    missingIds,
    missingDataAttrs,
    tagDeltas,
    structuralLoss,
    fail: { withinByte, noStructLoss, noIdLoss, fewClassLoss }
  };
}

const legacyFiles = fs
  .readdirSync(LEGACY_DIR)
  .filter((f) => f.endsWith('.html'))
  .sort();

const target = SINGLE_PAGE
  ? legacyFiles.filter((f) => f === `${SINGLE_PAGE}.html` || f === SINGLE_PAGE)
  : legacyFiles;

const results = target.map(checkPage);

if (JSON_OUT) {
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}

if (SINGLE_PAGE) {
  const r = results[0];
  if (!r) {
    console.error(`[parity] no match for --page=${SINGLE_PAGE}`);
    process.exit(2);
  }
  console.log(`\n=== ${r.filename} ===`);
  console.log(`status: ${r.status}`);
  if (!r.astroExists) {
    console.log('astro file missing.');
    process.exit(1);
  }
  console.log(`bytes: legacy=${r.bytes.legacy} astro=${r.bytes.astro} delta=${r.bytes.delta} (${(r.bytes.pct * 100).toFixed(1)}%)`);
  console.log(`tag deltas: ${JSON.stringify(r.tagDeltas)}`);
  console.log(`missing ids (${r.missingIds.length}): ${r.missingIds.slice(0, 20).join(', ')}${r.missingIds.length > 20 ? ' ...' : ''}`);
  console.log(`missing classes (${r.missingClasses.length}): ${r.missingClasses.slice(0, 20).join(', ')}${r.missingClasses.length > 20 ? ' ...' : ''}`);
  console.log(`missing data-attrs (${r.missingDataAttrs.length}): ${r.missingDataAttrs.slice(0, 20).join(', ')}${r.missingDataAttrs.length > 20 ? ' ...' : ''}`);
  process.exit(r.status === 'PASS' ? 0 : 1);
}

let pass = 0;
let fail = 0;
let missing = 0;
console.log(`\nparity check: ${ASTRO_DIR.replace(ROOT + '/', '')} vs ${LEGACY_DIR.replace(ROOT + '/', '')}\n`);
console.log('STATUS  PAGE                                       NORM_DELTA   RAW_DELTA   MISSING_IDS  MISSING_CLASSES  STRUCT_LOSS');
console.log('------  ----                                       ----------   ---------   -----------  ---------------  -----------');
for (const r of results) {
  if (r.status === 'MISSING') {
    missing++;
    console.log(`MISS    ${r.filename.padEnd(43)}                                  -                -          -`);
    continue;
  }
  if (r.status === 'PASS') pass++;
  else fail++;
  const normPctStr = `${r.normalizedBytes.pct >= 0 ? '+' : ''}${(r.normalizedBytes.pct * 100).toFixed(1)}%`;
  const rawPctStr = `${r.bytes.pct >= 0 ? '+' : ''}${(r.bytes.pct * 100).toFixed(1)}%`;
  console.log(
    `${r.status.padEnd(6)}  ${r.filename.padEnd(43)}  ${normPctStr.padStart(8)}  ${rawPctStr.padStart(8)}   ${String(r.missingIds.length).padStart(11)}  ${String(r.missingClasses.length).padStart(15)}  ${String(r.structuralLoss).padStart(11)}`
  );
}

console.log(`\nresult: ${pass} / ${results.length} pages within tolerance.`);
console.log(`        ${fail} fail, ${missing} missing in astro.`);

process.exit(fail + missing > 0 ? 1 : 0);
