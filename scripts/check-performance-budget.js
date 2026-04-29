const fs = require('fs');
const path = require('path');
const { readJson, walk, distRoot, createReporter } = require('./check/harness');

const reporter = createReporter('check-performance-budget');
const config = readJson('data/site.config.json');
const budgets = config.budgets;
const htmlDir = distRoot();
const htmlFiles = fs.readdirSync(htmlDir).filter((file) => file.endsWith('.html')).sort();
const totals = { inlineScripts: 0, inlineHandlers: 0, inlineStyles: 0, imgTags: 0 };
const criticalPages = new Set(budgets.criticalPages || []);
const legacyAssetRefs = ['images/source/', 'images/logo.png', 'images/profile.jpg', 'images/zen-nature.jpg', 'images/logo-animated.mp4'];

function byteSize(file) { return fs.statSync(file).size; }

for (const file of htmlFiles) {
  const fullPath = path.join(htmlDir, file);
  const html = fs.readFileSync(fullPath, 'utf8');
  const size = byteSize(fullPath);
  if (size > budgets.maxHtmlBytes) reporter.fail(`${file} is ${size} bytes, above ${budgets.maxHtmlBytes}.`);

  totals.inlineScripts += (html.match(/<script(?![^>]*\bsrc=)(?![^>]*type=["']application\/ld\+json["'])[^>]*>/gi) || []).length;
  totals.inlineHandlers += (html.match(/\son[a-z]+=/gi) || []).length;
  totals.inlineStyles += (html.match(/<style\b/gi) || []).length;

  for (const legacyRef of legacyAssetRefs) {
    if (html.includes(legacyRef)) reporter.fail(`${file} references legacy heavyweight asset ${legacyRef}.`);
  }

  const imgTags = html.match(/<img\b[^>]*>/gi) || [];
  totals.imgTags += imgTags.length;
  if (criticalPages.has(file)) {
    for (const tag of imgTags) {
      const src = tag.match(/\ssrc=(["'])([^"']+)\1/i)?.[2] || '';
      if (!src || /^(https?:|data:)/i.test(src)) continue;
      if (!/\swidth=(["'])[^"']+\1/i.test(tag) || !/\sheight=(["'])[^"']+\1/i.test(tag)) {
        reporter.fail(`${file} has local image without dimensions: ${src}.`);
      }
    }
  }
}

const cssFiles = walk(htmlDir, { predicate: (f) => f.endsWith('.css') });
for (const file of cssFiles) {
  const size = byteSize(file);
  if (size > budgets.maxCssBytes) reporter.fail(`${path.relative(htmlDir, file)} is ${size} bytes, above ${budgets.maxCssBytes}.`);
}

const jsFiles = walk(htmlDir, { predicate: (f) => f.endsWith('.js') });
for (const file of jsFiles) {
  const rel = path.relative(htmlDir, file);
  if (rel.startsWith(`vendor${path.sep}`) || rel.startsWith(`assets${path.sep}vendor${path.sep}`)) continue;
  const size = byteSize(file);
  if (size > budgets.maxJsBytes) reporter.fail(`${rel} is ${size} bytes, above ${budgets.maxJsBytes}.`);
}

const imageFiles = walk(htmlDir, { predicate: (f) => /\.(png|jpe?g|webp|avif|mp4|webm)$/i.test(f) });
for (const file of imageFiles) {
  const rel = path.relative(htmlDir, file).replace(/\\/g, '/');
  if (rel.startsWith('images/source/')) reporter.fail(`${rel} should not be deployed.`);
  if (/\.jpe?g$/i.test(file)) {
    const signature = fs.readFileSync(file).subarray(0, 8);
    if (signature.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      reporter.fail(`${rel} has a .jpg extension but contains PNG data.`);
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
    reporter.fail(`${file} is missing.`);
    continue;
  }
  const size = byteSize(fullPath);
  if (size > maxBytes) reporter.fail(`${file} is ${size} bytes, above ${maxBytes}.`);
}

if (totals.inlineScripts > budgets.maxInlineScripts) reporter.fail(`${totals.inlineScripts} inline scripts found, above ${budgets.maxInlineScripts}.`);
if (totals.inlineHandlers > budgets.maxInlineHandlers) reporter.fail(`${totals.inlineHandlers} inline event handlers found, above ${budgets.maxInlineHandlers}.`);
if (totals.inlineStyles > budgets.maxInlineStyles) reporter.fail(`${totals.inlineStyles} inline style blocks found, above ${budgets.maxInlineStyles}.`);

reporter.ok(`Performance budgets OK (${htmlFiles.length} pages, ${cssFiles.length} CSS files, ${jsFiles.length} JS files, ${totals.imgTags} images).`);
