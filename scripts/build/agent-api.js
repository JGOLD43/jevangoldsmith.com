const path = require('path');
const fs = require('fs');

function createAgentApiBuilder({
  root,
  distDir,
  site,
  books,
  adventures,
  projects,
  quotes,
  ctas,
  newsletter,
  topics,
  essays,
  skills,
  products,
  getPublicProducts,
  getPublicResources,
  getPublicQuotes,
  localizeRemoteStrings,
  localizeBooks,
  quoteCategories,
  stripHtml,
  writeGenerated
}) {
  function absoluteUrl(urlPath) {
    if (/^https?:\/\//i.test(urlPath)) return urlPath;
    const normalized = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
    return `https://${site.domain}${normalized}`;
  }

  function latestSourceDate(pages) {
    const files = [
      'data/site.json',
      'data/site.config.json',
      'data/ctas.json',
      'data/newsletter.json',
      'data/topics.json',
      'data/products.json',
      'data/projects.json',
      'data/adventures.json',
      'data/essays.json',
      'data/skills.json',
      'data/books.json',
      'data/quotes.json',
      ...pages.map((page) => page.path).filter((file) => fs.existsSync(file))
    ];
    const latest = files
      .filter((file) => fs.existsSync(file))
      .map((file) => fs.statSync(file).mtimeMs)
      .sort((a, b) => b - a)[0] || Date.now();
    return new Date(latest).toISOString();
  }

  function enrichCollectionItem(collection, item, pagePath) {
    const canonicalUrl = /^https?:\/\//i.test(pagePath) ? pagePath : absoluteUrl(`/${pagePath}`);
    const tags = item.tags || [item.category, item.type, item.region].filter(Boolean);
    return {
      ...item,
      collection,
      canonicalUrl,
      shareable: item.status !== 'draft',
      tags,
      summary: item.shortDescription || item.subtitle || item.tagline || item.description || stripHtml(item.content || item.fullContent || '')
    };
  }

  function buildApiSchema(endpoints) {
    return {
      version: '1.0',
      description: 'Static, no-server JSON API for Jevan Goldsmith website ingestion.',
      costModel: 'Static Firebase Hosting assets. No Cloud Functions or Firestore reads.',
      entrypoint: absoluteUrl('/api/v1/index.json'),
      endpoints,
      commonItemFields: {
        collection: 'Collection name.',
        canonicalUrl: 'Canonical human-facing URL for citation or navigation.',
        shareable: 'Whether this item is intended for public sharing.',
        tags: 'Topic tags for discovery.',
        summary: 'Short ingestible summary.'
      },
      searchIndexFields: {
        type: 'Record type: page or collection name.',
        id: 'Stable source identifier when available.',
        title: 'Display title or primary text.',
        summary: 'Short searchable summary.',
        section: 'Navigation section or collection name.',
        url: 'Canonical URL to fetch or cite.',
        tags: 'Topic tags for discovery.'
      },
      collections: {
        books: ['title', 'author', 'isbn', 'category', 'rating', 'canonicalUrl'],
        skills: ['id', 'title', 'category', 'proficiency', 'activity', 'relatedSkills', 'canonicalUrl'],
        adventures: ['id', 'title', 'location', 'region', 'startDate', 'endDate', 'gallery', 'canonicalUrl'],
        essays: ['id', 'title', 'author', 'date', 'category', 'content', 'canonicalUrl'],
        quotes: ['text', 'author', 'category', 'canonicalUrl'],
        projects: ['id', 'slug', 'title', 'status', 'category', 'technologies', 'links', 'canonicalUrl'],
        products: ['id', 'slug', 'title', 'type', 'status', 'price', 'checkoutUrl', 'canonicalUrl'],
        resources: ['id', 'slug', 'title', 'type', 'resourceType', 'status', 'price', 'downloadUrl', 'canonicalUrl'],
        ctas: ['id', 'label', 'href', 'intent', 'priority', 'canonicalUrl']
      }
    };
  }

  function buildSearchIndex(pageRecords, collectionEndpoints, updatedAt) {
    const pageItems = pageRecords.filter((page) => page.index !== false).map((page) => ({
      type: 'page',
      id: page.id,
      title: page.title,
      summary: page.description,
      section: page.section,
      url: page.url,
      tags: [page.section, page.primaryKeyword, ...(page.secondaryKeywords || [])].filter(Boolean)
    }));
    const collectionItems = Object.entries(collectionEndpoints).flatMap(([collection, items]) => (
      items.map((item) => ({
        type: collection,
        id: item.id || item.slug || item.title || item.text,
        title: item.title || item.label || item.text || item.name,
        summary: item.summary,
        section: collection,
        url: item.canonicalUrl,
        tags: item.tags || []
      }))
    ));

    return {
      version: '1.0',
      updatedAt,
      guidance: 'Static search/discovery index. Fetch candidate URLs from this file, then fetch canonical collection endpoints or HTML for detail.',
      records: [...pageItems, ...collectionItems]
        .map((record) => ({
          ...record,
          searchText: [record.title, record.summary, record.section, record.type, ...(record.tags || [])]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
        }))
        .filter((record) => record.title && record.url)
        .sort((a, b) => `${a.type}:${a.title}`.localeCompare(`${b.type}:${b.title}`))
    };
  }

  function writeRouteSpecificApi(apiDir, pageRecords, collectionEndpoints, updatedAt) {
    const pageDir = path.join(apiDir, 'pages');
    const productPage = pageRecords.find((page) => page.htmlPath === 'products.html');
    const resourcePage = pageRecords.find((page) => page.htmlPath === 'free-resources.html');

    writeGenerated(path.join(pageDir, 'products.json'), `${JSON.stringify({
      version: '1.0',
      updatedAt,
      page: productPage,
      source: 'data/products.json',
      categories: products.productCategories || [],
      items: collectionEndpoints.products
    }, null, 2)}\n`);

    writeGenerated(path.join(pageDir, 'free-resources.json'), `${JSON.stringify({
      version: '1.0',
      updatedAt,
      page: resourcePage,
      source: 'data/products.json',
      categories: products.resourceCategories || [],
      items: collectionEndpoints.resources
    }, null, 2)}\n`);

    const projectsPage = pageRecords.find((page) => page.htmlPath === 'projects.html');
    writeGenerated(path.join(pageDir, 'projects.json'), `${JSON.stringify({
      version: '1.0',
      updatedAt,
      page: projectsPage,
      source: 'data/projects.json',
      items: collectionEndpoints.projects
    }, null, 2)}\n`);

    const quotesPage = pageRecords.find((page) => page.htmlPath === 'quotes.html');
    writeGenerated(path.join(pageDir, 'quotes.json'), `${JSON.stringify({
      version: '1.0',
      updatedAt,
      page: quotesPage,
      source: 'data/quotes.json',
      categories: quoteCategories(getPublicQuotes()),
      items: collectionEndpoints.quotes
    }, null, 2)}\n`);
  }

  function writeItemApi(apiDir, collection, items, updatedAt) {
    for (const item of items) {
      const slug = item.slug || item.id;
      if (!slug) continue;
      writeGenerated(path.join(apiDir, collection, `${slug}.json`), `${JSON.stringify({
        version: '1.0',
        updatedAt,
        collection,
        canonicalUrl: absoluteUrl(`/api/v1/${collection}/${slug}.json`),
        item
      }, null, 2)}\n`);
    }
  }

  function buildAgentApi(pages) {
    const apiDir = path.join(distDir, 'api', 'v1');
    const updatedAt = latestSourceDate(pages);
    const localizedBooks = localizeBooks(books);
    const localizedAdventures = localizeRemoteStrings(adventures.adventures || []);
    const localizedProjects = localizeRemoteStrings(projects.projects || []);
    const publishedProjects = localizedProjects.filter((project) => project.status !== 'draft' && project.status !== 'retired');
    const pageRecords = pages.map((page) => ({
      id: page.path.replace(/\.html$/, ''),
      title: page.title,
      description: page.description,
      index: page.index !== false,
      section: page.section,
      primaryKeyword: page.primaryKeyword,
      secondaryKeywords: page.secondaryKeywords,
      audience: page.audience,
      searchIntent: page.searchIntent,
      contentDepth: page.contentDepth,
      relatedPages: page.relatedPages,
      lastReviewed: page.lastReviewed,
      url: absoluteUrl(page.url),
      htmlPath: page.path,
      source: page.generatedFrom
    }));
    const content = {
      updatedAt,
      owner: site.siteName,
      baseUrl: absoluteUrl('/'),
      collections: {
        essays: essays.essays || [],
        books: localizedBooks,
        skills: skills.skills || [],
        adventures: localizedAdventures,
        quotes,
        projects: localizedProjects,
        products: getPublicProducts(),
        resources: products.resources || [],
        ctas: ctas.ctas || [],
        newsletter,
        topics: topics.topics || []
      }
    };
    const interests = {
      updatedAt,
      owner: site.siteName,
      topics: Array.from(new Set([
        ...((skills.skills || []).flatMap((skill) => [skill.category, skill.title, ...(skill.relatedSkills || [])])),
        ...((adventures.adventures || []).flatMap((adventure) => [adventure.region, ...(adventure.tags || [])])),
        ...books.map((book) => book.category),
        ...((projects.projects || []).flatMap((project) => [project.category, ...(project.topics || []), ...(project.tags || [])])),
        ...((quotes.fullQuotes || []).flatMap((quote) => [quote.category, ...(quote.topics || []), ...(quote.tags || [])])),
        ...((products.products || []).flatMap((product) => [product.type, product.category, ...(product.topics || []), ...(product.tags || [])])),
        ...((products.resources || []).flatMap((resource) => [resource.type, resource.category, ...(resource.topics || []), ...(resource.tags || [])])),
        ...((topics.topics || []).map((topic) => topic.label))
      ].filter(Boolean))).sort(),
      sourceCollections: ['skills', 'adventures', 'books', 'projects', 'products', 'resources', 'essays', 'quotes']
    };
    const index = {
      version: '1.0',
      updatedAt,
      site: {
        name: site.siteName,
        domain: site.domain,
        baseUrl: absoluteUrl('/'),
        email: site.email,
        social: site.social
      },
      guidance: {
        preferredIngestion: 'Fetch these JSON endpoints before scraping HTML.',
        preserveAttribution: true,
        contact: site.email
      },
      endpoints: {
        schema: absoluteUrl('/api/v1/schema.json'),
        search: absoluteUrl('/api/v1/search-index.json'),
        pages: absoluteUrl('/api/v1/pages.json'),
        content: absoluteUrl('/api/v1/content.json'),
        interests: absoluteUrl('/api/v1/interests.json'),
        books: absoluteUrl('/api/v1/books.json'),
        skills: absoluteUrl('/api/v1/skills.json'),
        adventures: absoluteUrl('/api/v1/adventures.json'),
        essays: absoluteUrl('/api/v1/essays.json'),
        quotes: absoluteUrl('/api/v1/quotes.json'),
        projects: absoluteUrl('/api/v1/projects.json'),
        products: absoluteUrl('/api/v1/products.json'),
        resources: absoluteUrl('/api/v1/resources.json'),
        ctas: absoluteUrl('/api/v1/ctas.json'),
        newsletter: absoluteUrl('/api/v1/newsletter.json'),
        topics: absoluteUrl('/api/v1/topics.json')
      },
      pageEndpoints: {
        products: absoluteUrl('/api/v1/pages/products.json'),
        freeResources: absoluteUrl('/api/v1/pages/free-resources.json'),
        projects: absoluteUrl('/api/v1/pages/projects.json'),
        quotes: absoluteUrl('/api/v1/pages/quotes.json')
      },
      itemEndpoints: {
        projectsPattern: absoluteUrl('/api/v1/projects/{slug}.json'),
        productsPattern: absoluteUrl('/api/v1/products/{slug}.json'),
        resourcesPattern: absoluteUrl('/api/v1/resources/{slug}.json')
      }
    };
    const collectionEndpoints = {
      books: localizedBooks.map((book) => enrichCollectionItem('books', book, 'books.html')),
      skills: (skills.skills || []).map((skill) => enrichCollectionItem('skills', skill, `skill-${skill.id}.html`)),
      adventures: localizedAdventures.map((adventure) => enrichCollectionItem('adventures', adventure, `adventure-${adventure.id}.html`)),
      essays: (essays.essays || []).map((essay) => enrichCollectionItem('essays', essay, 'essays.html')),
      quotes: getPublicQuotes().map((quote) => enrichCollectionItem('quotes', quote, `quotes.html#${quote.slug || quote.id}`)),
      projects: publishedProjects.map((project) => enrichCollectionItem('projects', project, `projects.html#${project.slug || project.id}`)),
      products: getPublicProducts().map((product) => enrichCollectionItem('products', product, `products.html#${product.slug || product.id}`)),
      resources: getPublicResources().map((resource) => enrichCollectionItem('resources', resource, `free-resources.html#${resource.slug || resource.id}`)),
      ctas: (ctas.ctas || []).map((cta) => enrichCollectionItem('ctas', cta, cta.href || 'index.html')),
      newsletter: [newsletter].filter((item) => item.name).map((item) => enrichCollectionItem('newsletter', { id: 'field-notes', title: item.name, ...item }, 'field-notes.html')),
      topics: (topics.topics || []).map((topic) => enrichCollectionItem('topics', topic, `search.html?q=${encodeURIComponent(topic.label)}`))
    };
    const schema = buildApiSchema(index.endpoints);
    const searchIndex = buildSearchIndex(pageRecords, collectionEndpoints, updatedAt);

    writeGenerated(path.join(apiDir, 'schema.json'), `${JSON.stringify(schema, null, 2)}\n`);
    writeGenerated(path.join(apiDir, 'search-index.json'), `${JSON.stringify(searchIndex)}\n`);
    writeGenerated(path.join(apiDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
    writeGenerated(path.join(apiDir, 'pages.json'), `${JSON.stringify(pageRecords, null, 2)}\n`);
    writeGenerated(path.join(apiDir, 'content.json'), `${JSON.stringify(content, null, 2)}\n`);
    writeGenerated(path.join(apiDir, 'interests.json'), `${JSON.stringify(interests, null, 2)}\n`);
    for (const [name, data] of Object.entries(collectionEndpoints)) {
      writeGenerated(path.join(apiDir, `${name}.json`), `${JSON.stringify({
        version: '1.0',
        updatedAt,
        collection: name,
        canonicalUrl: absoluteUrl(`/api/v1/${name}.json`),
        items: data
      }, null, 2)}\n`);
    }
    writeRouteSpecificApi(apiDir, pageRecords, collectionEndpoints, updatedAt);
    writeItemApi(apiDir, 'projects', collectionEndpoints.projects, updatedAt);
    writeItemApi(apiDir, 'products', collectionEndpoints.products, updatedAt);
    writeItemApi(apiDir, 'resources', collectionEndpoints.resources, updatedAt);
  }

  function renderLlmsTxt(pages) {
    const topPages = pages
      .filter((page) => page.index !== false)
      .map((page) => `- [${page.title}](${absoluteUrl(page.url)}): ${page.description}`)
      .join('\n');

    return `# ${site.siteName}

${site.siteName} is a personal website, writing archive, reading library, skill map, adventure log, product/resource surface, and contact point.

## Agent API

- API index: ${absoluteUrl('/api/v1/index.json')}
- API schema: ${absoluteUrl('/api/v1/schema.json')}
- Search index: ${absoluteUrl('/api/v1/search-index.json')}
- Pages: ${absoluteUrl('/api/v1/pages.json')}
- Content: ${absoluteUrl('/api/v1/content.json')}
- Interests: ${absoluteUrl('/api/v1/interests.json')}
- Books: ${absoluteUrl('/api/v1/books.json')}
- Skills: ${absoluteUrl('/api/v1/skills.json')}
- Adventures: ${absoluteUrl('/api/v1/adventures.json')}
- Essays: ${absoluteUrl('/api/v1/essays.json')}
- Quotes: ${absoluteUrl('/api/v1/quotes.json')}
- Products and resources: ${absoluteUrl('/api/v1/products.json')}
- Projects: ${absoluteUrl('/api/v1/projects.json')}
- Product page data: ${absoluteUrl('/api/v1/pages/products.json')}
- Free resources page data: ${absoluteUrl('/api/v1/pages/free-resources.json')}
- Project page data: ${absoluteUrl('/api/v1/pages/projects.json')}
- Quote page data: ${absoluteUrl('/api/v1/pages/quotes.json')}

Use the JSON API for ingestion before scraping HTML. HTML pages remain canonical for humans.

## Navigation

${topPages}
`;
  }

  return {
    absoluteUrl,
    latestSourceDate,
    buildAgentApi,
    renderLlmsTxt
  };
}

module.exports = { createAgentApiBuilder };
