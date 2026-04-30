#!/usr/bin/env node
// SEO regression fixture extractor + checker.
//
// Extracts every SEO surface from each HTML file in dist/:
//   - <title>, meta description, robots, canonical
//   - all og:* and twitter:* tags
//   - all <link rel="alternate"> tags
//   - the JSON-LD payload (parsed, key-sorted, re-serialized)
//
// Mode: `node scripts/check/seo-fixture.js capture` writes tests/seo-fixture.json
// Mode: `node scripts/check/seo-fixture.js check`   diffs current dist/ vs fixture
//
// SEO is locked. Any intentional change requires `capture` to be re-run in the
// same PR with reasoning in the commit message.

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const FIXTURE = path.join(ROOT, 'tests', 'seo-fixture.json');

function walkHtml(dir, base = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.posix.join(base, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'api' || entry.name === 'assets' || entry.name === 'images' || entry.name === 'vendor' || entry.name === 'data' || entry.name === 'fonts' || entry.name === 'topics') continue;
      out.push(...walkHtml(full, rel));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      out.push(rel);
    }
  }
  return out;
}

function attr(html, name) {
  // Match attribute regardless of quote style. Returns first match.
  const re = new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 'i');
  const m = html.match(re);
  return m ? m[1] : null;
}

function metaContent(html, identifier) {
  // <meta name="X" content="..."> or <meta property="X" content="...">
  const namePattern = new RegExp(`<meta\\s+(?:name|property)\\s*=\\s*"${identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s+content\\s*=\\s*"([^"]*)"\\s*/?>`, 'i');
  const m = html.match(namePattern);
  return m ? m[1] : null;
}

function allMeta(html, prefix) {
  const re = new RegExp(`<meta\\s+(?:name|property)\\s*=\\s*"(${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*)"\\s+content\\s*=\\s*"([^"]*)"\\s*/?>`, 'gi');
  const out = {};
  for (const m of html.matchAll(re)) out[m[1]] = m[2];
  return out;
}

function allLinks(html, rel) {
  const re = new RegExp(`<link\\s+([^>]*)\\brel\\s*=\\s*"${rel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"([^>]*)>`, 'gi');
  const out = [];
  for (const m of html.matchAll(re)) {
    const tag = m[0];
    const href = attr(tag, 'href');
    const type = attr(tag, 'type');
    const title = attr(tag, 'title');
    const hreflang = attr(tag, 'hreflang');
    out.push({ href, type, title, hreflang });
  }
  return out.sort((a, b) => (a.href || '').localeCompare(b.href || ''));
}

function jsonLd(html) {
  // <script type="application/ld+json">{...}</script>
  const re = /<script\s+type\s*=\s*"application\/ld\+json"\s*>([\s\S]*?)<\/script>/gi;
  const blocks = [];
  for (const m of html.matchAll(re)) {
    try {
      const parsed = JSON.parse(m[1].trim());
      blocks.push(parsed);
    } catch (e) {
      blocks.push({ __parse_error: e.message, __raw: m[1].slice(0, 200) });
    }
  }
  return blocks.length === 1 ? blocks[0] : blocks;
}

function titleOf(html) {
  const m = html.match(/<title>([^<]*)<\/title>/i);
  return m ? m[1] : null;
}

function sortedJson(value) {
  // Stable JSON.stringify with sorted keys at every level.
  if (Array.isArray(value)) return value.map(sortedJson);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((acc, k) => {
      acc[k] = sortedJson(value[k]);
      return acc;
    }, {});
  }
  return value;
}

function extractSeo(html) {
  return {
    title: titleOf(html),
    description: metaContent(html, 'description'),
    robots: metaContent(html, 'robots'),
    canonical: (() => {
      const links = allLinks(html, 'canonical');
      return links.length === 1 ? links[0].href : links;
    })(),
    og: allMeta(html, 'og:'),
    twitter: allMeta(html, 'twitter:'),
    alternate: allLinks(html, 'alternate'),
    jsonLd: sortedJson(jsonLd(html))
  };
}

function captureFixture() {
  if (!fs.existsSync(DIST)) {
    console.error('dist/ does not exist. Run npm run build first.');
    process.exit(1);
  }
  const files = walkHtml(DIST);
  const fixture = {};
  for (const f of files.sort()) {
    const html = fs.readFileSync(path.join(DIST, f), 'utf8');
    fixture[f] = extractSeo(html);
  }
  fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
  fs.writeFileSync(FIXTURE, `${JSON.stringify(fixture, null, 2)}\n`);
  console.log(`SEO fixture written: ${path.relative(ROOT, FIXTURE)} (${files.length} pages)`);
}

function checkFixture() {
  if (!fs.existsSync(FIXTURE)) {
    console.error(`Fixture missing: ${path.relative(ROOT, FIXTURE)}. Run \`node scripts/check/seo-fixture.js capture\` first.`);
    process.exit(1);
  }
  if (!fs.existsSync(DIST)) {
    console.error('dist/ does not exist. Run npm run build first.');
    process.exit(1);
  }
  const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  const files = walkHtml(DIST);
  const current = {};
  for (const f of files.sort()) {
    const html = fs.readFileSync(path.join(DIST, f), 'utf8');
    current[f] = extractSeo(html);
  }
  const fixtureKeys = Object.keys(fixture).sort();
  const currentKeys = Object.keys(current).sort();

  const missingFromCurrent = fixtureKeys.filter((k) => !current[k]);
  const newInCurrent = currentKeys.filter((k) => !fixture[k]);
  const drifted = [];
  for (const k of fixtureKeys) {
    if (!current[k]) continue;
    const a = JSON.stringify(fixture[k]);
    const b = JSON.stringify(current[k]);
    if (a !== b) drifted.push(k);
  }

  let exitCode = 0;
  if (missingFromCurrent.length) {
    console.error(`SEO regression — pages missing from current build:`);
    for (const k of missingFromCurrent) console.error(`  - ${k}`);
    exitCode = 1;
  }
  if (newInCurrent.length) {
    console.warn(`SEO note — pages in current build but not in fixture:`);
    for (const k of newInCurrent) console.warn(`  + ${k}`);
  }
  if (drifted.length) {
    console.error(`SEO regression — fields drifted from fixture on:`);
    for (const k of drifted) {
      console.error(`  ~ ${k}`);
      const a = fixture[k];
      const b = current[k];
      for (const field of Object.keys(a)) {
        const av = JSON.stringify(a[field]);
        const bv = JSON.stringify(b[field]);
        if (av !== bv) {
          console.error(`      ${field}:`);
          console.error(`        was: ${av.slice(0, 200)}`);
          console.error(`        now: ${bv.slice(0, 200)}`);
        }
      }
    }
    exitCode = 1;
  }
  if (exitCode === 0) {
    console.log(`SEO OK (${currentKeys.length} pages match fixture).`);
  } else {
    console.error('\nIf the change is intentional, re-run `node scripts/check/seo-fixture.js capture` and commit the updated fixture in the same PR with reasoning.');
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
