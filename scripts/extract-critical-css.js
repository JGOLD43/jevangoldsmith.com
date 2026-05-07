#!/usr/bin/env node
/**
 * Critical CSS extraction. Identifies a small subset of chrome.css
 * (typography reset, theme tokens, nav, hero, footer, container) and
 * inlines that subset in <head>. The rest of chrome.css is loaded
 * async via the preload-onload trick. The per-page CSS already
 * inlines for tiny slices and externalizes for large ones.
 *
 * Why: render-blocking chrome.css fetches add ~150-400ms FCP on slow
 * connections. Inlining the critical subset (~5KB) lets first paint
 * happen against the HTML byte-stream alone, with chrome.css arriving
 * non-blocking shortly after. Speculation Rules prerender already pre-
 * warms the chrome.css cache for hover-to-nav, so the cold-first-visit
 * case is the only one that wins, and that's the one that's most
 * painful on mobile networks.
 *
 * The visual baseline harness (npm run check:visual) catches CLS or
 * FOUC regressions by snapshotting frame state at desktop/tablet/mobile
 * widths. Run that after this script lands.
 *
 * Run after purge:css, before modulepreload.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DIST = process.argv.find((a) => a.startsWith('--dist='))?.slice(7) || path.join(ROOT, 'dist');

// Selector regex matchers for what stays critical. Anything matching
// these is inlined; everything else stays in the async chrome.css.
//
// The list is pessimistic toward CLS prevention — anything that affects
// layout or above-fold rendering goes in. Tooltip/dropdown content and
// modal overlays do NOT go in (deferred = fine).
// Tightened to only the rules that affect first-paint structure.
// Below-fold and interaction-state styles (dropdowns when open, modals,
// mobile nav menus) stay in the async chrome.css. Anything in this list
// is a rule that, if missing on first paint, would cause CLS or visual
// flash. Keep this list small — every entry adds ~N bytes × 80 pages.
const CRITICAL_SELECTOR_PATTERNS = [
  /^:root\b/,
  /^\[data-theme/,
  /^\*$/,
  /^\*::/,
  /^html\b/,
  /^body\b/,
  /^h[1-6]\b/,
  /^a$/,
  /^p$/,
  /^:focus-visible\b/,
  /^\.container$/,
  /^\.sr-only\b/,
  // Nav chrome — collapsed to top-level structure only. Dropdown menus
  // fall through to the async sheet (closed state has display:none, so
  // a brief unstyled flash isn't visible).
  /^\.navbar$/,
  /^\.navbar-left\b/,
  /^\.navbar-right\b/,
  /^\.nav-links\b/,
  /^\.nav-dropdown$/,
  /^\.logo$/,
  /^\.logo-static\b/,
  /^\.logo-image\b/,
  /^\.theme-toggle$/,
  /^\.wisdom-ticker$/,
  /^\.wisdom-ticker-track\b/,
  // Sprite icon helpers (used immediately by nav)
  /^\.ico-/
];

function isCriticalSelector(selectorList) {
  // Comma-separated; if ANY individual selector matches we keep the rule.
  return selectorList.split(',').some((sel) => {
    const s = sel.trim();
    return CRITICAL_SELECTOR_PATTERNS.some((p) => p.test(s));
  });
}

function parseRules(text) {
  const rules = [];
  let i = 0;
  const len = text.length;
  while (i < len) {
    while (i < len && /\s/.test(text[i])) i++;
    if (i >= len) break;
    if (text[i] === '@') {
      const start = i;
      while (i < len && text[i] !== ';' && text[i] !== '{') i++;
      if (i < len && text[i] === ';') {
        i++;
        rules.push({ atRule: text.slice(start, i), block: false });
        continue;
      }
      let depth = 0;
      do {
        if (text[i] === '{') depth++;
        else if (text[i] === '}') depth--;
        i++;
      } while (i < len && depth > 0);
      rules.push({ atRule: text.slice(start, i), block: true });
      continue;
    }
    const selStart = i;
    while (i < len && text[i] !== '{') i++;
    const selector = text.slice(selStart, i).trim();
    if (i >= len) break;
    let depth = 0;
    do {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') depth--;
      i++;
    } while (i < len && depth > 0);
    rules.push({ selector, body: text.slice(selStart + selector.length, i) });
  }
  return rules;
}

function splitCss(text) {
  const rules = parseRules(text);
  const critical = [];
  const deferred = [];
  for (const r of rules) {
    if (r.atRule) {
      const at = r.atRule;
      if (/^@(font-face|charset|import|namespace|property|counter-style|page)\b/.test(at)) {
        // @font-face must run as soon as possible — keep critical.
        if (/^@font-face\b/.test(at)) critical.push(at);
        else deferred.push(at);
        continue;
      }
      if (/^@keyframes\b/.test(at)) {
        // keyframes are referenced by .wisdom-ticker-track and a few
        // other animations the nav uses; inline them too.
        critical.push(at);
        continue;
      }
      if (/^@(media|supports|container)\b/.test(at)) {
        // Drill into media-block. Only keep the inner rules that match
        // the critical list; if any survive, ship the wrapping at-rule.
        const head = at.match(/^@\w+[^{]*\{/)?.[0] ?? '';
        const inner = at.slice(head.length, -1);
        const innerRules = parseRules(inner);
        const keptCritical = innerRules
          .filter((r2) => !r2.atRule && isCriticalSelector(r2.selector))
          .map((r2) => r2.selector + r2.body)
          .join('');
        if (keptCritical) critical.push(head + keptCritical + '}');
        // The full media block stays in deferred too (covers everything else).
        deferred.push(at);
        continue;
      }
      deferred.push(at);
      continue;
    }
    if (isCriticalSelector(r.selector)) critical.push(r.selector + r.body);
    else deferred.push(r.selector + r.body);
  }
  return { critical: critical.join(''), deferred: deferred.join('') };
}

function walkHtml(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkHtml(full));
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const cssDir = path.join(DIST, 'css');
const chromeCssFile = fs.readdirSync(cssDir).find((f) => /^chrome\.[a-f0-9]+\.css$/.test(f));
if (!chromeCssFile) {
  console.error('[critical-css] missing chrome.HASH.css');
  process.exit(1);
}
const chromeCssPath = path.join(cssDir, chromeCssFile);
const chromeCss = fs.readFileSync(chromeCssPath, 'utf8');
const { critical } = splitCss(chromeCss);
// Only print stats; chrome.css is deliberately left intact so async
// fallback still ships every rule. Inlining a strict critical subset and
// keeping the full file as the async sheet means a critical-rule miss
// still gets covered by the async stylesheet — no FOUC of unstyled
// content, only a brief moment of un-fully-styled chrome before async
// arrives. Belt and braces.

const html = walkHtml(DIST);
let mutated = 0;
const wrappedCritical = `<style data-critical>${critical}</style>`;

for (const file of html) {
  let text = fs.readFileSync(file, 'utf8');
  // Already injected? skip.
  if (text.includes('data-critical')) continue;
  // Insert before the chrome.css link, then convert the chrome.css link
  // to async-load via the preload-onload trick.
  const chromeLinkRe = /<link rel="stylesheet" href="\/css\/chrome\.[a-f0-9]+\.css"([^>]*)>/;
  const m = text.match(chromeLinkRe);
  if (!m) continue;
  const href = m[0].match(/href="([^"]+)"/)?.[1];
  if (!href) continue;
  // Async-load chrome.css. We can't use the `onload="this.rel='stylesheet'"`
  // trick because the site's CSP doesn't allow inline event handlers
  // (would require 'unsafe-hashes' / 'unsafe-inline'). Instead we emit
  // an external preload + an inline <script> that flips rel after a
  // microtask, plus a <noscript> fallback for no-JS clients. The inline
  // script is identical on every page so update-csp-hashes.js adds a
  // single hash entry to script-src.
  const sheetId = 'jg-async-chrome';
  const asyncSheet = `<link id="${sheetId}" rel="preload" href="${href}" as="style"><script>(function(){var l=document.getElementById('${sheetId}');if(l){l.rel='stylesheet'}})();</script><noscript><link rel="stylesheet" href="${href}"></noscript>`;
  text = text.replace(chromeLinkRe, wrappedCritical + asyncSheet);
  fs.writeFileSync(file, text);
  mutated++;
}

const KB = 1024;
console.log(`[critical-css] critical=${(critical.length / KB).toFixed(1)}KB inlined into ${mutated} page(s); chrome=${(chromeCss.length / KB).toFixed(1)}KB stays async`);
