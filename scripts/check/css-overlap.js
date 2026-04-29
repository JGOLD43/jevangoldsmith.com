// Audit CSS source files for selector overlap.
// For each pair of source files, computes Jaccard similarity over selector sets.
// Lists pairs with high overlap as merge candidates.

const fs = require('fs');
const path = require('path');
const { walk } = require('./harness');

const cssDir = path.join(process.cwd(), 'css', 'src');

function selectorsIn(file) {
  const text = fs.readFileSync(file, 'utf8');
  const stripped = text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/@(?:media|supports|keyframes|font-face|page|charset|import|namespace|layer)[^{}]*\{(?:[^{}]|\{[^{}]*\})*\}/g, ' ');
  const selectors = new Set();
  const ruleMatch = /([^{}]+)\{[^{}]*\}/g;
  let match;
  while ((match = ruleMatch.exec(stripped)) !== null) {
    const block = match[1].trim();
    if (!block) continue;
    for (const sel of block.split(',')) {
      const cleaned = sel.trim().replace(/\s+/g, ' ');
      if (cleaned && !cleaned.startsWith('@')) selectors.add(cleaned);
    }
  }
  return selectors;
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let intersect = 0;
  for (const value of a) if (b.has(value)) intersect++;
  return intersect / (a.size + b.size - intersect);
}

const files = walk(cssDir, { predicate: (f) => f.endsWith('.css') })
  .map((file) => path.relative(cssDir, file))
  .sort();
const selectors = new Map();
for (const file of files) selectors.set(file, selectorsIn(path.join(cssDir, file)));

const pairs = [];
for (let i = 0; i < files.length; i++) {
  for (let j = i + 1; j < files.length; j++) {
    const a = selectors.get(files[i]);
    const b = selectors.get(files[j]);
    if (a.size < 5 || b.size < 5) continue;
    const score = jaccard(a, b);
    if (score >= 0.25) {
      pairs.push({ a: files[i], b: files[j], score, sizeA: a.size, sizeB: b.size });
    }
  }
}

pairs.sort((x, y) => y.score - x.score);

console.log(`CSS overlap audit (${files.length} files in css/src/):`);
console.log(`Pairs with Jaccard >= 0.25 (selector overlap candidates):\n`);
if (!pairs.length) {
  console.log('  (no significant overlap found)');
} else {
  for (const pair of pairs.slice(0, 25)) {
    console.log(`  ${(pair.score * 100).toFixed(0)}%  ${pair.a} (${pair.sizeA}) <-> ${pair.b} (${pair.sizeB})`);
  }
  if (pairs.length > 25) console.log(`  ... and ${pairs.length - 25} more pairs.`);
}

console.log(`\nTotal source files: ${files.length}`);
console.log(`Total unique selectors: ${new Set([...selectors.values()].flatMap((s) => [...s])).size}`);
const totalSelectors = [...selectors.values()].reduce((sum, s) => sum + s.size, 0);
console.log(`Total selector instances: ${totalSelectors}`);
const dup = totalSelectors - new Set([...selectors.values()].flatMap((s) => [...s])).size;
console.log(`Estimated duplicated selector instances: ${dup}`);
