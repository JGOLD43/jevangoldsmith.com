#!/usr/bin/env node
/**
 * Per-page CSS purger. The legacy 187KB style.css carries every selector
 * in the site, but most pages only use 20-40% of those rules. This script
 * walks every HTML in dist-astro/, scans the actual classes / IDs / tag
 * names referenced (including by JS that runs on the page — so we err on
 * the side of keeping rules that match anything mentioned), and emits a
 * per-page <slug>.HASH.css stripped to just those rules.
 *
 * Each <link rel="stylesheet" href="/css/legacy-style.css"> is rewritten
 * to <link rel="stylesheet" href="/css/per-page/<slug>.HASH.css"> with
 * the same `fetchpriority="high"`. Cuts CSS transfer ~50-70% on small
 * pages, ~30-50% on collection pages — meaningful FCP win because the
 * smaller CSS parses + applies faster.
 *
 * SAFETY: false-positives (keeping unused rules) are fine; false-negatives
 * (removing used rules) cause visual regression. We're conservative:
 *   - Match by class name presence anywhere in the HTML (incl. data-attrs).
 *   - Always keep :root, [data-theme], universal reset, html/body, h1-h6,
 *     a, p, ul, li, button, @font-face, @keyframes, @media wrapping kept rules.
 *   - Always keep selectors that don't reference any class/id (tag-only).
 *   - Always keep dynamically-added classes (e.g. ".active", ".hidden",
 *     ".collapsed", ".visible") even if not in the static HTML.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const DIST = process.argv.find((a) => a.startsWith('--dist='))?.slice(7) || path.join(ROOT, 'dist');
const SOURCE_CSS = path.join(DIST, 'css/legacy-style.css');

if (!fs.existsSync(SOURCE_CSS)) {
  console.error(`[purge-css] missing ${SOURCE_CSS}`);
  process.exit(1);
}

const css = fs.readFileSync(SOURCE_CSS, 'utf8');

// Classes that may appear at runtime (added by JS) — never remove rules
// that reference these even if not in static HTML.
const RUNTIME_CLASSES = new Set([
  'active', 'open', 'visible', 'hidden', 'collapsed', 'expanded',
  'show', 'hide', 'loading', 'loaded', 'error', 'success',
  'is-active', 'is-open', 'is-visible', 'is-hidden', 'is-loading',
  'has-error', 'has-image', 'has-photo',
  'modal-open', 'menu-open', 'mobile-open',
  'sidebar-collapsed', 'sidebar-open',
  'theme-dark', 'theme-light',
  'fade-in', 'fade-out', 'slide-in', 'slide-out',
  'dragging', 'hovering', 'focused', 'selected',
  'sticky', 'fixed',
  'js-loaded', 'js-initialized',
  // book/movie/people card states added by their respective scripts
  'js-zoom-item', 'zoom-active',
  'flipped', 'expanded-card',
  'filter-active', 'filter-pill',
  'wisdom-active'
]);

// Tags / attribute selectors that should always be kept (lots of rules
// scope to attribute selectors like [data-theme], [data-status], etc.)
const ALWAYS_KEEP_PATTERNS = [
  /^:root$/,
  /^\[data-theme/,
  /^\*$/,
  /^\*::?(before|after|backdrop)$/,
  /^html$/,
  /^body$/,
  /^h[1-6]$/,
  /^a$/,
  /^a:hover$/,
  /^p$/,
  /^button$/,
  /^input$/,
  /^select$/,
  /^textarea$/,
  /^ul$/,
  /^li$/,
  /^img$/,
  /^picture$/,
  /^source$/,
  /^video$/,
  /^svg$/,
  /^figure$/,
  /^figcaption$/,
  /^blockquote$/,
  /^cite$/,
  /^code$/,
  /^pre$/,
  /^header$/,
  /^footer$/,
  /^nav$/,
  /^main$/,
  /^section$/,
  /^article$/,
  /^aside$/,
  /^:focus-visible$/,
  /^::-moz/,
  /^::-webkit/
];

// Walk top-level rules and at-rules.
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

// Cache of JS bundle contents → token sets so we don't re-parse them per page.
const BUNDLE_TOKEN_CACHE = new Map();

function tokensFromJsSource(text) {
  const classes = new Set();
  const ids = new Set();
  // class references — quoted strings used as classes:
  //   classList.add('x'), 'class="x y"', .x, etc.
  for (const m of text.matchAll(/['"`]([a-zA-Z][\w\s-]{1,80}?)['"`]/g)) {
    const v = m[1].trim();
    if (!v) continue;
    // Could be space-separated class list "x y z"
    for (const tok of v.split(/\s+/)) {
      if (tok && /^[a-zA-Z][\w-]*$/.test(tok)) classes.add(tok);
    }
  }
  // Selector strings — anything matching .foo or #foo inside JS source.
  for (const m of text.matchAll(/[.#]([a-zA-Z][\w-]{2,})\b/g)) {
    if (m[0].startsWith('.')) classes.add(m[1]);
    else ids.add(m[1]);
  }
  return { classes, ids };
}

function tokensFromBundleFile(bundlePath) {
  if (BUNDLE_TOKEN_CACHE.has(bundlePath)) return BUNDLE_TOKEN_CACHE.get(bundlePath);
  const abs = path.join(DIST, bundlePath.replace(/^\//, ''));
  if (!fs.existsSync(abs)) {
    const empty = { classes: new Set(), ids: new Set() };
    BUNDLE_TOKEN_CACHE.set(bundlePath, empty);
    return empty;
  }
  const tokens = tokensFromJsSource(fs.readFileSync(abs, 'utf8'));
  BUNDLE_TOKEN_CACHE.set(bundlePath, tokens);
  return tokens;
}

// Extract every class name + id + tag mentioned in the page HTML.
function extractTokensFromHtml(html) {
  const classes = new Set();
  const ids = new Set();
  const tags = new Set();

  for (const m of html.matchAll(/class=["']([^"']+)["']/g)) {
    for (const c of m[1].split(/\s+/)) if (c) classes.add(c);
  }
  for (const m of html.matchAll(/id=["']([^"']+)["']/g)) ids.add(m[1]);
  for (const m of html.matchAll(/<([a-z][a-z0-9-]*)\b/g)) tags.add(m[1].toLowerCase());

  // Inline <script> blocks — pick up runtime class names.
  for (const m of html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
    const t = tokensFromJsSource(m[1]);
    for (const c of t.classes) classes.add(c);
    for (const i of t.ids) ids.add(i);
  }

  // External <script src> bundles — scan their contents too.
  for (const m of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)) {
    const src = m[1];
    if (!src.startsWith('/')) continue;
    const t = tokensFromBundleFile(src);
    for (const c of t.classes) classes.add(c);
    for (const i of t.ids) ids.add(i);
  }
  // Also scan bundle src that's relative (e.g. "assets/js/bundles/page-X.js")
  for (const m of html.matchAll(/<script\b[^>]*\bsrc=["'](assets\/[^"']+)["']/g)) {
    const t = tokensFromBundleFile('/' + m[1]);
    for (const c of t.classes) classes.add(c);
    for (const i of t.ids) ids.add(i);
  }

  // Add runtime classes
  for (const c of RUNTIME_CLASSES) classes.add(c);

  return { classes, ids, tags };
}

// Test if a single selector references anything in the kept token sets.
function selectorMatches(selector, { classes, ids, tags }) {
  // Normalize whitespace
  const sel = selector.trim();

  // Always-keep patterns
  if (ALWAYS_KEEP_PATTERNS.some((p) => p.test(sel))) return true;

  // Extract all classes / ids / tags / attribute selectors
  const sigClasses = [...sel.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]);
  const sigIds = [...sel.matchAll(/#([a-zA-Z][\w-]*)/g)].map((m) => m[1]);
  const sigTags = [...sel.matchAll(/(?:^|[\s>+~,])([a-z][a-z0-9-]*)(?=[.#:\[\s>+~,]|$)/g)].map((m) => m[1].toLowerCase()).filter((t) => !['root', 'host'].includes(t));

  // If selector has NO signatures, keep it (rare — pseudo only, etc.)
  if (sigClasses.length === 0 && sigIds.length === 0 && sigTags.length === 0) return true;

  // For each signature, the selector is "used" if at least ONE of its
  // class/id requirements matches. (CSS specificity: rule applies only if
  // ALL parts of the selector match the element, but we don't know without
  // running matches; we conservatively keep if any class/id is present.)
  if (sigClasses.length > 0) {
    if (sigClasses.some((c) => classes.has(c))) return true;
  }
  if (sigIds.length > 0) {
    if (sigIds.some((i) => ids.has(i))) return true;
  }
  // Pure tag selectors (no class/id) — keep if tag is on the page.
  if (sigClasses.length === 0 && sigIds.length === 0 && sigTags.some((t) => tags.has(t))) return true;

  return false;
}

function selectorsMatch(rawSelectorList, tokens) {
  // Comma-separated — keep the rule if ANY individual selector matches.
  return rawSelectorList.split(',').some((s) => selectorMatches(s, tokens));
}

function purge(rules, tokens) {
  const out = [];
  for (const r of rules) {
    if (r.atRule) {
      const at = r.atRule;
      // @font-face / @charset / @import / @keyframes — always keep.
      if (/^@(font-face|charset|import|keyframes|page|property|counter-style|namespace)\b/.test(at)) {
        out.push(at);
        continue;
      }
      // @media / @supports — drill in.
      if (/^@(media|supports|container)\b/.test(at)) {
        const head = at.match(/^@\w+[^{]*\{/)?.[0] ?? '';
        const inner = at.slice(head.length, -1);
        const innerRules = parseRules(inner);
        const keptInner = purge(innerRules, tokens);
        if (keptInner.length > 0) out.push(head + keptInner.join('') + '}');
        continue;
      }
      // Unknown at-rule — keep to be safe.
      out.push(at);
      continue;
    }
    if (selectorsMatch(r.selector, tokens)) {
      out.push(r.selector + r.body);
    }
  }
  return out;
}

const allRules = parseRules(css);

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else if (e.isFile() && e.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const outDir = path.join(DIST, 'css/per-page');
fs.mkdirSync(outDir, { recursive: true });

const htmlFiles = walk(DIST);

// Phase A — chrome extraction.
//
// Step 1: per-page purge into memory (don't write yet). We need every
// page's kept-rule list to compute the cross-page intersection.
const perPage = htmlFiles.map((file) => {
  const html = fs.readFileSync(file, 'utf8');
  const tokens = extractTokensFromHtml(html);
  const kept = purge(allRules, tokens);
  return { file, html, kept };
});

// Step 2: identify "chrome" rules — present on >= CHROME_THRESHOLD fraction
// of pages. Compare by exact source-text equality (selector + body).
//
// Keeps shared chrome (nav, footer, body, typography, theme tokens) in a
// single long-cached chrome.HASH.css linked from every page; per-page
// stylesheets shrink to just page-specific selectors.
const CHROME_THRESHOLD = Number(process.env.CHROME_THRESHOLD || 0.7);
const ruleCount = new Map();
for (const { kept } of perPage) {
  const seenThisPage = new Set();
  for (const rule of kept) {
    if (seenThisPage.has(rule)) continue;
    seenThisPage.add(rule);
    ruleCount.set(rule, (ruleCount.get(rule) || 0) + 1);
  }
}
const minPages = Math.ceil(perPage.length * CHROME_THRESHOLD);
const chromeRuleSet = new Set();
const chromeRulesOrdered = [];
// Walk the original rule order so chrome.css preserves cascade.
for (const rule of perPage[0]?.kept || []) {
  if ((ruleCount.get(rule) || 0) >= minPages && !chromeRuleSet.has(rule)) {
    chromeRuleSet.add(rule);
    chromeRulesOrdered.push(rule);
  }
}
// Some chrome rules may only appear on later pages (e.g. lesson-logger
// adds a rule the index doesn't). Append them in insertion order.
for (const { kept } of perPage.slice(1)) {
  for (const rule of kept) {
    if ((ruleCount.get(rule) || 0) >= minPages && !chromeRuleSet.has(rule)) {
      chromeRuleSet.add(rule);
      chromeRulesOrdered.push(rule);
    }
  }
}

const chromeCss = chromeRulesOrdered.join('');
const chromeHash = crypto.createHash('sha256').update(chromeCss).digest('hex').slice(0, 10);
const chromeFile = `chrome.${chromeHash}.css`;
fs.writeFileSync(path.join(DIST, 'css', chromeFile), chromeCss);

// Step 3: write per-page CSS minus the chrome rules; rewrite each page's
// <link> so it pulls chrome.HASH.css first (long-cacheable, shared across
// the whole site) and the per-page slice second.
const stats = [];
let mutated = 0;

for (const { file, html, kept } of perPage) {
  const pageRules = kept.filter((r) => !chromeRuleSet.has(r));
  const purged = pageRules.join('');
  const h = crypto.createHash('sha256').update(purged).digest('hex').slice(0, 10);
  const slug = path.relative(DIST, file).replace(/\.html$/, '').replace(/[\/]/g, '__');
  const outFile = `${slug}.${h}.css`;
  fs.writeFileSync(path.join(outDir, outFile), purged);

  // Phase G: inline the per-page CSS in <head> instead of fetching it.
  // chrome.css stays external (long-cached, shared across all pages), but
  // the per-page slice is small (avg ~5.7KB) so a separate request just
  // costs one RTT on FCP. Inlining drops that RTT entirely. The per-page
  // file is still written to disk for inspection / debugging.
  const inlineStyle = purged ? `\n  <style>${purged}</style>` : '';
  const next = html.replace(
    /<link rel="stylesheet" href="\/css\/legacy-style\.css"([^>]*)>/g,
    `<link rel="stylesheet" href="/css/${chromeFile}"$1>${inlineStyle}`
  );
  if (next !== html) {
    fs.writeFileSync(file, next);
    mutated++;
  }

  stats.push({ file: path.relative(DIST, file), bytes: purged.length });
}

stats.sort((a, b) => a.bytes - b.bytes);
const total = stats.reduce((s, x) => s + x.bytes, 0);
const avg = total / stats.length;
const original = css.length;
console.log(`[purge-css] ${stats.length} pages, original=${(original/1024).toFixed(1)}KB`);
console.log(`[purge-css] chrome=${(chromeCss.length/1024).toFixed(1)}KB (shared, cached) → ${chromeFile}`);
console.log(`[purge-css] per-page avg=${(avg/1024).toFixed(1)}KB  min=${(stats[0].bytes/1024).toFixed(1)}KB (${stats[0].file})  max=${(stats[stats.length-1].bytes/1024).toFixed(1)}KB (${stats[stats.length-1].file})`);
console.log(`[purge-css] saving on first visit: chrome+page avg ${((chromeCss.length+avg)/1024).toFixed(1)}KB vs original ${(original/1024).toFixed(1)}KB (${((1-(chromeCss.length+avg)/original)*100).toFixed(0)}%)`);
console.log(`[purge-css] saving on repeat visit: per-page avg ${(avg/1024).toFixed(1)}KB vs original ${(original/1024).toFixed(1)}KB (${((1-avg/original)*100).toFixed(0)}%)`);
console.log(`[purge-css] rewrote link tag in ${mutated}/${stats.length} pages`);
