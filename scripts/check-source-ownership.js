const fs = require('fs');
const path = require('path');
const { manifestCoversRoute } = require('./build/page-manifest');

const root = process.cwd();
const sourcePagesDir = path.join(root, '_src', 'pages');
const ownershipPath = path.join(root, 'data', 'source-ownership.json');
const sourcePages = fs.existsSync(sourcePagesDir)
  ? fs.readdirSync(sourcePagesDir).filter((file) => file.endsWith('.html')).sort()
  : [];
const ownership = fs.existsSync(ownershipPath)
  ? JSON.parse(fs.readFileSync(ownershipPath, 'utf8'))
  : { legacyRootPageSources: [], dataRenderedRoutes: [], dataRenderedPatterns: [] };

function walkHtml(dir, prefix = '') {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['admin', 'dist', 'node_modules'].includes(entry.name)) return [];
      if (entry.name.startsWith('.')) return [];
      return walkHtml(fullPath, relative);
    }
    return entry.isFile() && entry.name.endsWith('.html') ? [relative] : [];
  });
}

const duplicated = sourcePages.filter((file) => fs.existsSync(path.join(root, file)));
const rootHtml = walkHtml(root)
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

const unknownRootHtml = rootHtml.filter((file) => !sourcePageSet.has(file) && !isOwnedRootHtml(file));
const missingLegacySources = [...legacyRootSources].filter((file) => !fs.existsSync(path.join(root, file)));
const missingDataRoutes = [...dataRenderedRoutes].filter((file) => !fs.existsSync(path.join(root, file)));
const missingManifestRoutes = [...new Set([
  ...sourcePages,
  ...rootHtml.filter((file) => isOwnedRootHtml(file))
])].filter((file) => !manifestCoversRoute(file));

if (duplicated.length) {
  console.error('HTML source ownership is ambiguous. Keep each page in one source location:');
  for (const file of duplicated) {
    console.error(`- ${file} exists in both / and _src/pages/`);
  }
  process.exit(1);
}

if (unknownRootHtml.length) {
  console.error('Root HTML files are not classified in data/source-ownership.json:');
  for (const file of unknownRootHtml) console.error(`- ${file}`);
  process.exit(1);
}

if (missingLegacySources.length || missingDataRoutes.length) {
  console.error('data/source-ownership.json lists routes that do not exist:');
  for (const file of [...missingLegacySources, ...missingDataRoutes]) console.error(`- ${file}`);
  process.exit(1);
}

if (missingManifestRoutes.length) {
  console.error('Page manifest is missing route entries for:');
  for (const file of missingManifestRoutes) console.error(`- ${file}`);
  process.exit(1);
}

console.log(`Source ownership OK (${sourcePages.length} _src pages, ${legacyRootSources.size} legacy root sources).`);
