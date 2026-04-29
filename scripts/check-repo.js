const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { root, readJson, createReporter } = require('./check/harness');

const reporter = createReporter('check-repo');
const generatedPatterns = [
  /^dist(?:\/|$)/, /^css\/style\.css$/, /^css\/page-[^/]+\.css$/,
  /^data\/pages\.json$/, /^data\/generated-manifest\.json$/, /^data\/remote-assets\.generated\.json$/,
  /^images\/generated(?:\/|$)/, /^images\/source\/remote(?:\/|$)/,
  /^sitemap\.xml$/, /^llms\.txt$/,
  /^\.firebase(?:\/|$)/, /^\.gstack(?:\/|$)/, /^test-results(?:\/|$)/, /^playwright-report(?:\/|$)/,
  /^\.playwright-cli(?:\/|$)/, /^\.playwright-mcp(?:\/|$)/,
  /^nav-[^/]+\.png$/, /^podcasts-after\.png$/, /^shelf-[^/]+\.jpeg$/, /^movies-full\.jpeg$/
];

function stagedFiles() {
  try {
    const output = execFileSync('git', ['diff', '--cached', '--name-status'], { encoding: 'utf8' }).trim();
    if (!output) return [];
    return output.split('\n').map((line) => {
      const [status, ...parts] = line.split(/\s+/);
      return { status, file: parts[parts.length - 1] };
    });
  } catch (error) {
    reporter.fail(`Unable to inspect staged files: ${error.message}`);
    return [];
  }
}

const manifestPath = path.join(root, 'data', 'generated-manifest.json');
const manifestFiles = fs.existsSync(manifestPath)
  ? new Set((readJson(manifestPath, { files: [] }).files || []).map((file) => file.replace(/\\/g, '/')))
  : new Set();

const blocked = stagedFiles().filter(({ file }) => {
  const normalized = file.replace(/\\/g, '/');
  return manifestFiles.has(normalized) || generatedPatterns.some((pattern) => pattern.test(normalized));
});

for (const item of blocked) reporter.fail(`Generated file staged: ${item.file}`);

reporter.ok('Repo hygiene OK (no generated files staged for commit).');
