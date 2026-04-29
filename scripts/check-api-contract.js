const fs = require('fs');
const path = require('path');
const { readJson, readText, distRoot, createReporter } = require('./check/harness');

const reporter = createReporter('check-api-contract');
const dist = distRoot();
const apiRoot = path.join(dist, 'api', 'v1');

function readDistJson(relativePath) {
  const file = path.join(dist, relativePath);
  if (!fs.existsSync(file)) {
    reporter.fail(`${relativePath} is missing.`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    reporter.fail(`${relativePath} is not valid JSON: ${error.message}`);
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

if (!fs.existsSync(apiRoot)) reporter.fail('dist/api/v1 is missing. Run npm run build.');

const index = readDistJson('api/v1/index.json');
const schema = readDistJson('api/v1/schema.json');

if (index) {
  if (index.version !== '1.0') reporter.fail('api/v1/index.json must declare version 1.0.');
  if (!index.site?.baseUrl || !index.site?.domain) reporter.fail('api/v1/index.json is missing site baseUrl or domain.');
  if (!index.guidance?.preferredIngestion) reporter.fail('api/v1/index.json is missing agent ingestion guidance.');
  if (!index.endpoints || typeof index.endpoints !== 'object') {
    reporter.fail('api/v1/index.json is missing endpoints.');
  } else {
    for (const [name, url] of Object.entries(index.endpoints)) {
      const relativePath = endpointToRelativePath(url);
      const payload = readDistJson(relativePath);
      if (!relativePath.startsWith('api/v1/')) reporter.fail(`${name} endpoint must live under /api/v1/.`);
      if (!relativePath.endsWith('.json')) reporter.fail(`${name} endpoint must be a JSON file.`);
      if (payload && ['books', 'skills', 'adventures', 'essays', 'quotes', 'projects', 'products', 'resources', 'ctas'].includes(name)) {
        if (payload.version !== '1.0') reporter.fail(`${relativePath} must declare version 1.0.`);
        if (payload.collection !== name) reporter.fail(`${relativePath} must declare collection "${name}".`);
        if (!Array.isArray(payload.items)) reporter.fail(`${relativePath} must expose an items array.`);
        if (!payload.canonicalUrl) reporter.fail(`${relativePath} must expose canonicalUrl.`);
      }
    }
  }
}

if (schema) {
  if (schema.version !== '1.0') reporter.fail('api/v1/schema.json must declare version 1.0.');
  if (!schema.costModel || !schema.costModel.includes('Static Firebase Hosting')) {
    reporter.fail('api/v1/schema.json must document the static no-server cost model.');
  }
  if (!schema.entrypoint?.endsWith('/api/v1/index.json')) reporter.fail('api/v1/schema.json has an invalid entrypoint.');
  if (!schema.searchIndexFields?.url || !schema.searchIndexFields?.summary) {
    reporter.fail('api/v1/schema.json is missing search index field documentation.');
  }
  for (const collection of ['books', 'skills', 'adventures', 'essays', 'quotes', 'projects', 'products', 'resources', 'ctas']) {
    if (!schema.collections?.[collection]) reporter.fail(`api/v1/schema.json is missing ${collection} collection fields.`);
  }
}

const searchIndex = readDistJson('api/v1/search-index.json');
if (searchIndex) {
  if (searchIndex.version !== '1.0') reporter.fail('api/v1/search-index.json must declare version 1.0.');
  if (!Array.isArray(searchIndex.records) || searchIndex.records.length === 0) {
    reporter.fail('api/v1/search-index.json must expose a non-empty records array.');
  } else {
    for (const record of searchIndex.records) {
      if (!record.type || !record.title || !record.url) {
        reporter.fail(`Search record ${record.id || '(unknown)'} is missing type, title, or url.`);
      }
    }
  }
}

const pages = readDistJson('api/v1/pages.json') || [];
if (!Array.isArray(pages) || pages.length === 0) {
  reporter.fail('api/v1/pages.json must be a non-empty array.');
} else {
  for (const page of pages) {
    if (!page.title || !page.url || !page.section || !page.source) {
      reporter.fail(`Page record ${page.path || '(unknown)'} is missing title, url, section, or source.`);
    }
  }
}

const robots = readText(path.join(dist, 'robots.txt'), '');
const llms = readText(path.join(dist, 'llms.txt'), '');
if (!robots.includes('/api/v1/index.json')) reporter.fail('robots.txt must advertise the agent API index.');
if (!llms.includes('/api/v1/index.json')) reporter.fail('llms.txt must advertise the agent API index.');

reporter.ok(`Agent API contract OK (${pages.length} page records).`);
