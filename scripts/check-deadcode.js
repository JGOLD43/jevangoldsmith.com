const fs = require('fs');
const path = require('path');

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

function walk(dir, predicate, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relative = path.relative(root, fullPath).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      if (['.git', 'dist', 'node_modules', 'test-results', 'playwright-report'].includes(entry.name)) continue;
      walk(fullPath, predicate, files);
    } else if (entry.isFile() && predicate(relative)) {
      files.push(relative);
    }
  }
  return files;
}

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function allTextFrom(files) {
  return files.map((file) => read(file)).join('\n');
}

function listFiles(dir, extension) {
  return walk(path.join(root, dir), (file) => file.endsWith(extension)).sort();
}

function countLiteral(haystack, needle) {
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count++;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

const htmlAndBuildFiles = walk(root, (file) => (
  file.endsWith('.html') ||
  file.endsWith('.md') ||
  file.startsWith('_src/') ||
  file.startsWith('scripts/')
));

const publicReferenceText = allTextFrom(htmlAndBuildFiles);
const adminReferenceFiles = walk(path.join(root, 'admin'), (file) => file.endsWith('.html') || file.endsWith('.js') || file.endsWith('.md'));
const adminReferenceText = allTextFrom(adminReferenceFiles);
const cssBuildText = `${read('scripts/build/css.js')}\n${read('scripts/build/page-manifest.js')}`;

const issues = [];

for (const file of listFiles('js', '.js')) {
  if (countLiteral(publicReferenceText, file) === 0) {
    issues.push(`${file} is not referenced by any source HTML, docs, or build script.`);
  }
}

for (const file of listFiles('admin/js', '.js')) {
  const adminPath = file.replace(/^admin\//, '');
  if (countLiteral(adminReferenceText, adminPath) === 0) {
    issues.push(`${file} is not referenced by admin source.`);
  }
}

for (const file of listFiles('css/src', '.css')) {
  const cssFile = path.basename(file);
  if (countLiteral(cssBuildText, cssFile) === 0) {
    issues.push(`${file} is not included in the CSS bundle manifest.`);
  }
}

const dependencyScanFiles = walk(root, (file) => (
  (file.endsWith('.js') || file.endsWith('.html') || file.endsWith('.json') || file.endsWith('.md')) &&
  !file.startsWith('dist/') &&
  !file.startsWith('node_modules/') &&
  file !== 'package-lock.json'
));
const dependencyText = allTextFrom(dependencyScanFiles);
for (const name of Object.keys(packageJson.dependencies || {})) {
  const packageNeedle = new RegExp(`(^|[^a-zA-Z0-9_./-])${escapeRegExp(name)}([^a-zA-Z0-9_./-]|$)`);
  const binaryNeedle = new RegExp(`(^|[^a-zA-Z0-9_-])${escapeRegExp(name.split('/').pop())}([^a-zA-Z0-9_-]|$)`);
  if (!packageNeedle.test(dependencyText) && !binaryNeedle.test(dependencyText)) {
    issues.push(`dependency ${name} in package.json is not referenced by source, docs, or scripts.`);
  }
}

if (issues.length) {
  console.error('Possible dead code found:');
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('Dead-code check OK (referenced JS files and CSS layers).');

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
