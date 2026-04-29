const fs = require('fs');
const path = require('path');
const { manifestCoversRoute } = require('./build/page-manifest');
const { root, readJson, walkHtml, createReporter } = require('./check/harness');

const reporter = createReporter('check-source-ownership');
const sourcePagesDir = path.join(root, '_src', 'pages');
const sourcePages = fs.existsSync(sourcePagesDir)
  ? fs.readdirSync(sourcePagesDir).filter((file) => file.endsWith('.html')).sort()
  : [];
const ownership = readJson('data/source-ownership.json', { legacyRootPageSources: [], dataRenderedRoutes: [], dataRenderedPatterns: [] });

const rootHtml = walkHtml(root, { skipDirs: new Set(['.git', 'node_modules', 'dist', 'admin', 'test-results', 'playwright-report', '.firebase', '.gstack', '.playwright-cli', '.playwright-mcp']) })
  .map((file) => path.relative(root, file))
  .filter((file) => !file.startsWith('_src/'))
  .sort();
const sourcePageSet = new Set(sourcePages);
const legacyRootSources = new Set(ownership.legacyRootPageSources || []);
const dataRenderedRoutes = new Set(ownership.dataRenderedRoutes || []);
const dataRenderedPatterns = (ownership.dataRenderedPatterns || []).map((pattern) => new RegExp(pattern));
const generatedStaticRoutes = new Set(['sitemap.html']);

function isOwnedRootHtml(file) {
  if (legacyRootSources.has(file)) return true;
  if (dataRenderedRoutes.has(file)) return true;
  if (generatedStaticRoutes.has(file)) return true;
  return dataRenderedPatterns.some((pattern) => pattern.test(file));
}

for (const file of sourcePages.filter((file) => fs.existsSync(path.join(root, file)))) {
  reporter.fail(`HTML source ambiguous: ${file} exists in both / and _src/pages/`);
}

for (const file of rootHtml.filter((file) => !sourcePageSet.has(file) && !isOwnedRootHtml(file))) {
  reporter.fail(`Root HTML file not classified in data/source-ownership.json: ${file}`);
}

for (const file of [...legacyRootSources].filter((file) => !fs.existsSync(path.join(root, file)))) {
  reporter.fail(`data/source-ownership.json legacy source missing: ${file}`);
}
for (const file of [...dataRenderedRoutes].filter((file) => !fs.existsSync(path.join(root, file)))) {
  reporter.fail(`data/source-ownership.json data-rendered route missing: ${file}`);
}

const allCoveredRoutes = new Set([...sourcePages, ...rootHtml.filter((file) => isOwnedRootHtml(file))]);
for (const file of [...allCoveredRoutes].filter((file) => !manifestCoversRoute(file))) {
  reporter.fail(`Page manifest is missing route entry for: ${file}`);
}

reporter.ok(`Source ownership OK (${sourcePages.length} _src pages, ${legacyRootSources.size} legacy root sources).`);
