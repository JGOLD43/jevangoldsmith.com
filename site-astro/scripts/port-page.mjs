#!/usr/bin/env node
// Port a legacy page into site-astro/src/pages/<slug>.astro by combining:
//   - body source (_src/content/<slug>/body.html OR _src/pages/<slug>.html)
//   - SEO metadata from tests/seo-fixture.json (title, description, canonical)
//
// Usage:
//   node scripts/port-page.mjs <slug> [<slug2> ...]
//   node scripts/port-page.mjs --batch about contact meet north-star notes
//
// Idempotent: running twice produces the same file. Designed for bulk porting
// in Phase 4. After running, hand-edit the output if the page needs JS islands,
// dynamic data, or chrome customization (e.g. noChrome for meet).

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const SITE_ASTRO = resolve(HERE, '..');
const SEO_FIXTURE = JSON.parse(readFileSync(resolve(ROOT, 'tests/seo-fixture.json'), 'utf8'));

function findBody(slug) {
  const candidates = [
    resolve(ROOT, `_src/content/${slug}/body.html`),
    resolve(ROOT, `_src/pages/${slug}.html`)
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

function pageProps(slug) {
  const seo = SEO_FIXTURE[`${slug}.html`] || {};
  return {
    title: seo.title || slug,
    description: seo.description || '',
    canonical: typeof seo.canonical === 'string' ? seo.canonical : `https://jevangoldsmith.com/${slug}.html`
  };
}

function stripFrontmatter(html) {
  // Legacy body files often start with their own YAML frontmatter (legacy
  // build engine consumed it). Astro must not see it — it's neither HTML nor
  // an Astro frontmatter block. Returns { body, frontmatter } where
  // frontmatter is the raw YAML text (or '' if none).
  const m = html.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n+/);
  if (!m) return { body: html, frontmatter: '' };
  return { body: html.slice(m[0].length), frontmatter: m[1] };
}

function extractScriptDeps(html) {
  // Find legacy <script src="js/..."> references so Phase 5 (JS islands)
  // knows what to wire. Drop all <script> tags from the emitted body.
  const deps = [];
  const re = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>\s*<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    deps.push(m[1]);
  }
  const body = html.replace(/<script\b[\s\S]*?<\/script>/gi, '');
  return { body, deps };
}

function portPage(slug, opts = {}) {
  const bodyPath = findBody(slug);
  if (!bodyPath) {
    console.error(`  ✗ ${slug}: no body source found`);
    return false;
  }
  const raw = readFileSync(bodyPath, 'utf8');
  const before = raw.length;
  const { body: noFm, frontmatter } = stripFrontmatter(raw);
  const { body: stripped, deps } = extractScriptDeps(noFm);
  const trimmed = stripped.trim();
  const droppedBytes = before - trimmed.length;
  const { title, description, canonical } = pageProps(slug);
  const noChrome = opts.noChrome ? ', noChrome' : '';

  const isCollectionEngine = /^\s*engine:\s*"?collection"?\s*$/m.test(frontmatter);
  const isEmpty = trimmed.length === 0;

  let bodyOut;
  if (isEmpty && isCollectionEngine) {
    bodyOut = `  {/* TODO: collection render — legacy page used engine:"collection".\n      Wire getCollection() and a render loop here matching legacy ${slug}.html. */}\n  <main class="placeholder-page"><h1>${title}</h1></main>`;
  } else if (isEmpty) {
    bodyOut = `  {/* TODO: legacy body was empty after frontmatter strip. Hand-fill ${slug}. */}\n  <main class="placeholder-page"><h1>${title}</h1></main>`;
  } else {
    bodyOut = trimmed;
  }

  const depsComment = deps.length > 0 ? `\n// js-deps: ${deps.join(', ')}` : '';

  // Escape backticks/dollars only inside ${} so they survive the template literal.
  // Body is emitted verbatim — Astro accepts HTML in templates.
  const out = `---
// Ported from ${bodyPath.replace(ROOT + '/', '')} via scripts/port-page.mjs.
// SEO mirrors tests/seo-fixture.json.${depsComment}
import Base from '../layouts/Base.astro';
---
<Base
  title=${JSON.stringify(title)}
  description=${JSON.stringify(description)}
  canonical=${JSON.stringify(canonical)}${noChrome}
>
${bodyOut}
</Base>
`;

  const dest = resolve(SITE_ASTRO, `src/pages/${slug}.astro`);
  writeFileSync(dest, out);
  const tail = droppedBytes > 0 ? `, dropped ${droppedBytes}b (frontmatter+scripts)` : '';
  const depTail = deps.length > 0 ? ` deps=[${deps.join(',')}]` : '';
  const stubTail = isEmpty ? ' [STUB]' : '';
  console.log(`  ✓ ${slug}.astro  (${trimmed.length} body bytes${tail})${depTail}${stubTail}`);
  return true;
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/port-page.mjs <slug> [<slug2> ...]');
  process.exit(1);
}

// Pages whose chrome is replaced by their own header.
const NO_CHROME = new Set(['meet']);

const batch = args.filter((a) => a !== '--batch');
let ok = 0;
let fail = 0;
for (const slug of batch) {
  const success = portPage(slug, { noChrome: NO_CHROME.has(slug) });
  if (success) ok++; else fail++;
}
console.log(`\n${ok} ported, ${fail} failed.`);
process.exit(fail > 0 ? 1 : 0);
