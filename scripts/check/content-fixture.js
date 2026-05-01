#!/usr/bin/env node
// Content fingerprint fixture — captures the DOM outline of each dist/ page so we
// can detect content-level regressions during the Astro migration. SEO fixture
// already locks <head>; this locks <body>.
//
// Per page we record:
//   - heading outline (level + text, in document order)
//   - link count (internal / external / mailto)
//   - image count + alt-text presence ratio
//   - word count of visible body text
//   - sorted set of data-action attribute values (the interactivity surface)
//   - presence of key landmark elements (nav, main, footer)
//
// Mode: capture | check. Same contract as scripts/check/seo-fixture.js.

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const FIXTURE = path.join(ROOT, 'tests', 'content-fixture.json');

function walkHtml(dir, base = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.posix.join(base, entry.name);
    if (entry.isDirectory()) {
      if (['api', 'assets', 'images', 'vendor', 'data', 'fonts'].includes(entry.name)) continue;
      out.push(...walkHtml(full, rel));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      out.push(rel);
    }
  }
  return out;
}

function stripScripts(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, ' ');
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function bodyOf(html) {
  const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return m ? m[1] : html;
}

function headingOutline(body) {
  const re = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  const out = [];
  for (const m of body.matchAll(re)) {
    const text = decodeEntities(stripTags(m[2])).replace(/\s+/g, ' ').trim();
    if (text) out.push({ level: Number(m[1]), text });
  }
  return out;
}

function linkStats(body) {
  const re = /<a\b[^>]*\bhref\s*=\s*"([^"]*)"/gi;
  let internal = 0;
  let external = 0;
  let mailto = 0;
  let anchor = 0;
  for (const m of body.matchAll(re)) {
    const href = m[1];
    if (!href || href === '#') anchor++;
    else if (href.startsWith('#')) anchor++;
    else if (href.startsWith('mailto:')) mailto++;
    else if (href.startsWith('http://') || href.startsWith('https://')) external++;
    else internal++;
  }
  return { internal, external, mailto, anchor };
}

function imageStats(body) {
  const re = /<img\b([^>]*)>/gi;
  let total = 0;
  let withAlt = 0;
  for (const m of body.matchAll(re)) {
    total++;
    if (/\balt\s*=\s*"[^"]+"/i.test(m[1])) withAlt++;
  }
  return { total, withAlt };
}

function wordCount(body) {
  const text = decodeEntities(stripTags(stripScripts(body)));
  const words = text.split(/\s+/).filter(Boolean);
  return words.length;
}

function dataActions(body) {
  const re = /data-action\s*=\s*"([^"]+)"/gi;
  const set = new Set();
  for (const m of body.matchAll(re)) set.add(m[1]);
  return [...set].sort();
}

function landmarks(body) {
  return {
    nav: /<nav\b/i.test(body),
    main: /<main\b/i.test(body),
    footer: /<footer\b/i.test(body),
    header: /<header\b/i.test(body)
  };
}

function extractContent(html) {
  const body = bodyOf(html);
  return {
    headings: headingOutline(body),
    links: linkStats(body),
    images: imageStats(body),
    wordCount: wordCount(body),
    dataActions: dataActions(body),
    landmarks: landmarks(body)
  };
}

function captureFixture() {
  if (!fs.existsSync(DIST)) {
    console.error('dist/ does not exist. Run npm run build first.');
    process.exit(1);
  }
  const files = walkHtml(DIST).sort();
  const fixture = {};
  for (const f of files) {
    const html = fs.readFileSync(path.join(DIST, f), 'utf8');
    fixture[f] = extractContent(html);
  }
  fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
  fs.writeFileSync(FIXTURE, `${JSON.stringify(fixture, null, 2)}\n`);
  console.log(`Content fixture written: ${path.relative(ROOT, FIXTURE)} (${files.length} pages)`);
}

function checkFixture() {
  if (!fs.existsSync(FIXTURE)) {
    console.error(`Fixture missing: ${path.relative(ROOT, FIXTURE)}. Run \`node scripts/check/content-fixture.js capture\` first.`);
    process.exit(1);
  }
  if (!fs.existsSync(DIST)) {
    console.error('dist/ does not exist. Run npm run build first.');
    process.exit(1);
  }
  const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  const files = walkHtml(DIST).sort();
  const current = {};
  for (const f of files) {
    const html = fs.readFileSync(path.join(DIST, f), 'utf8');
    current[f] = extractContent(html);
  }
  const fixtureKeys = Object.keys(fixture).sort();
  const currentKeys = Object.keys(current).sort();

  const missing = fixtureKeys.filter((k) => !current[k]);
  const added = currentKeys.filter((k) => !fixture[k]);
  const drifted = [];
  const tolerance = Number(process.env.CONTENT_WORD_TOLERANCE || 0);
  for (const k of fixtureKeys) {
    if (!current[k]) continue;
    const a = fixture[k];
    const b = current[k];
    const diffs = [];
    if (JSON.stringify(a.headings) !== JSON.stringify(b.headings)) diffs.push('headings');
    if (JSON.stringify(a.links) !== JSON.stringify(b.links)) diffs.push('links');
    if (JSON.stringify(a.images) !== JSON.stringify(b.images)) diffs.push('images');
    if (Math.abs(a.wordCount - b.wordCount) > tolerance) diffs.push(`wordCount (${a.wordCount} → ${b.wordCount})`);
    if (JSON.stringify(a.dataActions) !== JSON.stringify(b.dataActions)) diffs.push('dataActions');
    if (JSON.stringify(a.landmarks) !== JSON.stringify(b.landmarks)) diffs.push('landmarks');
    if (diffs.length) drifted.push({ k, diffs });
  }

  let exitCode = 0;
  if (missing.length) {
    console.error('Content regression — pages missing from current build:');
    for (const k of missing) console.error(`  - ${k}`);
    exitCode = 1;
  }
  if (added.length) {
    console.warn('Content note — pages in current build but not in fixture:');
    for (const k of added) console.warn(`  + ${k}`);
  }
  if (drifted.length) {
    console.error('Content regression — fields drifted:');
    for (const { k, diffs } of drifted) console.error(`  ~ ${k}: ${diffs.join(', ')}`);
    exitCode = 1;
  }
  if (exitCode === 0) {
    console.log(`Content OK (${currentKeys.length} pages match fixture).`);
  } else {
    console.error('\nIf the change is intentional, re-run `node scripts/check/content-fixture.js capture` and commit the updated fixture in the same PR with reasoning.');
  }
  process.exit(exitCode);
}

const mode = process.argv[2];
if (mode === 'capture') captureFixture();
else if (mode === 'check' || !mode) checkFixture();
else {
  console.error(`Unknown mode "${mode}". Use \`capture\` or \`check\`.`);
  process.exit(1);
}
