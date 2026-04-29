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

function validateCollection(reporter, name, items, options = {}) {
  const seen = new Set();
  const html = options.htmlFile && fs.existsSync(options.htmlFile)
    ? fs.readFileSync(options.htmlFile, 'utf8')
    : '';
  const distApiRoot = options.distApiRoot;
  const statuses = options.allowedStatuses;
  const existingTargets = options.existingTargets;

  for (const [index, item] of items.entries()) {
    for (const field of options.required || []) {
      const value = item[field];
      if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
        reporter.fail(`${name} item ${item.slug || item.id || index} is missing ${field}`);
      }
    }

    if (item.slug) {
      if (seen.has(item.slug)) reporter.fail(`${name} has duplicate slug ${item.slug}`);
      seen.add(item.slug);
      if (html && !html.includes(`id="${item.slug}"`)) {
        reporter.fail(`${options.htmlFile} is missing ${name} anchor ${item.slug}`);
      }
      if (options.itemApiDir && distApiRoot && fs.existsSync(distApiRoot) && !fs.existsSync(path.join(distApiRoot, options.itemApiDir, `${item.slug}.json`))) {
        reporter.fail(`${distApiRoot}/${options.itemApiDir}/${item.slug}.json is missing`);
      }
    }

    if (statuses && item.status && !statuses.has(item.status)) {
      reporter.fail(`${name} item ${item.slug || index} has invalid status ${item.status}`);
    }

    if (existingTargets) {
      for (const target of item.relatedContent || []) {
        const cleanTarget = String(target).split('#')[0];
        if (cleanTarget && !existingTargets.has(cleanTarget)) {
          reporter.fail(`${name} item ${item.slug || index} references missing relatedContent target ${target}`);
        }
      }
    }
  }
}

module.exports = {
  root,
  readJson,
  readText,
  walk,
  walkHtml,
  distRoot,
  distHtmlFiles,
  createReporter,
  validateCollection
};
