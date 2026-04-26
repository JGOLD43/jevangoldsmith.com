const fs = require('fs');
const path = require('path');

const root = process.cwd();
const config = JSON.parse(fs.readFileSync(path.join(root, 'data', 'site.config.json'), 'utf8'));
const dist = path.join(root, config.hosting.public);
const apiRoot = path.join(dist, 'api', 'v1');
const failures = [];

function fail(message) {
  failures.push(message);
}

function readJson(relativePath) {
  const file = path.join(dist, relativePath);
  if (!fs.existsSync(file)) {
    fail(`${relativePath} is missing.`);
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`${relativePath} is not valid JSON: ${error.message}`);
    return null;
  }
}

function endpointToRelativePath(url) {
  try {
    return new URL(url).pathname.replace(/^\//, '');
  } catch {
    return String(url || '').replace(/^\//, '');
  }
}

if (!fs.existsSync(apiRoot)) {
  fail('dist/api/v1 is missing. Run npm run build.');
}

const index = readJson('api/v1/index.json');
const schema = readJson('api/v1/schema.json');

if (index) {
  if (index.version !== '1.0') fail('api/v1/index.json must declare version 1.0.');
  if (!index.site?.baseUrl || !index.site?.domain) fail('api/v1/index.json is missing site baseUrl or domain.');
  if (!index.guidance?.preferredIngestion) fail('api/v1/index.json is missing agent ingestion guidance.');
  if (!index.endpoints || typeof index.endpoints !== 'object') {
    fail('api/v1/index.json is missing endpoints.');
  } else {
    for (const [name, url] of Object.entries(index.endpoints)) {
      const relativePath = endpointToRelativePath(url);
      const payload = readJson(relativePath);
      if (!relativePath.startsWith('api/v1/')) fail(`${name} endpoint must live under /api/v1/.`);
      if (!relativePath.endsWith('.json')) fail(`${name} endpoint must be a JSON file.`);
      if (payload && ['books', 'skills', 'adventures', 'essays', 'quotes', 'projects', 'products', 'resources', 'ctas'].includes(name)) {
        if (payload.version !== '1.0') fail(`${relativePath} must declare version 1.0.`);
        if (payload.collection !== name) fail(`${relativePath} must declare collection "${name}".`);
        if (!Array.isArray(payload.items)) fail(`${relativePath} must expose an items array.`);
        if (!payload.canonicalUrl) fail(`${relativePath} must expose canonicalUrl.`);
      }
    }
  }
}

if (schema) {
  if (schema.version !== '1.0') fail('api/v1/schema.json must declare version 1.0.');
  if (!schema.costModel || !schema.costModel.includes('Static Firebase Hosting')) {
    fail('api/v1/schema.json must document the static no-server cost model.');
  }
  if (!schema.entrypoint?.endsWith('/api/v1/index.json')) fail('api/v1/schema.json has an invalid entrypoint.');
  if (!schema.searchIndexFields?.url || !schema.searchIndexFields?.summary) {
    fail('api/v1/schema.json is missing search index field documentation.');
  }
  for (const collection of ['books', 'skills', 'adventures', 'essays', 'quotes', 'projects', 'products', 'resources', 'ctas']) {
    if (!schema.collections?.[collection]) fail(`api/v1/schema.json is missing ${collection} collection fields.`);
  }
}

const searchIndex = readJson('api/v1/search-index.json');
if (searchIndex) {
  if (searchIndex.version !== '1.0') fail('api/v1/search-index.json must declare version 1.0.');
  if (!Array.isArray(searchIndex.records) || searchIndex.records.length === 0) {
    fail('api/v1/search-index.json must expose a non-empty records array.');
  } else {
    for (const record of searchIndex.records) {
      if (!record.type || !record.title || !record.url) {
        fail(`Search record ${record.id || '(unknown)'} is missing type, title, or url.`);
      }
    }
  }
}

const pages = readJson('api/v1/pages.json') || [];
if (!Array.isArray(pages) || pages.length === 0) {
  fail('api/v1/pages.json must be a non-empty array.');
} else {
  for (const page of pages) {
    if (!page.title || !page.url || !page.section || !page.source) {
      fail(`Page record ${page.path || '(unknown)'} is missing title, url, section, or source.`);
    }
  }
}

const robots = fs.existsSync(path.join(dist, 'robots.txt'))
  ? fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8')
  : '';
const llms = fs.existsSync(path.join(dist, 'llms.txt'))
  ? fs.readFileSync(path.join(dist, 'llms.txt'), 'utf8')
  : '';

if (!robots.includes('/api/v1/index.json')) fail('robots.txt must advertise the agent API index.');
if (!llms.includes('/api/v1/index.json')) fail('llms.txt must advertise the agent API index.');

if (failures.length > 0) {
  console.error('Agent API contract check failed:');
  failures.forEach((failure) => console.error(`  ${failure}`));
  process.exit(1);
}

console.log(`Agent API contract OK (${pages.length} page records).`);
