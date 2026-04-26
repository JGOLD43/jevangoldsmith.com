const fs = require('fs');
const path = require('path');

const root = process.cwd();
const config = JSON.parse(fs.readFileSync(path.join(root, 'data', 'site.config.json'), 'utf8'));
const budgets = config.budgets;
const publicDir = config.hosting.public;
const htmlDir = fs.existsSync(publicDir) ? publicDir : '.';
const htmlFiles = fs.readdirSync(htmlDir).filter((file) => file.endsWith('.html')).sort();
const failures = [];
const totals = {
  inlineScripts: 0,
  inlineHandlers: 0,
  inlineStyles: 0,
  imgTags: 0
};
const criticalPages = new Set(budgets.criticalPages || []);
const legacyAssetRefs = [
  'images/source/',
  'images/logo.png',
  'images/profile.jpg',
  'images/zen-nature.jpg',
  'images/logo-animated.mp4'
];

function byteSize(file) {
  return fs.statSync(file).size;
}

function walk(dir, predicate, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, predicate, files);
      continue;
    }
    if (entry.isFile() && predicate(fullPath)) files.push(fullPath);
  }
  return files;
}

for (const file of htmlFiles) {
  const fullPath = path.join(htmlDir, file);
  const html = fs.readFileSync(fullPath, 'utf8');
  const size = byteSize(fullPath);
  if (size > budgets.maxHtmlBytes) failures.push(`${file} is ${size} bytes, above ${budgets.maxHtmlBytes}.`);

  totals.inlineScripts += (html.match(/<script(?![^>]*\bsrc=)(?![^>]*type=["']application\/ld\+json["'])[^>]*>/gi) || []).length;
  totals.inlineHandlers += (html.match(/\son[a-z]+=/gi) || []).length;
  totals.inlineStyles += (html.match(/<style\b/gi) || []).length;

  for (const legacyRef of legacyAssetRefs) {
    if (html.includes(legacyRef)) failures.push(`${file} references legacy heavyweight asset ${legacyRef}.`);
  }

  const imgTags = html.match(/<img\b[^>]*>/gi) || [];
  totals.imgTags += imgTags.length;
  if (criticalPages.has(file)) {
    for (const tag of imgTags) {
      const src = tag.match(/\ssrc=(["'])([^"']+)\1/i)?.[2] || '';
      if (!src || /^(https?:|data:)/i.test(src)) continue;
      if (!/\swidth=(["'])[^"']+\1/i.test(tag) || !/\sheight=(["'])[^"']+\1/i.test(tag)) {
        failures.push(`${file} has local image without dimensions: ${src}.`);
      }
    }
  }
}

const cssFiles = walk(htmlDir, (file) => file.endsWith('.css'));
for (const file of cssFiles) {
  const size = byteSize(file);
  if (size > budgets.maxCssBytes) failures.push(`${path.relative(htmlDir, file)} is ${size} bytes, above ${budgets.maxCssBytes}.`);
}

const jsFiles = walk(htmlDir, (file) => file.endsWith('.js'));
for (const file of jsFiles) {
  const rel = path.relative(htmlDir, file);
  if (rel.startsWith(`vendor${path.sep}`) || rel.startsWith(`assets${path.sep}vendor${path.sep}`)) continue;
  const size = byteSize(file);
  if (size > budgets.maxJsBytes) failures.push(`${rel} is ${size} bytes, above ${budgets.maxJsBytes}.`);
}

const imageFiles = walk(htmlDir, (file) => /\.(png|jpe?g|webp|avif|mp4|webm)$/i.test(file));
for (const file of imageFiles) {
  const rel = path.relative(htmlDir, file).replace(/\\/g, '/');
  if (rel.startsWith('images/source/')) failures.push(`${rel} should not be deployed.`);
  if (/\.jpe?g$/i.test(file)) {
    const signature = fs.readFileSync(file, { encoding: null, flag: 'r' }).subarray(0, 8);
    if (signature.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      failures.push(`${rel} has a .jpg extension but contains PNG data.`);
    }
  }
}

const logoBudgets = {
  'images/generated/logo/logo-nav-88.avif': budgets.maxLogoNav1xBytes || 12000,
  'images/generated/logo/logo-nav-176.avif': budgets.maxLogoNav2xBytes || 30000,
  'images/generated/logo/logo-nav-264.avif': budgets.maxLogoNav3xBytes || 60000,
  'images/generated/logo/logo-nav-352.avif': budgets.maxLogoNav4xBytes || 95000,
  'images/generated/video/logo-animated-176.mp4': budgets.maxLogoVideo1xBytes || 180000,
  'images/generated/video/logo-animated-352.mp4': budgets.maxLogoVideo2xBytes || 500000,
  'images/generated/video/logo-animated-528.mp4': budgets.maxLogoVideo3xBytes || 1500000
};

for (const [file, maxBytes] of Object.entries(logoBudgets)) {
  const fullPath = path.join(htmlDir, file);
  if (!fs.existsSync(fullPath)) {
    failures.push(`${file} is missing.`);
    continue;
  }
  const size = byteSize(fullPath);
  if (size > maxBytes) failures.push(`${file} is ${size} bytes, above ${maxBytes}.`);
}

if (totals.inlineScripts > budgets.maxInlineScripts) {
  failures.push(`${totals.inlineScripts} inline scripts found, above ${budgets.maxInlineScripts}.`);
}

if (totals.inlineHandlers > budgets.maxInlineHandlers) {
  failures.push(`${totals.inlineHandlers} inline event handlers found, above ${budgets.maxInlineHandlers}.`);
}

if (totals.inlineStyles > budgets.maxInlineStyles) {
  failures.push(`${totals.inlineStyles} inline style blocks found, above ${budgets.maxInlineStyles}.`);
}

if (failures.length > 0) {
  console.error('Performance budget check failed:');
  failures.forEach((failure) => console.error(`  ${failure}`));
  process.exit(1);
}

console.log(`Performance budgets OK (${htmlFiles.length} pages, ${cssFiles.length} CSS files, ${jsFiles.length} JS files, ${totals.imgTags} images).`);
