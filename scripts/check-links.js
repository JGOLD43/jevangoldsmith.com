const fs = require('fs');
const path = require('path');
const { root, distRoot, walkHtml, readText, createReporter } = require('./check/harness');

const reporter = createReporter('check-links');
const scanRoot = distRoot();
const htmlFiles = walkHtml(scanRoot).map((file) => path.relative(scanRoot, file));

const allowedSchemes = /^(https?:|mailto:|tel:|#|data:)/i;
const references = /\b(?:href|src|poster)=["']([^"']+)["']/g;
const placeholderPattern = /YourChannel|YourHandle|YourProfile|newsletter@example\.com|your-form-id|yourusername/i;
const baseTag = /<base\s+href=["']([^"']+)["']/i;

for (const file of htmlFiles) {
  const source = readText(path.join(scanRoot, file));
  if (placeholderPattern.test(source)) reporter.fail(`Placeholder text in ${file}`);

  const baseMatch = source.match(baseTag);
  const baseDir = baseMatch
    ? path.normalize(path.join(path.dirname(file), baseMatch[1]))
    : path.dirname(file);

  let match;
  while ((match = references.exec(source)) !== null) {
    const raw = match[1];
    if (!raw || allowedSchemes.test(raw)) continue;
    const localTarget = raw.split('#')[0].split('?')[0];
    if (!localTarget || localTarget.endsWith('/')) continue;
    const base = localTarget.startsWith('/')
      ? path.join(scanRoot, localTarget)
      : path.join(scanRoot, baseDir, localTarget);
    const resolved = path.normalize(base);
    if (!resolved.startsWith(scanRoot) || !fs.existsSync(resolved)) {
      reporter.fail(`Missing local reference: ${file} -> ${raw}`);
    }
  }
}

reporter.ok(`Local links OK (${htmlFiles.length} HTML files in ${path.relative(root, scanRoot) || '.'}).`);
