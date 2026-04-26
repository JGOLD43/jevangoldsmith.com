const fs = require('fs');
const path = require('path');

const root = process.cwd();
const config = JSON.parse(fs.readFileSync(path.join(root, 'data', 'site.config.json'), 'utf8'));
const budgets = config.budgets;
const dist = path.join(root, config.hosting.public);
const failures = [];

function fail(message) {
  failures.push(message);
}

function bytes(file) {
  return fs.statSync(file).size;
}

function localAssetRefs(html) {
  const refs = new Set();
  const patterns = [
    /<link[^>]+href=["']([^"']+\.(?:css|js))(?:\?[^"']*)?["'][^>]*>/gi,
    /<script[^>]+src=["']([^"']+\.js)(?:\?[^"']*)?["'][^>]*>/gi
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html))) {
      const ref = match[1];
      if (/^(?:https?:)?\/\//i.test(ref) || ref.startsWith('data:')) continue;
      refs.add(ref.replace(/^\//, ''));
    }
  }

  return Array.from(refs);
}

function endpointSize(relativePath) {
  const file = path.join(dist, relativePath);
  if (!fs.existsSync(file)) {
    fail(`${relativePath} is missing.`);
    return 0;
  }
  return bytes(file);
}

if (!fs.existsSync(dist)) {
  fail(`${config.hosting.public}/ is missing. Run npm run build.`);
}

for (const page of budgets.criticalPages || []) {
  const file = path.join(dist, page);
  if (!fs.existsSync(file)) {
    fail(`${page} is missing from ${config.hosting.public}.`);
    continue;
  }

  const html = fs.readFileSync(file, 'utf8');
  const htmlBytes = bytes(file);
  if (htmlBytes > budgets.maxCriticalPageHtmlBytes) {
    fail(`${page} HTML is ${htmlBytes} bytes, above ${budgets.maxCriticalPageHtmlBytes}.`);
  }

  const assetBytes = localAssetRefs(html).reduce((total, ref) => {
    const asset = path.join(dist, ref);
    if (!fs.existsSync(asset)) {
      fail(`${page} references missing local asset ${ref}.`);
      return total;
    }
    return total + bytes(asset);
  }, 0);

  if (assetBytes > budgets.maxCriticalPageLocalAssetBytes) {
    fail(`${page} local CSS/JS payload is ${assetBytes} bytes, above ${budgets.maxCriticalPageLocalAssetBytes}.`);
  }
}

const indexBytes = endpointSize('api/v1/index.json');
if (indexBytes > budgets.maxAgentApiIndexBytes) {
  fail(`api/v1/index.json is ${indexBytes} bytes, above ${budgets.maxAgentApiIndexBytes}.`);
}

const searchIndexBytes = endpointSize('api/v1/search-index.json');
if (searchIndexBytes > budgets.maxAgentCollectionBytes) {
  fail(`api/v1/search-index.json is ${searchIndexBytes} bytes, above ${budgets.maxAgentCollectionBytes}.`);
}

for (const collection of ['books', 'skills', 'adventures', 'essays', 'quotes', 'products']) {
  const size = endpointSize(`api/v1/${collection}.json`);
  if (size > budgets.maxAgentCollectionBytes) {
    fail(`api/v1/${collection}.json is ${size} bytes, above ${budgets.maxAgentCollectionBytes}.`);
  }
}

if (failures.length > 0) {
  console.error('Page baseline check failed:');
  failures.forEach((failure) => console.error(`  ${failure}`));
  process.exit(1);
}

console.log(`Page baselines OK (${(budgets.criticalPages || []).length} critical pages, images excluded).`);
