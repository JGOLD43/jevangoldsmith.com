function createPageMetadataInjector({
  site,
  books,
  skills,
  topics,
  absoluteUrl,
  absolutizeAsset,
  remoteAssetFor,
  lastModifiedDate,
  seoFor,
  pageTitleFor,
  isIndexable,
  sectionFor,
  descriptionFromHtml,
  metaDescriptionFromHtml,
  getPublicProducts,
  getPublicResources,
  getPublicProjects,
  getPublicQuotes,
  topicRelatedContent,
  adventureForFile,
  topicForFile,
  readPublicHtmlSource,
  escapeHTML,
  escapeHtmlAttr,
  decodeHtmlEntities,
  stripHtml,
  wordCount,
  titleForSeoPath
}) {
  function stripGeneratedMetadata(html) {
    return html
      .replace(/\n?\s*<meta name=["']description["'][^>]*>/gi, '')
      .replace(/\n?\s*<meta name=["']robots["'][^>]*>/gi, '')
      .replace(/\n?\s*<link rel=["']canonical["'][^>]*>/gi, '')
      .replace(/\n?\s*<link rel=["']alternate["'][^>]*(?:api\/v1|llms\.txt)[^>]*>/gi, '')
      .replace(/\n?\s*<meta (?:property|name)=["'](?:og|twitter):[^>]+>/gi, '')
      .replace(/\n?\s*<script type=["']application\/ld\+json["'][\s\S]*?<\/script>/gi, '');
  }

  function injectBreadcrumbs(file, html) {
    return html.replace(/\n?\s*<nav class=["']breadcrumbs["'][\s\S]*?<\/nav>\n*/gi, '\n');
  }

  function breadcrumbItemsFor(file) {
    const currentTitle = pageTitleFor(file, readPublicHtmlSource(file)).replace(/\s*[-|]\s*Jevan Goldsmith.*$/i, '');
    const items = [{ name: 'Home', href: 'index.html' }];
    if (file.startsWith('topics/')) {
      items.push({ name: 'Topics', href: 'topics/better-thinking.html' });
      items.push({ name: currentTitle, href: file });
      return items;
    }
    const section = sectionFor(file);
    const sectionCrumbs = {
      taste: { name: 'Taste', href: 'books.html' },
      experience: { name: 'Ventures', href: 'essays.html' },
      adventures: { name: 'Adventures', href: 'adventures.html' },
      explore: { name: 'Explore', href: 'about.html' }
    };
    if (sectionCrumbs[section] && sectionCrumbs[section].href !== file) items.push(sectionCrumbs[section]);
    items.push({ name: currentTitle, href: file });
    return items;
  }

  function collectionItemsForSchema(file) {
    if (file === 'books.html') {
      return books.slice(0, 20).map((book, index) => ({
        title: book.title,
        href: `books.html#book-${index}`
      }));
    }
    if (file === 'products.html') {
      return getPublicProducts().map((product) => ({
        title: product.title,
        href: `products.html#${product.slug || product.id}`
      }));
    }
    if (file === 'free-resources.html') {
      return getPublicResources().map((resource) => ({
        title: resource.title,
        href: `free-resources.html#${resource.slug || resource.id}`
      }));
    }
    if (file === 'projects.html') {
      return getPublicProjects().map((project) => ({
        title: project.title,
        href: `projects.html#${project.slug || project.id}`
      }));
    }
    if (file === 'quotes.html') {
      return getPublicQuotes().slice(0, 20).map((quote) => ({
        title: quote.text.slice(0, 80),
        href: `quotes.html#${quote.slug || quote.id}`
      }));
    }
    if (file === 'skills.html') {
      return (skills.skills || []).filter((skill) => skill.status !== 'draft').map((skill) => ({
        title: skill.title,
        href: `skill-${skill.id}.html`
      }));
    }
    const pageSeo = seoFor(file);
    if (pageSeo.schemaType === 'CollectionPage') {
      return (pageSeo.relatedPages || []).slice(0, 12).map((href) => ({
        title: titleForSeoPath(href),
        href
      }));
    }
    return [];
  }

  function imageObjectFor(image, title) {
    return {
      '@type': 'ImageObject',
      url: image,
      contentUrl: image,
      caption: title,
      width: 1200,
      height: 630
    };
  }

  function socialImageFor(file, html) {
    const adventure = adventureForFile(file);
    if (adventure?.heroImage) return absolutizeAsset(remoteAssetFor(adventure.heroImage, 1200));
    const ogCandidate = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i)?.[1];
    return absolutizeAsset(ogCandidate || site.assets?.profile || site.assets?.logo || 'images/logo.png');
  }

  function structuredDataFor(file, title, description, url, image) {
    const pageSeo = seoFor(file);
    const breadcrumbItems = breadcrumbItemsFor(file);
    const modifiedDate = lastModifiedDate(file);
    const keywords = [pageSeo.primaryKeyword, ...(pageSeo.secondaryKeywords || [])].filter(Boolean);
    const graph = [
      {
        '@type': 'Person',
        '@id': absoluteUrl('/#person'),
        name: site.siteName,
        url: absoluteUrl('/'),
        email: site.email,
        description: 'Jevan Goldsmith writes about better thinking, books, AI-assisted work, personal systems, real estate development, business building, travel, and useful tools.',
        jobTitle: 'Writer and builder',
        image: absolutizeAsset(site.assets?.profile || site.assets?.logo || 'images/logo.png'),
        knowsAbout: [
          'better thinking',
          'books and reading',
          'AI-assisted work',
          'personal systems',
          'real estate development',
          'business building'
        ],
        sameAs: Object.values(site.social || {}).filter(Boolean)
      },
      {
        '@type': 'WebSite',
        '@id': absoluteUrl('/#website'),
        name: site.siteName,
        url: absoluteUrl('/'),
        inLanguage: 'en',
        publisher: { '@id': absoluteUrl('/#person') },
        potentialAction: {
          '@type': 'SearchAction',
          target: absoluteUrl('/search.html?q={search_term_string}'),
          'query-input': 'required name=search_term_string'
        }
      }
    ];

    const pageNode = {
      '@type': file.startsWith('adventure-') ? 'BlogPosting' : (pageSeo.schemaType || 'WebPage'),
      '@id': `${url}#page`,
      url,
      name: title,
      headline: title,
      description,
      image: imageObjectFor(image, title),
      isPartOf: { '@id': absoluteUrl('/#website') },
      author: { '@id': absoluteUrl('/#person') },
      publisher: { '@id': absoluteUrl('/#person') },
      inLanguage: 'en',
      dateModified: modifiedDate,
      keywords,
      audience: {
        '@type': 'Audience',
        audienceType: pageSeo.audience
      },
      about: (pageSeo.topics || []).map((topicId) => {
        const topic = (topics.topics || []).find((candidate) => candidate.id === topicId);
        return topic?.label || topicId;
      })
    };

    if (['Article', 'BlogPosting'].includes(pageNode['@type'])) {
      pageNode.datePublished = modifiedDate;
      pageNode.mainEntityOfPage = { '@id': `${url}#page` };
      pageNode.wordCount = wordCount(stripHtml(readPublicHtmlSource(file)));
    }

    if (breadcrumbItems.length > 1) {
      pageNode.breadcrumb = { '@id': `${url}#breadcrumbs` };
      graph.push({
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumbs`,
        itemListElement: breadcrumbItems.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: absoluteUrl(item.href === 'index.html' ? '/' : `/${item.href}`)
        }))
      });
    }

    const adventure = adventureForFile(file);
    if (adventure) {
      pageNode.datePublished = adventure.startDate;
      pageNode.dateModified = adventure.endDate || adventure.startDate;
      pageNode.about = [adventure.location, adventure.region, ...(adventure.tags || []), ...(pageNode.about || [])].filter(Boolean);
    }

    const topic = topicForFile(file);
    if (topic) {
      pageNode.about = [topic.label, ...(pageNode.about || [])].filter(Boolean);
      pageNode.mainEntity = {
        '@type': 'ItemList',
        itemListElement: topicRelatedContent(topic.id).firstReads.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: absoluteUrl(`/${item.href}`),
          name: item.title
        }))
      };
    }

    const collectionItems = collectionItemsForSchema(file);
    if (collectionItems.length) {
      pageNode.mainEntity = {
        '@type': 'ItemList',
        itemListElement: collectionItems.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: absoluteUrl(`/${item.href}`),
          name: item.title
        }))
      };
    }

    graph.push(pageNode);
    return {
      '@context': 'https://schema.org',
      '@graph': graph
    };
  }

  function injectPageMetadata(file, html) {
    if (!html.includes('</head>')) return html;
    const existingDescription = metaDescriptionFromHtml(html);
    let next = stripGeneratedMetadata(html);
    const pageSeo = seoFor(file);
    const title = pageTitleFor(file, next);
    const description = pageSeo.description || (existingDescription ? decodeHtmlEntities(existingDescription) : descriptionFromHtml(next, title));
    const url = absoluteUrl(file === 'index.html' ? '/' : `/${file}`);
    const image = socialImageFor(file, next);
    const type = ['Article', 'BlogPosting'].includes(pageSeo.schemaType) || ['essays', 'adventures', 'skills'].includes(sectionFor(file)) ? 'article' : 'website';
    const structuredData = structuredDataFor(file, title, description, url, image);
    const robots = isIndexable(file) ? 'index, follow, max-image-preview:large' : 'noindex, follow, max-image-preview:large';
    next = next.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHTML(title.includes(site.siteName) ? title : `${title} | ${site.siteName}`)}</title>`);
    const meta = [
      `<meta name="description" content="${escapeHtmlAttr(description)}">`,
      `<meta name="robots" content="${robots}">`,
      `<link rel="canonical" href="${escapeHtmlAttr(url)}">`,
      '<link rel="alternate" type="application/json" href="api/v1/index.json" title="Agent API index">',
      '<link rel="alternate" type="text/plain" href="llms.txt" title="Agent instructions">',
      `<meta property="og:type" content="${type}">`,
      `<meta property="og:title" content="${escapeHtmlAttr(title)}">`,
      `<meta property="og:description" content="${escapeHtmlAttr(description)}">`,
      `<meta property="og:url" content="${escapeHtmlAttr(url)}">`,
      `<meta property="og:site_name" content="${escapeHtmlAttr(site.siteName)}">`,
      `<meta property="og:image" content="${escapeHtmlAttr(image)}">`,
      '<meta name="twitter:card" content="summary_large_image">',
      `<meta name="twitter:title" content="${escapeHtmlAttr(title)}">`,
      `<meta name="twitter:description" content="${escapeHtmlAttr(description)}">`,
      `<meta name="twitter:image" content="${escapeHtmlAttr(image)}">`,
      `<script type="application/ld+json">${JSON.stringify(structuredData)}</script>`
    ].join('\n    ');

    next = next.replace('</head>', `    ${meta}\n</head>`);
    return next;
  }

  return {
    injectPageMetadata,
    injectBreadcrumbs,
    breadcrumbItemsFor,
    collectionItemsForSchema,
    structuredDataFor,
    socialImageFor
  };
}

module.exports = { createPageMetadataInjector };
