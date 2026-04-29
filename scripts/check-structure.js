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

const legacyCss = exists('css/src/legacy.css') ? read('css/src/legacy.css').trim() : '';
const legacyLines = legacyCss ? legacyCss.split('\n').length : 0;
if (legacyLines > 5) reporter.fail(`css/src/legacy.css has ${legacyLines} lines. Keep legacy overrides at or below 5 lines.`);

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

for (const file of adminTextFiles) {
  const text = read(file);
  if (text.includes('Book data is stored in <code>js/books.js</code>')) {
    reporter.fail(`${file} still tells editors that books are sourced from js/books.js.`);
  }
  if (text.includes('Download books.js<') || text.includes('Your books.js file has been generated')) {
    reporter.fail(`${file} still exposes the retired books.js import workflow.`);
  }
}

reporter.ok('Structure OK (legacy CSS, local artifacts, admin handler ratchet, and stale admin source notes).');
