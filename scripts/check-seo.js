const fs = require('fs');
const path = require('path');

const root = process.cwd();
const site = JSON.parse(fs.readFileSync(path.join(root, 'data', 'site.json'), 'utf8'));
const pages = JSON.parse(fs.readFileSync(path.join(root, 'data', 'pages.json'), 'utf8'));
const seo = JSON.parse(fs.readFileSync(path.join(root, 'data', 'seo.json'), 'utf8'));
const topics = JSON.parse(fs.readFileSync(path.join(root, 'data', 'topics.json'), 'utf8'));
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
const llms = fs.existsSync(path.join(root, 'llms.txt')) ? fs.readFileSync(path.join(root, 'llms.txt'), 'utf8') : '';
const apiRoot = path.join(root, 'dist', 'api', 'v1');
const failures = [];

const genericDescription = /^.+ on Jevan Goldsmith\.$/;
const livingArchiveDescription = /^A living archive of Field Notes, books, tools, resources, projects, and practical ideas from Jevan Goldsmith\.$/;
const weakDescriptions = [genericDescription, livingArchiveDescription];
const priorityPages = new Set([
  'index.html',
  'field-notes.html',
  'start-here.html',
  'books.html',
  'reading-philosophy.html',
  'weekly-review-template.html',
  'products.html',
  'free-resources.html',
  'essays.html',
  'projects.html'
]);
const collectionPages = new Set(['books.html', 'essays.html', 'free-resources.html', 'products.html', 'projects.html', 'quotes.html']);

function fail(message) {
  failures.push(message);
}

function readPage(file) {
  const distPage = path.join(root, 'dist', file);
  if (fs.existsSync(distPage)) return fs.readFileSync(distPage, 'utf8');
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function metaContent(html, name) {
  const match = html.match(new RegExp(`<meta\\s+name=(["'])${name}\\1\\s+content=(["'])(.*?)\\2`, 'i'));
  return match?.[3] || '';
}

function canonicalHref(html) {
  return html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1] || '';
}

function jsonLdBlocks(html) {
  return Array.from(html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)).map((match) => match[1]);
}

function graphTypes(jsonLd) {
  const data = JSON.parse(jsonLd);
  const graph = Array.isArray(data['@graph']) ? data['@graph'] : [data];
  return graph.flatMap((node) => Array.isArray(node['@type']) ? node['@type'] : [node['@type']]).filter(Boolean);
}

function graphNodes(jsonLd) {
  const data = JSON.parse(jsonLd);
  return Array.isArray(data['@graph']) ? data['@graph'] : [data];
}

function textContent(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordCount(html) {
  return textContent(html).split(/\s+/).filter(Boolean).length;
}

function allImageTags(html) {
  return Array.from(html.matchAll(/<img\b[^>]*>/gi)).map((match) => match[0]);
}

function isMeaningfulAlt(tag) {
  const src = tag.match(/\ssrc=["']([^"']*)["']/i)?.[1] || '';
  if (!src.trim()) return true;
  const alt = tag.match(/\salt=["']([^"']*)["']/i)?.[1];
  if (alt === undefined) return false;
  if (!alt.trim()) return /\saria-hidden=["']true["']/i.test(tag) || /\srole=["']presentation["']/i.test(tag);
  return alt.trim().length >= 2 && !/^(image|photo|picture|logo)$/i.test(alt.trim());
}

function expectedUrl(page) {
  return page.url === '/' ? `https://${site.domain}/` : `https://${site.domain}${page.url}`;
}

function isWeakDescription(description) {
  return weakDescriptions.some((pattern) => pattern.test(description));
}

function readJsonIfPresent(file) {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`${path.relative(root, file)} is not valid JSON: ${error.message}`);
    return null;
  }
}

if (/^Sitemap:\s*https:\/\/jevangoldsmith\.com\/api\/v1\/index\.json/im.test(robots)) {
  fail('robots.txt must not list api/v1/index.json as a Sitemap directive.');
}
if (!/^Content-API:\s*https:\/\/jevangoldsmith\.com\/api\/v1\/index\.json/im.test(robots)) {
  fail('robots.txt should expose api/v1/index.json as Content-API.');
}

