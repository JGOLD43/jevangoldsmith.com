const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = process.cwd();
const issues = [];
const config = JSON.parse(fs.readFileSync(path.join(root, 'data', 'site.config.json'), 'utf8'));

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function trackedFiles() {
  const output = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).trim();
  return output ? output.split('\n') : [];
}

const legacyCss = exists('css/src/legacy.css') ? read('css/src/legacy.css').trim() : '';
const legacyLines = legacyCss ? legacyCss.split('\n').length : 0;
if (legacyLines > 5) {
  issues.push(`css/src/legacy.css has ${legacyLines} lines. Keep legacy overrides at or below 5 lines.`);
}

const trackedLocalArtifacts = trackedFiles().filter((file) => (
  /^nav-[^/]+\.png$/.test(file) ||
  file === 'podcasts-after.png' ||
  /^shelf-[^/]+\.jpeg$/.test(file) ||
  file === 'movies-full.jpeg'
));
for (const file of trackedLocalArtifacts) {
  issues.push(`${file} is a local screenshot/verification artifact and should not be tracked.`);
}

const adminTextFiles = trackedFiles().filter((file) => (
  file.startsWith('admin/') &&
  exists(file) &&
  (file.endsWith('.html') || file.endsWith('.js') || file.endsWith('.md'))
));
let adminInlineHandlers = 0;
for (const file of adminTextFiles) {
  const text = read(file);
  adminInlineHandlers += (text.match(/\son[a-z]+=/g) || []).length;
}
const maxAdminInlineHandlers = config.budgets?.maxAdminInlineHandlers ?? 0;
if (adminInlineHandlers > maxAdminInlineHandlers) {
  issues.push(`admin source has ${adminInlineHandlers} inline event handler attributes. Keep it at or below ${maxAdminInlineHandlers}.`);
}

for (const file of adminTextFiles) {
  const text = read(file);
  if (text.includes('Book data is stored in <code>js/books.js</code>')) {
    issues.push(`${file} still tells editors that books are sourced from js/books.js.`);
  }
  if (text.includes('Download books.js<') || text.includes('Your books.js file has been generated')) {
    issues.push(`${file} still exposes the retired books.js import workflow.`);
  }
}

if (issues.length) {
  console.error('Structure check failed:');
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('Structure OK (legacy CSS, local artifacts, admin handler ratchet, and stale admin source notes).');
