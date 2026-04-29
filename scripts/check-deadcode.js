const fs = require('fs');
const path = require('path');
const { root, readJson, walk, createReporter } = require('./check/harness');

const reporter = createReporter('check-deadcode');
const packageJson = readJson('package.json');

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function listFiles(dir, extension) {
  return walk(path.join(root, dir), { predicate: (file) => file.endsWith(extension) })
    .map((file) => path.relative(root, file).replace(/\\/g, '/'))
    .sort();
}

function allTextFrom(files) {
  return files.map(read).join('\n');
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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const htmlAndBuildFiles = walk(root, {
  predicate: (file) => {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    return rel.endsWith('.html') || rel.endsWith('.md') || rel.startsWith('_src/') || rel.startsWith('scripts/');
  }
}).map((file) => path.relative(root, file).replace(/\\/g, '/'));

const publicReferenceText = allTextFrom(htmlAndBuildFiles);
const adminReferenceFiles = walk(path.join(root, 'admin'), {
  predicate: (file) => file.endsWith('.html') || file.endsWith('.js') || file.endsWith('.md')
}).map((file) => path.relative(root, file).replace(/\\/g, '/'));
const adminReferenceText = allTextFrom(adminReferenceFiles);
const cssBuildText = `${read('scripts/build/css.js')}\n${read('scripts/build/page-manifest.js')}`;

for (const file of listFiles('js', '.js')) {
  if (countLiteral(publicReferenceText, file) === 0) {
    reporter.fail(`${file} is not referenced by any source HTML, docs, or build script.`);
  }
}

for (const file of listFiles('admin/js', '.js')) {
  const adminPath = file.replace(/^admin\//, '');
  if (countLiteral(adminReferenceText, adminPath) === 0) {
    reporter.fail(`${file} is not referenced by admin source.`);
  }
}

for (const file of listFiles('css/src', '.css')) {
  const cssFile = path.basename(file);
  if (countLiteral(cssBuildText, cssFile) === 0) {
    reporter.fail(`${file} is not included in the CSS bundle manifest.`);
  }
}

const dependencyScanFiles = walk(root, {
  predicate: (file) => {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    if (rel.startsWith('dist/') || rel.startsWith('node_modules/') || rel === 'package-lock.json') return false;
    return rel.endsWith('.js') || rel.endsWith('.html') || rel.endsWith('.json') || rel.endsWith('.md');
  }
}).map((file) => path.relative(root, file).replace(/\\/g, '/'));
const dependencyText = allTextFrom(dependencyScanFiles);

for (const name of Object.keys(packageJson.dependencies || {})) {
  const packageNeedle = new RegExp(`(^|[^a-zA-Z0-9_./-])${escapeRegExp(name)}([^a-zA-Z0-9_./-]|$)`);
  const binaryNeedle = new RegExp(`(^|[^a-zA-Z0-9_-])${escapeRegExp(name.split('/').pop())}([^a-zA-Z0-9_-]|$)`);
  if (!packageNeedle.test(dependencyText) && !binaryNeedle.test(dependencyText)) {
    reporter.fail(`dependency ${name} in package.json is not referenced by source, docs, or scripts.`);
  }
}

reporter.ok('Dead-code check OK (referenced JS files and CSS layers).');
