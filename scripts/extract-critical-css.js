#!/usr/bin/env node
/**
 * Critical-CSS extraction. Pulls a small subset of dist/css/chrome.<hash>.css
 * (theme tokens, reset, typography, navbar layout, closed-state rules) and
 * inlines it as `<style>` in every dist/*.html <head>. The full chrome.css
 * keeps loading async via the preload + onload rel-flip pattern.
 *
 * Why a NEW extractor instead of reviving the prior shelved one:
 *   The earlier attempt missed dropdown/modal `display: none` base rules and
 *   the nav rendered fully expanded until async chrome.css landed. This one
 *   includes EVERY closed-state rule by selector pattern so the closed-by-
 *   default UI stays closed before the async stylesheet arrives.
 *
 * Inclusion patterns (kept narrow on purpose — every byte ships ×80 pages):
 *   - :root, [data-theme=...] (CSS variables for theming)
 *   - * universal selectors + ::before/::after (box-sizing, etc.)
 *   - html, body
 *   - h1-h6, p, a, a:hover (typography baseline)
 *   - .container, .skip-link, .sr-only (layout primitives)
 *   - .navbar, .nav-*, .logo, .dropdown-* (above-fold nav layout)
 *   - .hero, .hero-* (homepage above-fold)
 *   - .theme-toggle, .mobile-menu-toggle (visible chrome controls)
 *   - .modal:not(.active), [hidden], [aria-hidden="true"] (closed-state)
 *   - @font-face (font sources)
 *
 * Run after purge:css writes chrome.<hash>.css; before csp:hashes (it'll
 * pick up the new <style> blob's sha256).
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DIST = process.argv.find((a) => a.startsWith('--dist='))?.slice(7) || path.join(ROOT, 'dist');

// Patterns to KEEP critical. Match against the trimmed selector text.
// IMPORTANT: do NOT match interaction/open-state rules (.foo.open, :hover-only
// expansion, .modal.active, etc.) — those should stay in async chrome.css so
// the inlined block is small and there's no FOUC of an open dropdown.
const CRITICAL_PATTERNS = [
  // Theme + reset
  /^:root(?![\w-])/,
  /^\[data-theme=/,
  /^\*$/, /^\*::before/, /^\*::after/, /^\*,/,
  /^html(?![\w-])/,
  /^body(?![\w-])/,
  // Typography baseline
  /^h[1-6](?![\w-])/, /^h[1-6],/,
  /^p(?![\w-])/, /^p,/,
  /^a(?![\w-])/, /^a:hover/,
  /^:focus-visible/,
  // Layout primitives
  /^\.container(?![\w-])/,
  /^\.skip-link/,
  /^\.sr-only/,
  // Nav above-fold layout (closed-state dropdowns by default)
  /^\.navbar(?![\w-])/,
  /^body\.nav-compact/,
  /^\.nav-container/,
  /^\.nav-content/,
  /^\.nav-links(?![\w-])/,
  /^\.nav-links>li/,
  /^\.nav-dropdown(?![\w-])/,
  /^\.dropdown-trigger(?![\w-])/,
  /^\.dropdown-menu(?![\w-])/,
  /^\.dropdown-columns/,
  /^\.dropdown-column/,
  /^\.dropdown-wide-header/,
  /^\.dropdown-icon-link/,
  /^\.logo(?![\w-])/,
  /^\.logo-static/,
  /^\.logo-image/,
  /^\.logo-video/,
  /^\.wisdom-ticker(?![\w-])/,
  /^\.wisdom-ticker-track/,
  /^\.wisdom-item/,
  /^\.navbar-left/,
  /^\.navbar-right/,
  /^\.navbar-contact(?![\w-])/,
  /^\.navbar-contact-btn/,
  /^\.navbar-contact-dropdown/,
  /^\.contact-dropdown-/,
  /^\.theme-toggle(?![\w-])/,
  /^\.theme-toggle-icon/,
  /^\.mobile-menu-toggle/,
  /^\.hamburger/,
  // Hero (homepage above fold)
  /^\.hero(?![\w-])/,
  /^\.hero-/,
  /^\.side-nav(?![\w-])/,
  /^\.side-nav-dot/,
  // Sun/moon theme icon swap
  /^\[data-theme="dark"\] \.icon-sun/,
  /^\[data-theme="dark"\] \.icon-moon/,
  /^\.icon-sun(?![\w-])/,
  /^\.icon-moon(?![\w-])/,
  // Closed-state guards: explicit hidden + aria-hidden
  /^\.hidden(?![\w-])/,
  /^\[hidden\]/,
  /^\[aria-hidden="true"\]/,
  // Icon size primitives (referenced by sprite <use> wrappers everywhere)
  /^\.ico-(stroke|fill|12|14|18|24)/
];

function parseRules(css) {
  const rules = [];
  let pos = 0;
  const n = css.length;
  while (pos < n) {
    while (pos < n && /[\s]/.test(css[pos])) pos++;
    if (pos >= n) break;
    if (css[pos] === '@') {
      // @-rule. Capture the at-rule prelude up to '{' or ';'
      let i = pos;
      while (i < n && css[i] !== '{' && css[i] !== ';') i++;
      if (i >= n) break;
      if (css[i] === ';') { pos = i + 1; continue; }
      // Block @-rule (e.g. @media, @supports, @font-face)
      let depth = 1; i++;
      const start = i;
      while (i < n && depth > 0) {
        if (css[i] === '{') depth++;
        else if (css[i] === '}') depth--;
        i++;
      }
      const prelude = css.slice(pos, css.indexOf('{', pos)).trim();
      const innerStart = css.indexOf('{', pos) + 1;
      const innerEnd = i - 1;
      rules.push({ kind: 'at', prelude, raw: css.slice(pos, i), inner: css.slice(innerStart, innerEnd) });
      pos = i;
      continue;
    }
    const brace = css.indexOf('{', pos);
    if (brace < 0) break;
    const sel = css.slice(pos, brace).trim();
    let depth = 1; let i = brace + 1;
    while (i < n && depth > 0) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
      i++;
    }
    rules.push({ kind: 'rule', sel, raw: css.slice(pos, i), body: css.slice(brace + 1, i - 1) });
    pos = i;
  }
  return rules;
}

function selMatchesAny(sel, patterns) {
  // Selector list (comma-separated) — keep if ANY piece matches.
  const pieces = sel.split(',').map((p) => p.trim());
  return pieces.some((p) => patterns.some((rx) => rx.test(p)));
}

function extractCritical(css) {
  const rules = parseRules(css);
  const kept = [];
  for (const r of rules) {
    if (r.kind === 'at') {
      // Always keep @font-face. For @media etc., recurse and keep matching inner rules.
      if (r.prelude.startsWith('@font-face')) { kept.push(r.raw); continue; }
      if (r.prelude.startsWith('@charset')) { kept.push(r.raw); continue; }
      // For @media and @supports, recursively extract inner critical rules.
      const inner = extractCritical(r.inner);
      if (inner.trim()) {
        kept.push(`${r.prelude}{${inner}}`);
      }
      continue;
    }
    if (selMatchesAny(r.sel, CRITICAL_PATTERNS)) kept.push(r.raw);
  }
  return kept.join('');
}

function findChromeCss() {
  const cssDir = path.join(DIST, 'css');
  if (!fs.existsSync(cssDir)) return null;
  const file = fs.readdirSync(cssDir).find((f) => /^chrome\.[a-f0-9]+\.css$/.test(f));
  return file ? path.join(cssDir, file) : null;
}

function walkHtml(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkHtml(full));
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function main() {
  const chromePath = findChromeCss();
  if (!chromePath) {
    console.error('[critical-css] chrome.<hash>.css not found in dist/css/. Skipping.');
    return;
  }
  const chromeRel = `/css/${path.basename(chromePath)}`;
  const fullCss = fs.readFileSync(chromePath, 'utf8');
  const critical = extractCritical(fullCss);
  console.log(`[critical-css] chrome=${(fullCss.length / 1024).toFixed(1)}KB → critical=${(critical.length / 1024).toFixed(1)}KB (${((critical.length / fullCss.length) * 100).toFixed(1)}%)`);

  // For every HTML file: replace the existing render-blocking <link>
  // for chrome.css with inline <style>{critical}</style> + a preload-onload
  // pattern that promotes the link to a stylesheet once it loads.
  const htmlFiles = walkHtml(DIST);
  let mutated = 0;
  for (const file of htmlFiles) {
    let html = fs.readFileSync(file, 'utf8');
    if (html.includes('data-critical-css="true"')) continue; // already processed
    const linkPattern = new RegExp(`<link rel="stylesheet" href="${chromeRel}"[^>]*>`);
    if (!linkPattern.test(html)) continue;
    // Inline-script promote pattern: avoids `onload=` inline handler so
    // CSP can stay restrictive (no 'unsafe-hashes' / per-handler hashes).
    // The script gets a sha256 from update-csp-hashes.js automatically.
    const replacement = `<style data-critical-css="true">${critical}</style><link id="jg-chrome-css" rel="preload" href="${chromeRel}" as="style"><noscript><link rel="stylesheet" href="${chromeRel}"></noscript><script>(()=>{const l=document.getElementById('jg-chrome-css');if(l){l.rel='stylesheet';l.removeAttribute('id');}})();</script>`;
    html = html.replace(linkPattern, replacement);
    fs.writeFileSync(file, html);
    mutated++;
  }
  console.log(`[critical-css] inlined into ${mutated}/${htmlFiles.length} pages, async-loading chrome.css`);
}

main();
