const fs = require('fs');
const path = require('path');
const { readJson, readText, distRoot, walkHtml, createReporter, validateCollection } = require('./check/harness');

const reporter = createReporter('check-content');

const pages = readJson('data/pages.json');
const dist = distRoot();
const distApiRoot = path.join(dist, 'api', 'v1');
const htmlFiles = walkHtml(dist).map((file) => path.relative(dist, file)).sort();
const pagePaths = new Set(pages.map((page) => page.path));

for (const file of htmlFiles) {
  if (!pagePaths.has(file)) reporter.fail(`${file} is missing from data/pages.json`);
}

const sourcePageDir = '_src/pages';
if (fs.existsSync(sourcePageDir)) {
  const sourcePages = fs.readdirSync(sourcePageDir).filter((file) => file.endsWith('.html')).sort();
  for (const file of sourcePages) {
    const page = pages.find((candidate) => candidate.path === file);
    if (!page) {
      reporter.fail(`${sourcePageDir}/${file} is missing from data/pages.json`);
      continue;
    }
    if (page.generatedFrom !== '_src/pages') {
      reporter.fail(`${file} should be marked generatedFrom "_src/pages" in data/pages.json`);
    }
    if (!fs.existsSync(path.join(dist, file))) {
      reporter.fail(`dist/${file} was not generated from ${sourcePageDir}/${file}`);
    }
  }
}

const sitemap = readText('sitemap.xml', '');
const distSitemap = readText(path.join(dist, 'sitemap.xml'), '');
for (const page of pages) {
  if (page.index === false) continue;
  const expected = page.url === '/' ? 'https://jevangoldsmith.com/' : `https://jevangoldsmith.com${page.url}`;
  if (!sitemap.includes(`<loc>${expected}</loc>`)) reporter.fail(`sitemap.xml is missing ${expected}`);
  if (distSitemap && !distSitemap.includes(`<loc>${expected}</loc>`)) reporter.fail(`dist/sitemap.xml is missing ${expected}`);
}

const books = readJson('data/books.json');
for (const [index, book] of books.entries()) {
  for (const field of ['title', 'author', 'isbn', 'category']) {
    if (!book[field]) reporter.fail(`data/books.json item ${index} is missing ${field}`);
  }
}

const products = readJson('data/products.json');
if (!Array.isArray(products.products)) {
  reporter.fail('data/products.json must contain a products array');
} else {
  for (const [index, product] of products.products.entries()) {
    for (const field of ['id', 'slug', 'title', 'type', 'status', 'shortDescription', 'tags']) {
      const value = product[field];
      if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
        reporter.fail(`data/products.json item ${index} is missing ${field}`);
      }
    }
  }
}

if (!Array.isArray(products.resources)) {
  reporter.fail('data/products.json must contain a resources array');
} else {
  for (const [index, resource] of products.resources.entries()) {
    for (const field of ['id', 'slug', 'title', 'type', 'resourceType', 'status', 'shortDescription', 'ctaLabel', 'tags']) {
      const value = resource[field];
      if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
        reporter.fail(`data/products.json resource ${index} is missing ${field}`);
      }
    }
  }
}

const productSlugs = (products.products || []).map((product) => product.slug).filter(Boolean);
const resourceSlugs = (products.resources || []).map((resource) => resource.slug).filter(Boolean);
const productsHtml = readText(path.join(dist, 'products.html'), '');
const resourcesHtml = readText(path.join(dist, 'free-resources.html'), '');

for (const slug of productSlugs) {
  if (!productsHtml.includes(`id="${slug}"`)) reporter.fail(`products.html is missing product anchor ${slug}`);
  if (fs.existsSync(distApiRoot) && !fs.existsSync(path.join(distApiRoot, 'products', `${slug}.json`))) {
    reporter.fail(`dist/api/v1/products/${slug}.json is missing`);
  }
}

for (const slug of resourceSlugs) {
  if (!resourcesHtml.includes(`id="${slug}"`)) reporter.fail(`free-resources.html is missing resource anchor ${slug}`);
  if (fs.existsSync(distApiRoot) && !fs.existsSync(path.join(distApiRoot, 'resources', `${slug}.json`))) {
    reporter.fail(`dist/api/v1/resources/${slug}.json is missing`);
  }
}

if (fs.existsSync(distApiRoot)) {
  for (const file of ['pages/products.json', 'pages/free-resources.json', 'pages/projects.json', 'pages/quotes.json', 'resources.json', 'projects.json']) {
    if (!fs.existsSync(path.join(distApiRoot, file))) reporter.fail(`dist/api/v1/${file} is missing`);
  }
}

