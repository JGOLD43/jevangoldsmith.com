const fs = require('fs');
const path = require('path');

const root = process.cwd();
const config = JSON.parse(fs.readFileSync(path.join(root, 'data', 'site.config.json'), 'utf8'));
const publicRoot = path.join(root, config.hosting.public);
const scanRoot = fs.existsSync(publicRoot) ? publicRoot : root;

function walkHtml(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      out.push(...walkHtml(full));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

const htmlFiles = walkHtml(scanRoot).map((p) => path.relative(scanRoot, p));
const allowedSchemes = /^(https?:|mailto:|tel:|#|data:)/i;
const references = /\b(?:href|src|poster)=["']([^"']+)["']/g;
const missing = [];
const placeholders = [];

const placeholderPattern = /YourChannel|YourHandle|YourProfile|newsletter@example\.com|your-form-id|yourusername/i;

const baseTag = /<base\s+href=["']([^"']+)["']/i;

for (const file of htmlFiles) {
  const source = fs.readFileSync(path.join(scanRoot, file), 'utf8');
  if (placeholderPattern.test(source)) placeholders.push(file);

  // Honor <base href="..."> for relative resolution. Topic pages use
  // <base href="../"> so refs like images/favicon.svg resolve to the dist root.
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
      missing.push(`${file} -> ${raw}`);
    }
  }
}

if (placeholders.length > 0) {
  console.error(`Placeholder text remains in ${placeholders.length} file(s):`);
  placeholders.forEach((file) => console.error(`  ${file}`));
}

if (missing.length > 0) {
  console.error(`Missing local references (${missing.length}):`);
  missing.forEach((ref) => console.error(`  ${ref}`));
}

if (placeholders.length > 0 || missing.length > 0) process.exit(1);

console.log(`Local links OK (${htmlFiles.length} HTML files in ${path.relative(root, scanRoot) || '.'}).`);
