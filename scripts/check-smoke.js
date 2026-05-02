const fs = require('fs');
const path = require('path');

const root = process.cwd();
const dist = path.join(root, 'dist');
const requiredPages = [
  'index.html',
  'books.html',
  'essays.html',
  'adventures.html',
  'search.html',
  'products.html',
  'projects.html',
  'challenges.html',
  'meet.html',
  'adventure-japan-adventure.html'
];
const requiredApi = [
  'api/v1/index.json',
  'api/v1/schema.json',
  'api/v1/search-index.json',
  'api/v1/pages.json',
  'api/v1/content.json',
  'api/v1/interests.json',
  'api/v1/books.json',
  'api/v1/skills.json',
  'api/v1/adventures.json',
  'api/v1/essays.json',
  'api/v1/quotes.json',
  'api/v1/products.json'
];
// After Astro migration legacy hashed bundles + data-action filter hooks no
// longer exist. Smoke just verifies the page rendered the right card class.
const pageSpecificPatterns = {
  'projects.html': [/class="[^"]*project-card/],
  'challenges.html': [/class="[^"]*challenge-card/]
};

let failed = false;

function fail(message) {
  console.error(message);
  failed = true;
}

for (const page of requiredPages) {
  const file = path.join(dist, page);
  if (!fs.existsSync(file)) {
    fail(`${page} is missing from dist.`);
    continue;
  }

  const html = fs.readFileSync(file, 'utf8');
  const patterns = [
    /<main|<header|<section/,
    /<link rel="canonical"/,
    /<meta property="og:title"/,
    /<script type="application\/ld\+json">/
  ];
  if (page !== 'meet.html') patterns.unshift(/<nav class="navbar">/);

  for (const pattern of patterns) {
    if (!pattern.test(html)) fail(`${page} is missing smoke pattern ${pattern}.`);
  }
  for (const pattern of pageSpecificPatterns[page] || []) {
    if (!pattern.test(html)) fail(`${page} is missing page-specific smoke pattern ${pattern}.`);
  }
}

for (const endpoint of requiredApi) {
  const file = path.join(dist, endpoint);
  if (!fs.existsSync(file)) {
    fail(`${endpoint} is missing from dist.`);
    continue;
  }
  try {
    JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`${endpoint} is not valid JSON: ${error.message}`);
  }
}

const apiIndex = JSON.parse(fs.readFileSync(path.join(dist, 'api/v1/index.json'), 'utf8'));
if (!apiIndex.endpoints || !apiIndex.guidance) {
  fail('api/v1/index.json is missing endpoints or guidance.');
}

if (!fs.existsSync(path.join(dist, 'llms.txt'))) fail('llms.txt is missing from dist.');
if (!fs.existsSync(path.join(dist, '.well-known/security.txt'))) fail('.well-known/security.txt is missing from dist.');

if (failed) process.exit(1);
console.log(`Smoke OK (${requiredPages.length} pages, ${requiredApi.length} API endpoints).`);