const allowedStatuses = new Set(['draft', 'preview', 'available', 'active', 'completed', 'planned', 'retired']);
const existingTargets = new Set([
  ...htmlFiles,
  ...pages.map((page) => page.path),
  ...pages.map((page) => page.url.replace(/^\//, ''))
]);

const projects = readJson('data/projects.json');
if (!Array.isArray(projects.projects)) {
  reporter.fail('data/projects.json must contain a projects array');
} else {
  validateCollection(reporter, 'projects', projects.projects, {
    htmlFile: path.join(dist, 'projects.html'),
    distApiRoot,
    itemApiDir: 'projects',
    required: ['id', 'slug', 'title', 'status', 'shortDescription', 'tags'],
    allowedStatuses,
    existingTargets
  });
}

const ctas = readJson('data/ctas.json');
if (!ctas.primary?.id) reporter.fail('data/ctas.json must define primary.id');

if (!Array.isArray(ctas.ctas) || ctas.ctas.length === 0) {
  reporter.fail('data/ctas.json must contain a non-empty ctas array');
} else {
  validateCollection(reporter, 'ctas', ctas.ctas, {
    required: ['id', 'label', 'href', 'intent', 'priority', 'description'],
    allowedStatuses
  });

  const ctaIds = new Set(ctas.ctas.map((cta) => cta.id));
  if (ctas.primary?.id && !ctaIds.has(ctas.primary.id)) {
    reporter.fail(`data/ctas.json primary references missing CTA ${ctas.primary.id}`);
  }
  for (const cta of ctas.ctas) {
    const target = String(cta.href || '').split('#')[0];
    if (target && !/^https?:\/\//i.test(target) && !existingTargets.has(target)) {
      reporter.fail(`data/ctas.json CTA ${cta.id} references missing href ${cta.href}`);
    }
  }
}

if (!Array.isArray(ctas.sections)) {
  reporter.fail('data/ctas.json must contain a sections array');
} else {
  const ctaIds = new Set((ctas.ctas || []).map((cta) => cta.id));
  for (const section of ctas.sections) {
    for (const field of ['section', 'primaryCta']) {
      if (!section[field]) reporter.fail(`data/ctas.json section is missing ${field}`);
    }
    for (const id of [section.primaryCta, ...(section.secondaryCtas || [])].filter(Boolean)) {
      if (!ctaIds.has(id)) reporter.fail(`data/ctas.json section ${section.section || '(unknown)'} references missing CTA ${id}`);
    }
  }
}

const journeyStages = new Set(['orientation', 'authority', 'trust', 'lead', 'commerce', 'contact']);
if (!Array.isArray(ctas.pages)) {
  reporter.fail('data/ctas.json must contain a pages array');
} else {
  const ctaIds = new Set((ctas.ctas || []).map((cta) => cta.id));
  const pageEntries = new Map(ctas.pages.map((page) => [page.path, page]));
  for (const [index, page] of ctas.pages.entries()) {
    for (const field of ['path', 'journeyStage', 'primaryCta']) {
      if (!page[field]) reporter.fail(`data/ctas.json page ${index} is missing ${field}`);
    }
    if (page.path && !existingTargets.has(page.path)) {
      reporter.fail(`data/ctas.json page ${page.path} references missing page`);
    }
    if (page.journeyStage && !journeyStages.has(page.journeyStage)) {
      reporter.fail(`data/ctas.json page ${page.path || index} has invalid journeyStage ${page.journeyStage}`);
    }
    for (const id of [page.primaryCta, ...(page.secondaryCtas || [])].filter(Boolean)) {
      if (!ctaIds.has(id)) reporter.fail(`data/ctas.json page ${page.path || index} references missing CTA ${id}`);
    }
  }
  for (const publicPage of ['index.html', 'products.html', 'free-resources.html', 'contact.html', 'meet.html', 'essays.html', 'field-notes.html']) {
    if (!pageEntries.has(publicPage)) reporter.fail(`data/ctas.json is missing page CTA metadata for ${publicPage}`);
  }
}

const newsletter = readJson('data/newsletter.json');
for (const field of ['name', 'tagline', 'promise', 'formAction', 'ajaxEndpoint']) {
  if (!newsletter[field]) reporter.fail(`data/newsletter.json is missing ${field}`);
}

const topics = readJson('data/topics.json');
if (!Array.isArray(topics.topics) || topics.topics.length === 0) {
  reporter.fail('data/topics.json must contain a non-empty topics array');
} else {
  const topicIds = new Set();
  for (const [index, topic] of topics.topics.entries()) {
    for (const field of ['id', 'label', 'description']) {
      if (!topic[field]) reporter.fail(`data/topics.json topic ${index} is missing ${field}`);
    }
    if (topic.id && topicIds.has(topic.id)) reporter.fail(`data/topics.json has duplicate topic ${topic.id}`);
    topicIds.add(topic.id);
  }
  for (const product of products.products || []) {
    for (const topic of product.topics || []) {
      if (!topicIds.has(topic)) reporter.fail(`data/products.json product ${product.slug || product.id} references missing topic ${topic}`);
    }
  }
  for (const resource of products.resources || []) {
    for (const topic of resource.topics || []) {
      if (!topicIds.has(topic)) reporter.fail(`data/products.json resource ${resource.slug || resource.id} references missing topic ${topic}`);
    }
  }
}

const quotes = readJson('data/quotes.json');
if (!Array.isArray(quotes.fullQuotes)) {
  reporter.fail('data/quotes.json must contain a fullQuotes array');
} else {
  validateCollection(reporter, 'quotes', quotes.fullQuotes, {
    htmlFile: path.join(dist, 'quotes.html'),
    required: ['id', 'slug', 'text', 'author', 'category', 'status', 'tags'],
    allowedStatuses,
    existingTargets
  });
}

reporter.ok(`Content OK (${pages.length} pages, ${books.length} books).`);
