const fs = require('fs');
const path = require('path');

const root = process.cwd();
const baselinePath = path.join(root, 'data', 'inline-ratchet.json');
const update = process.argv.includes('--update');
const strictPages = new Set([
  'products.html',
  'free-resources.html',
  'projects.html',
  'quotes.html',
  'reading-philosophy.html',
  'start-here.html'
]);

function countInline(html) {
  const withoutJsonLd = html.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');
  const inlineStyles = (html.match(/<style\b[\s\S]*?<\/style>/gi) || []).length;
  const inlineScripts = (withoutJsonLd.match(/<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi) || []).length;
  const inlineHandlers = (html.match(/\s(on[a-z]+)=["'][^"']*["']/gi) || []).length;
  return { inlineStyles, inlineScripts, inlineHandlers };
}

function addCounts(a, b) {
  return {
    inlineStyles: a.inlineStyles + b.inlineStyles,
    inlineScripts: a.inlineScripts + b.inlineScripts,
    inlineHandlers: a.inlineHandlers + b.inlineHandlers
  };
}

function over(current, budget) {
  return current.inlineStyles > budget.inlineStyles
    || current.inlineScripts > budget.inlineScripts
    || current.inlineHandlers > budget.inlineHandlers;
}

const htmlFiles = fs.readdirSync(root).filter((file) => file.endsWith('.html')).sort();
const pages = {};
let totals = { inlineStyles: 0, inlineScripts: 0, inlineHandlers: 0 };

for (const file of htmlFiles) {
  const counts = countInline(fs.readFileSync(path.join(root, file), 'utf8'));
  pages[file] = counts;
  totals = addCounts(totals, counts);
}

const next = {
  version: '1.0',
  updatedAt: new Date().toISOString(),
  policy: 'Counts may only ratchet downward. JSON-LD scripts are excluded.',
  strictPages: Array.from(strictPages).sort(),
  totals,
  pages
};

if (update || !fs.existsSync(baselinePath)) {
  fs.writeFileSync(baselinePath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`Inline ratchet baseline ${update ? 'updated' : 'created'} (${htmlFiles.length} pages).`);
  process.exit(0);
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
let failed = false;

if (over(totals, baseline.totals)) {
  console.error(`Inline totals increased. Current ${JSON.stringify(totals)}, baseline ${JSON.stringify(baseline.totals)}.`);
  failed = true;
}

for (const file of htmlFiles) {
  const current = pages[file];
  const budget = baseline.pages?.[file] || { inlineStyles: 0, inlineScripts: 0, inlineHandlers: 0 };
  if (strictPages.has(file)) {
    const strict = { inlineStyles: 0, inlineScripts: 0, inlineHandlers: 0 };
    if (over(current, strict)) {
      console.error(`${file} violates strict generated-page inline budget: ${JSON.stringify(current)}`);
      failed = true;
    }
    continue;
  }
  if (over(current, budget)) {
    console.error(`${file} inline count increased. Current ${JSON.stringify(current)}, baseline ${JSON.stringify(budget)}.`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log(`Inline ratchet OK (${htmlFiles.length} pages).`);
