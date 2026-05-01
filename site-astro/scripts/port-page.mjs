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

function stripScripts(html) {
  // Astro's bundler tries to resolve src="js/..." imports at build time. Legacy
  // pages reference /js/*.js modules that still live outside Astro. Strip them
  // for Phase 4 (static structure only). Re-introduced as Astro islands later.
  return html.replace(/<script\b[\s\S]*?<\/script>/gi, '');
}

function portPage(slug, opts = {}) {
  const bodyPath = findBody(slug);
  if (!bodyPath) {
    console.error(`  ✗ ${slug}: no body source found`);
    return false;
  }
  let body = readFileSync(bodyPath, 'utf8');
  const before = body.length;
  body = stripScripts(body);
  const stripped = before - body.length;
  const { title, description, canonical } = pageProps(slug);
  const noChrome = opts.noChrome ? ', noChrome' : '';

  // Escape backticks/dollars only inside ${} so they survive the template literal.
  // Body is emitted verbatim — Astro accepts HTML in templates.
  const out = `---
// Ported from ${bodyPath.replace(ROOT + '/', '')} via scripts/port-page.mjs.
// SEO mirrors tests/seo-fixture.json. JSON-LD lands in Phase 8.
import Base from '../layouts/Base.astro';
---
<Base
  title=${JSON.stringify(title)}
  description=${JSON.stringify(description)}
  canonical=${JSON.stringify(canonical)}${noChrome}
>
${body.trim()}
</Base>
`;

  const dest = resolve(SITE_ASTRO, `src/pages/${slug}.astro`);
  writeFileSync(dest, out);
  const tail = stripped > 0 ? `, stripped ${stripped} bytes of <script>` : '';
  console.log(`  ✓ ${slug}.astro  (${body.length} body bytes from ${bodyPath.replace(ROOT + '/', '')}${tail})`);
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
