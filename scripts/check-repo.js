const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = process.cwd();
const generatedPatterns = [
  /^dist(?:\/|$)/,
  /^css\/style\.css$/,
  /^css\/page-[^/]+\.css$/,
  /^data\/pages\.json$/,
  /^data\/generated-manifest\.json$/,
  /^data\/remote-assets\.generated\.json$/,
  /^images\/generated(?:\/|$)/,
  /^images\/source\/remote(?:\/|$)/,
  /^sitemap\.xml$/,
  /^llms\.txt$/,
  /^\.firebase(?:\/|$)/,
  /^\.gstack(?:\/|$)/,
  /^test-results(?:\/|$)/,
  /^playwright-report(?:\/|$)/,
  /^\.playwright-cli(?:\/|$)/,
  /^\.playwright-mcp(?:\/|$)/,
  /^nav-[^/]+\.png$/,
  /^podcasts-after\.png$/,
  /^shelf-[^/]+\.jpeg$/,
  /^movies-full\.jpeg$/
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
    console.error(`Unable to inspect staged files: ${error.message}`);
    process.exit(1);
  }
}

function generatedFromManifest() {
  const manifestPath = path.join(root, 'data', 'generated-manifest.json');
  if (!fs.existsSync(manifestPath)) return new Set();
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return new Set((manifest.files || []).map((file) => file.replace(/\\/g, '/')));
  } catch {
    return new Set();
  }
}

const manifestFiles = generatedFromManifest();
const blocked = stagedFiles().filter(({ file }) => {
  const normalized = file.replace(/\\/g, '/');
  return manifestFiles.has(normalized) || generatedPatterns.some((pattern) => pattern.test(normalized));
});

if (blocked.length) {
  console.error('Generated files are staged. Run npm run build locally, but do not commit generated output:');
  for (const item of blocked) console.error(`- ${item.file}`);
  process.exit(1);
}

console.log('Repo hygiene OK (no generated files staged for commit).');
