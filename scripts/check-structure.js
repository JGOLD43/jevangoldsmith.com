const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { root, readJson, createReporter } = require('./check/harness');

const reporter = createReporter('check-structure');
const config = readJson('data/site.config.json');

function exists(file) { return fs.existsSync(path.join(root, file)); }
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function trackedFiles() {
  const output = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).trim();
  return output ? output.split('\n') : [];
}

const tracked = trackedFiles();
for (const file of tracked.filter((file) => (
  /^nav-[^/]+\.png$/.test(file) || file === 'podcasts-after.png' ||
  /^shelf-[^/]+\.jpeg$/.test(file) || file === 'movies-full.jpeg'
))) {
  reporter.fail(`${file} is a local screenshot/verification artifact and should not be tracked.`);
}

const adminTextFiles = tracked.filter((file) => (
  file.startsWith('admin/') && exists(file) &&
  (file.endsWith('.html') || file.endsWith('.js') || file.endsWith('.md'))
));
let adminInlineHandlers = 0;
for (const file of adminTextFiles) adminInlineHandlers += (read(file).match(/\son[a-z]+=/g) || []).length;
const maxAdminInlineHandlers = config.budgets?.maxAdminInlineHandlers ?? 0;
if (adminInlineHandlers > maxAdminInlineHandlers) {
  reporter.fail(`admin source has ${adminInlineHandlers} inline event handler attributes. Keep it at or below ${maxAdminInlineHandlers}.`);
}

for (const file of tracked.filter((file) => file.startsWith('js/') && file.endsWith('.js') && exists(file))) {
  const text = read(file);
  if (/fetch\((['"])(data\/|api\/)[^'"]+\1[\s\S]{0,160}?cache:\s*['"]no-store['"]/i.test(text)) {
    reporter.fail(`${file} disables caching for local static JSON. Use versioned URLs instead of cache: 'no-store'.`);
  }
}

if (exists('js/collection-controller.js')) {
  reporter.fail('js/collection-controller.js is retired. Use js/collection-runtime.js for collection pages.');
}

if (exists('scripts/build/collection-config.js')) {
  const collectionConfig = read('scripts/build/collection-config.js');
  const collectionConfigLines = collectionConfig.trim().split('\n').length;
  if (collectionConfigLines > 260) {
    reporter.fail(`scripts/build/collection-config.js has ${collectionConfigLines} lines. Keep page config lean and move section/task data to focused manifests.`);
  }
  if (/icon:\s*['"`]<svg/.test(collectionConfig)) {
    reporter.fail('scripts/build/collection-config.js contains inline SVG. Use iconKey plus the shared build icon registry.');
  }
  if (/bodyHtml:\s*['"`]/.test(collectionConfig)) {
    reporter.fail('scripts/build/collection-config.js contains inline body HTML. Use bodyPath partials for collection page bodies.');
  }
}

for (const file of adminTextFiles) {
  const text = read(file);
  if (text.includes('Book data is stored in <code>js/books.js</code>')) {
    reporter.fail(`${file} still tells editors that books are sourced from js/books.js.`);
  }
  if (text.includes('Download books.js<') || text.includes('Your books.js file has been generated')) {
    reporter.fail(`${file} still exposes the retired books.js import workflow.`);
  }
}

reporter.ok('Structure OK (legacy CSS, local artifacts, admin handler ratchet, collection manifests, and stale admin source notes).');
