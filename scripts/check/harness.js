const fs = require('fs');
const path = require('path');

const root = process.cwd();

function readJson(file, fallback) {
  const absolute = path.isAbsolute(file) ? file : path.join(root, file);
  if (!fs.existsSync(absolute)) {
    if (fallback === undefined) throw new Error(`Missing file: ${file}`);
    return fallback;
  }
  return JSON.parse(fs.readFileSync(absolute, 'utf8'));
}

function readText(file, fallback) {
  const absolute = path.isAbsolute(file) ? file : path.join(root, file);
  if (!fs.existsSync(absolute)) {
    if (fallback === undefined) throw new Error(`Missing file: ${file}`);
    return fallback;
  }
  return fs.readFileSync(absolute, 'utf8');
}

const DEFAULT_SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'test-results', 'playwright-report', '.firebase', '.gstack', '.playwright-cli', '.playwright-mcp']);

function walk(dir, { predicate, skipDirs = DEFAULT_SKIP_DIRS, includeDir = false, files = [] } = {}) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name) || entry.name.startsWith('.')) continue;
      walk(path.join(dir, entry.name), { predicate, skipDirs, includeDir, files });
    } else if (entry.isFile()) {
      const fullPath = path.join(dir, entry.name);
      if (!predicate || predicate(fullPath)) files.push(fullPath);
    }
  }
  if (includeDir) {
    files.dir = dir;
  }
  return files;
}

function walkHtml(dir, options = {}) {
  return walk(dir, {
    predicate: (file) => file.endsWith('.html'),
    ...options
  });
}

function distRoot() {
  const config = readJson('data/site.config.json', {});
  const publicRel = config.hosting?.public || 'dist';
  const distPath = path.join(root, publicRel);
  return fs.existsSync(distPath) ? distPath : root;
}

function distHtmlFiles() {
  const dir = distRoot();
  return walkHtml(dir).map((file) => path.relative(dir, file));
}

function createReporter(label) {
  const errors = [];

  function fail(message) {
    errors.push(message);
  }

  function ok(summary) {
    if (errors.length) {
      for (const error of errors) console.error(error);
      console.error(`${label} FAILED (${errors.length} issue${errors.length === 1 ? '' : 's'}).`);
      process.exit(1);
    }
    console.log(summary);
  }

  return { fail, ok, errors };
}

module.exports = {
  root,
  readJson,
  readText,
  walk,
  walkHtml,
  distRoot,
  distHtmlFiles,
  createReporter
};
