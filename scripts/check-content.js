const fs = require('fs');
const path = require('path');

const requiredJson = [
  'data/adventures.json',
  'data/books.json',
  'data/ctas.json',
  'data/newsletter.json',
  'data/essays.json',
  'data/pages.json',
  'data/products.json',
  'data/projects.json',
  'data/quotes.json',
  'data/site.config.json',
  'data/site.json',
  'data/skills.json',
  'data/topics.json'
];

let failed = false;

for (const file of requiredJson) {
  try {
    JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    console.error(`${file} is not valid JSON: ${error.message}`);
    failed = true;
  }
}

const pages = JSON.parse(fs.readFileSync('data/pages.json', 'utf8'));
const htmlFiles = fs.existsSync('dist') ? fs.readdirSync('dist').filter((file) => file.endsWith('.html')).sort() : [];
const pagePaths = new Set(pages.map((page) => page.path));

for (const file of htmlFiles) {
  if (!pagePaths.has(file)) {
    console.error(`${file} is missing from data/pages.json`);
    failed = true;
  }
}

const sourcePageDir = '_src/pages';
if (fs.existsSync(sourcePageDir)) {
  const sourcePages = fs.readdirSync(sourcePageDir).filter((file) => file.endsWith('.html')).sort();
  for (const file of sourcePages) {
    const page = pages.find((candidate) => candidate.path === file);
    if (!page) {
      console.error(`${sourcePageDir}/${file} is missing from data/pages.json`);
      failed = true;
      continue;
    }
    if (page.generatedFrom !== '_src/pages') {
      console.error(`${file} should be marked generatedFrom "_src/pages" in data/pages.json`);
      failed = true;
    }
    if (!fs.existsSync(path.join('dist', file))) {
      console.error(`dist/${file} was not generated from ${sourcePageDir}/${file}`);
      failed = true;
    }
  }
}

const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
const distSitemap = fs.existsSync('dist/sitemap.xml') ? fs.readFileSync('dist/sitemap.xml', 'utf8') : '';
for (const page of pages) {
  if (page.index === false) continue;
  const expected = page.url === '/' ? 'https://jevangoldsmith.com/' : `https://jevangoldsmith.com${page.url}`;
  if (!sitemap.includes(`<loc>${expected}</loc>`)) {
    console.error(`sitemap.xml is missing ${expected}`);
    failed = true;
  }
  if (distSitemap && !distSitemap.includes(`<loc>${expected}</loc>`)) {
    console.error(`dist/sitemap.xml is missing ${expected}`);
    failed = true;
  }
}

const books = JSON.parse(fs.readFileSync('data/books.json', 'utf8'));
for (const [index, book] of books.entries()) {
  for (const field of ['title', 'author', 'isbn', 'category']) {
    if (!book[field]) {
      console.error(`data/books.json item ${index} is missing ${field}`);
      failed = true;
    }
  }
}

const products = JSON.parse(fs.readFileSync('data/products.json', 'utf8'));
if (!Array.isArray(products.products)) {
  console.error('data/products.json must contain a products array');
  failed = true;
} else {
  for (const [index, product] of products.products.entries()) {
    for (const field of ['id', 'slug', 'title', 'type', 'status', 'shortDescription', 'ctaLabel', 'tags']) {
      if (!product[field] || (Array.isArray(product[field]) && product[field].length === 0)) {
        console.error(`data/products.json item ${index} is missing ${field}`);
        failed = true;
      }
    }
  }
}

if (!Array.isArray(products.resources)) {
  console.error('data/products.json must contain a resources array');
  failed = true;
} else {
  for (const [index, resource] of products.resources.entries()) {
    for (const field of ['id', 'slug', 'title', 'type', 'resourceType', 'status', 'shortDescription', 'ctaLabel', 'tags']) {
      if (!resource[field] || (Array.isArray(resource[field]) && resource[field].length === 0)) {
        console.error(`data/products.json resource ${index} is missing ${field}`);
        failed = true;
      }
    }
  }
}

const productSlugs = products.products.map((product) => product.slug).filter(Boolean);
const resourceSlugs = (products.resources || []).map((resource) => resource.slug).filter(Boolean);
const productsHtml = fs.existsSync('dist/products.html') ? fs.readFileSync('dist/products.html', 'utf8') : '';
const resourcesHtml = fs.existsSync('dist/free-resources.html') ? fs.readFileSync('dist/free-resources.html', 'utf8') : '';
const distApiRoot = path.join('dist', 'api', 'v1');