const topicIds = new Set((topics.topics || []).map((topic) => topic.id));
for (const page of pages) {
  const html = readPage(page.path);
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() || '';
  const description = metaContent(html, 'description');
  const robotsMeta = metaContent(html, 'robots');
  const canonical = canonicalHref(html);
  const indexable = page.index !== false;
  const loc = `<loc>${expectedUrl(page)}</loc>`;

  if (!title) fail(`${page.path} is missing <title>.`);
  if (!description) fail(`${page.path} is missing meta description.`);
  if (indexable && (page.title || '').length < 20) fail(`${page.path} generated title is too short for a useful search result.`);
  if (indexable && (page.title || '').length > 70) fail(`${page.path} generated title is too long: ${page.title.length} chars.`);
  if (indexable && description.length < 80) fail(`${page.path} meta description is too short: ${description.length} chars.`);
  if (indexable && description.length > 170) fail(`${page.path} meta description is too long: ${description.length} chars.`);
  if (isWeakDescription(description)) fail(`${page.path} has weak meta description: "${description}"`);
  if (indexable && isWeakDescription(page.description || '')) fail(`${page.path} has weak generated page description: "${page.description}"`);
  if (!canonical) fail(`${page.path} is missing canonical link.`);
  if (canonical && canonical !== expectedUrl(page)) fail(`${page.path} canonical is ${canonical}, expected ${expectedUrl(page)}.`);

  if (indexable && /noindex/i.test(robotsMeta)) fail(`${page.path} is indexable in data/pages.json but has noindex robots meta.`);
  if (!indexable && !/noindex/i.test(robotsMeta)) fail(`${page.path} is noindex in data/pages.json but lacks noindex robots meta.`);
  if (indexable && !sitemap.includes(loc)) fail(`${page.path} is indexable but missing from sitemap.xml.`);
  if (!indexable && sitemap.includes(loc)) fail(`${page.path} is noindex but appears in sitemap.xml.`);
  if (/sample|draft/i.test(page.path) && sitemap.includes(loc)) fail(`${page.path} looks like sample/draft content but appears in sitemap.xml.`);

  const h1Count = (html.match(/<h1\b/gi) || []).length;
  if (indexable && h1Count !== 1) fail(`${page.path} should have exactly one h1, found ${h1Count}.`);
  const h2Count = (html.match(/<h2\b/gi) || []).length;
  if (indexable && page.contentDepth !== 'utility' && h2Count < 1) fail(`${page.path} should have at least one h2 for section structure.`);
  if (indexable && page.contentDepth === 'pillar' && wordCount(html) < 300) fail(`${page.path} is a pillar page with fewer than 300 visible words.`);

  if (indexable) {
    for (const field of ['primaryKeyword', 'audience', 'searchIntent', 'contentDepth', 'lastReviewed']) {
      if (!page[field]) fail(`${page.path} is missing SEO strategy field: ${field}.`);
    }
    if (!Array.isArray(page.secondaryKeywords) || page.secondaryKeywords.length < 1) fail(`${page.path} needs secondaryKeywords for search intent coverage.`);
    if (page.contentDepth !== 'utility' && (!Array.isArray(page.relatedPages) || page.relatedPages.length < 2)) {
      fail(`${page.path} needs at least two relatedPages for internal linking.`);
    }
    if (page.contentDepth !== 'utility' && !html.includes('data-seo-related')) {
      fail(`${page.path} is missing the generated related internal links section.`);
    }
  }

  const blocks = jsonLdBlocks(html);
  if (!blocks.length) fail(`${page.path} is missing JSON-LD.`);
  for (const block of blocks) {
    try {
      const types = graphTypes(block);
      const nodes = graphNodes(block);
      const pageNode = nodes.find((node) => {
        const nodeTypes = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
        return nodeTypes.some((type) => ['WebPage', 'AboutPage', 'ContactPage', 'CollectionPage', 'Article', 'BlogPosting'].includes(type));
      });
      if (!types.includes('WebSite')) fail(`${page.path} JSON-LD is missing WebSite.`);
      if (!types.includes('Person')) fail(`${page.path} JSON-LD is missing Person.`);
      if (!types.includes('BreadcrumbList') && page.path !== 'index.html') fail(`${page.path} JSON-LD is missing BreadcrumbList.`);
      if (collectionPages.has(page.path) && !types.includes('CollectionPage')) fail(`${page.path} should use CollectionPage schema.`);
      if (page.path.startsWith('topics/') && !types.includes('CollectionPage')) fail(`${page.path} topic hub should use CollectionPage schema.`);
      if (indexable && pageNode && !pageNode.dateModified) fail(`${page.path} JSON-LD page node is missing dateModified.`);
      if (indexable && ['Article', 'BlogPosting'].some((type) => types.includes(type)) && pageNode && !pageNode.datePublished) {
        fail(`${page.path} article JSON-LD is missing datePublished.`);
      }
      if (indexable && page.schemaType === 'CollectionPage' && pageNode && pageNode.mainEntity?.['@type'] !== 'ItemList') {
        fail(`${page.path} CollectionPage JSON-LD should expose an ItemList mainEntity.`);
      }
      if (indexable && pageNode && (!Array.isArray(pageNode.keywords) || pageNode.keywords.length < 2)) {
        fail(`${page.path} JSON-LD page node should include primary and secondary keywords.`);
      }
    } catch (error) {
      fail(`${page.path} has invalid JSON-LD: ${error.message}`);
    }
  }

  const topicRequired = seo.pages?.[page.path]?.topicRequired ?? seo.defaults?.topicRequired;
  if (indexable && topicRequired !== false && (!Array.isArray(page.topics) || page.topics.length === 0)) {
    fail(`${page.path} is indexable but has no topic metadata.`);
  }
  for (const topic of page.topics || []) {
    if (!topicIds.has(topic)) fail(`${page.path} references unknown topic ${topic}.`);
  }

  for (const tag of allImageTags(html)) {
    if (!isMeaningfulAlt(tag)) fail(`${page.path} has image without meaningful alt text: ${tag.slice(0, 120)}`);
  }

  if (priorityPages.has(page.path) && !/field-notes\.html|data-cta-id=["']newsletter["']/.test(html)) {
    fail(`${page.path} is a priority page without a Field Notes CTA.`);
  }

  if (indexable && llms && !llms.includes(`](${expectedUrl(page)})`)) {
    fail(`${page.path} is indexable but missing from llms.txt.`);
  }
}

for (const topic of topics.topics || []) {
  if (seo.topicPages?.[topic.id]) {
    const topicPath = `topics/${topic.id}.html`;
    if (!pages.some((page) => page.path === topicPath)) fail(`${topicPath} was not generated.`);
  }
}

const descriptionOwners = new Map();
for (const page of pages.filter((page) => page.index !== false)) {
  const description = String(page.description || '').trim();
  if (!description) continue;
  if (!descriptionOwners.has(description)) descriptionOwners.set(description, []);
  descriptionOwners.get(description).push(page.path);
}
for (const [description, owners] of descriptionOwners.entries()) {
  if (owners.length > 3 && isWeakDescription(description)) {
    fail(`Weak generated description is reused by ${owners.length} pages: ${owners.join(', ')}`);
  }
}

const apiPages = readJsonIfPresent(path.join(apiRoot, 'pages.json'));
if (apiPages) {
  if (!Array.isArray(apiPages)) {
    fail('dist/api/v1/pages.json must be an array.');
  } else {
    for (const page of apiPages.filter((page) => !/admin\/|dateme|sample/i.test(page.htmlPath || ''))) {
      if (isWeakDescription(page.description || '')) {
        fail(`dist/api/v1/pages.json has weak description for ${page.htmlPath}: "${page.description}"`);
      }
    }
  }
}

const searchIndex = readJsonIfPresent(path.join(apiRoot, 'search-index.json'));
if (searchIndex?.records) {
  for (const record of searchIndex.records.filter((record) => record.type === 'page')) {
    if (isWeakDescription(record.summary || '')) {
      fail(`dist/api/v1/search-index.json has weak page summary for ${record.id}: "${record.summary}"`);
    }
  }
}

if (llms) {
  const weakLines = llms
    .split('\n')
    .filter((line) => /^- \[/.test(line) && isWeakDescription(line.replace(/^.*:\s*/, '').trim()));
  for (const line of weakLines) fail(`llms.txt has weak navigation description: ${line.slice(0, 180)}`);
} else {
  fail('llms.txt is missing.');
}

if (failures.length) {
  console.error('SEO check failed:');
  failures.forEach((failure) => console.error(`  ${failure}`));
  process.exit(1);
}

console.log(`SEO OK (${pages.length} pages, ${pages.filter((page) => page.index !== false).length} indexable).`);