for (const slug of productSlugs) {
  if (!productsHtml.includes(`id="${slug}"`)) {
    console.error(`products.html is missing product anchor ${slug}`);
    failed = true;
  }
  if (fs.existsSync(distApiRoot) && !fs.existsSync(path.join(distApiRoot, 'products', `${slug}.json`))) {
    console.error(`dist/api/v1/products/${slug}.json is missing`);
    failed = true;
  }
}

for (const slug of resourceSlugs) {
  if (!resourcesHtml.includes(`id="${slug}"`)) {
    console.error(`free-resources.html is missing resource anchor ${slug}`);
    failed = true;
  }
  if (fs.existsSync(distApiRoot) && !fs.existsSync(path.join(distApiRoot, 'resources', `${slug}.json`))) {
    console.error(`dist/api/v1/resources/${slug}.json is missing`);
    failed = true;
  }
}

if (fs.existsSync(distApiRoot)) {
  for (const file of ['pages/products.json', 'pages/free-resources.json', 'pages/projects.json', 'pages/quotes.json', 'resources.json', 'projects.json']) {
    if (!fs.existsSync(path.join(distApiRoot, file))) {
      console.error(`dist/api/v1/${file} is missing`);
      failed = true;
    }
  }
}

const statuses = new Set(['draft', 'preview', 'available', 'active', 'completed', 'planned', 'retired']);
const existingTargets = new Set([
  ...htmlFiles,
  ...pages.map((page) => page.path),
  ...pages.map((page) => page.url.replace(/^\//, ''))
]);

function validateCollectionItems(collectionName, items, options = {}) {
  const seen = new Set();
  const htmlFile = options.htmlFile;
  const html = htmlFile && fs.existsSync(htmlFile) ? fs.readFileSync(htmlFile, 'utf8') : '';

  for (const [index, item] of items.entries()) {
    for (const field of options.required || []) {
      if (!item[field] || (Array.isArray(item[field]) && item[field].length === 0)) {
        console.error(`${collectionName} item ${index} is missing ${field}`);
        failed = true;
      }
    }

    if (item.slug) {
      if (seen.has(item.slug)) {
        console.error(`${collectionName} has duplicate slug ${item.slug}`);
        failed = true;
      }
      seen.add(item.slug);

      if (html && !html.includes(`id="${item.slug}"`)) {
        console.error(`${htmlFile} is missing ${collectionName} anchor ${item.slug}`);
        failed = true;
      }

      if (options.itemApiDir && fs.existsSync(distApiRoot) && !fs.existsSync(path.join(distApiRoot, options.itemApiDir, `${item.slug}.json`))) {
        console.error(`dist/api/v1/${options.itemApiDir}/${item.slug}.json is missing`);
        failed = true;
      }
    }

    if (item.status && !statuses.has(item.status)) {
      console.error(`${collectionName} item ${item.slug || index} has invalid status ${item.status}`);
      failed = true;
    }

    for (const target of item.relatedContent || []) {
      const cleanTarget = String(target).split('#')[0];
      if (cleanTarget && !existingTargets.has(cleanTarget)) {
        console.error(`${collectionName} item ${item.slug || index} references missing relatedContent target ${target}`);
        failed = true;
      }
    }
  }
}

const projects = JSON.parse(fs.readFileSync('data/projects.json', 'utf8'));
if (!Array.isArray(projects.projects)) {
  console.error('data/projects.json must contain a projects array');
  failed = true;
} else {
  validateCollectionItems('projects', projects.projects, {
    htmlFile: 'dist/projects.html',
    itemApiDir: 'projects',
    required: ['id', 'slug', 'title', 'status', 'shortDescription', 'tags']
  });
}

const ctas = JSON.parse(fs.readFileSync('data/ctas.json', 'utf8'));
if (!ctas.primary?.id) {
  console.error('data/ctas.json must define primary.id');
  failed = true;
}
if (!Array.isArray(ctas.ctas) || ctas.ctas.length === 0) {
  console.error('data/ctas.json must contain a non-empty ctas array');
  failed = true;
} else {
  validateCollectionItems('ctas', ctas.ctas, {
    required: ['id', 'label', 'href', 'intent', 'priority', 'description']
  });

  const ctaIds = new Set(ctas.ctas.map((cta) => cta.id));
  if (ctas.primary?.id && !ctaIds.has(ctas.primary.id)) {
    console.error(`data/ctas.json primary references missing CTA ${ctas.primary.id}`);
    failed = true;
  }

  for (const cta of ctas.ctas) {
    const target = String(cta.href || '').split('#')[0];
    if (target && !/^https?:\/\//i.test(target) && !existingTargets.has(target)) {
      console.error(`data/ctas.json CTA ${cta.id} references missing href ${cta.href}`);
      failed = true;
    }
  }
}

if (!Array.isArray(ctas.sections)) {
  console.error('data/ctas.json must contain a sections array');
  failed = true;
} else {
  const ctaIds = new Set((ctas.ctas || []).map((cta) => cta.id));
  for (const section of ctas.sections) {
    for (const field of ['section', 'primaryCta']) {
      if (!section[field]) {
        console.error(`data/ctas.json section is missing ${field}`);
        failed = true;
      }
    }
    for (const id of [section.primaryCta, ...(section.secondaryCtas || [])].filter(Boolean)) {
      if (!ctaIds.has(id)) {
        console.error(`data/ctas.json section ${section.section || '(unknown)'} references missing CTA ${id}`);
        failed = true;
      }
    }
  }
}

const journeyStages = new Set(['orientation', 'authority', 'trust', 'lead', 'commerce', 'contact']);
if (!Array.isArray(ctas.pages)) {
  console.error('data/ctas.json must contain a pages array');
  failed = true;
} else {
  const ctaIds = new Set((ctas.ctas || []).map((cta) => cta.id));
  const pageEntries = new Map(ctas.pages.map((page) => [page.path, page]));
  for (const [index, page] of ctas.pages.entries()) {
    for (const field of ['path', 'journeyStage', 'primaryCta']) {
      if (!page[field]) {
        console.error(`data/ctas.json page ${index} is missing ${field}`);
        failed = true;
      }
    }
    if (page.path && !existingTargets.has(page.path)) {
      console.error(`data/ctas.json page ${page.path} references missing page`);
      failed = true;
    }
    if (page.journeyStage && !journeyStages.has(page.journeyStage)) {
      console.error(`data/ctas.json page ${page.path || index} has invalid journeyStage ${page.journeyStage}`);
      failed = true;
    }
    for (const id of [page.primaryCta, ...(page.secondaryCtas || [])].filter(Boolean)) {
      if (!ctaIds.has(id)) {
        console.error(`data/ctas.json page ${page.path || index} references missing CTA ${id}`);
        failed = true;
      }
    }
  }

  for (const publicPage of ['index.html', 'products.html', 'free-resources.html', 'contact.html', 'meet.html', 'essays.html', 'field-notes.html']) {
    if (!pageEntries.has(publicPage)) {
      console.error(`data/ctas.json is missing page CTA metadata for ${publicPage}`);
      failed = true;
    }
  }
}

const newsletter = JSON.parse(fs.readFileSync('data/newsletter.json', 'utf8'));
for (const field of ['name', 'tagline', 'promise', 'formAction', 'ajaxEndpoint']) {
  if (!newsletter[field]) {
    console.error(`data/newsletter.json is missing ${field}`);
    failed = true;
  }
}

const topics = JSON.parse(fs.readFileSync('data/topics.json', 'utf8'));
if (!Array.isArray(topics.topics) || topics.topics.length === 0) {
  console.error('data/topics.json must contain a non-empty topics array');
  failed = true;
} else {
  const topicIds = new Set();
  for (const [index, topic] of topics.topics.entries()) {
    for (const field of ['id', 'label', 'description']) {
      if (!topic[field]) {
        console.error(`data/topics.json topic ${index} is missing ${field}`);
        failed = true;
      }
    }
    if (topic.id && topicIds.has(topic.id)) {
      console.error(`data/topics.json has duplicate topic ${topic.id}`);
      failed = true;
    }
    topicIds.add(topic.id);
  }

  for (const product of products.products || []) {
    for (const topic of product.topics || []) {
      if (!topicIds.has(topic)) {
        console.error(`data/products.json product ${product.slug || product.id} references missing topic ${topic}`);
        failed = true;
      }
    }
  }

  for (const resource of products.resources || []) {
    for (const topic of resource.topics || []) {
      if (!topicIds.has(topic)) {
        console.error(`data/products.json resource ${resource.slug || resource.id} references missing topic ${topic}`);
        failed = true;
      }
    }
  }
}

const quotes = JSON.parse(fs.readFileSync('data/quotes.json', 'utf8'));
if (!Array.isArray(quotes.fullQuotes)) {
  console.error('data/quotes.json must contain a fullQuotes array');
  failed = true;
} else {
  validateCollectionItems('quotes', quotes.fullQuotes, {
    htmlFile: 'dist/quotes.html',
    required: ['id', 'slug', 'text', 'author', 'category', 'status', 'tags']
  });
}

if (failed) process.exit(1);

console.log(`Content OK (${pages.length} pages, ${books.length} books).`);
