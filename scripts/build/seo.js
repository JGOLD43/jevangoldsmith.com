function createSeoHelpers({
  site,
  seo,
  topics,
  seoReviewedAt,
  sectionFor,
  skillForFile,
  adventureForFile,
  topicForFile,
  titleFromHtml,
  descriptionFromHtml,
  titleCase
}) {
  function seoFor(file) {
    const topic = topicForFile(file);
    if (topic) {
      const topicSeo = seo.topicPages?.[topic.id] || {};
      const topicPageSeo = {
        ...seo.defaults,
        ...topicSeo,
        intent: `topic-${topic.id}`,
        topics: [topic.id],
        schemaType: topicSeo.schemaType || 'CollectionPage',
        index: topicSeo.index !== false
      };
      return withSeoStrategy(file, topicPageSeo);
    }

    const pageSeo = {
      ...seo.defaults,
      ...(seo.pages?.[file] || {})
    };
    if (!pageSeo.topics || pageSeo.topics.length === 0) pageSeo.topics = inferredTopicsFor(file);
    if (!pageSeo.schemaType) pageSeo.schemaType = inferredSchemaTypeFor(file);
    return withSeoStrategy(file, pageSeo);
  }

  function withSeoStrategy(file, pageSeo) {
    const relatedPages = Array.isArray(pageSeo.relatedPages) && pageSeo.relatedPages.length
      ? pageSeo.relatedPages
      : relatedPagesFor(file, pageSeo);
    const primaryKeyword = pageSeo.primaryKeyword || primaryKeywordFor(file, pageSeo);
    return {
      ...pageSeo,
      primaryKeyword,
      secondaryKeywords: pageSeo.secondaryKeywords || secondaryKeywordsFor(file, pageSeo, relatedPages),
      audience: pageSeo.audience || audienceFor(file, pageSeo),
      searchIntent: pageSeo.searchIntent || searchIntentFor(file, pageSeo),
      contentDepth: pageSeo.contentDepth || contentDepthFor(file, pageSeo),
      relatedPages,
      lastReviewed: pageSeo.lastReviewed || seoReviewedAt
    };
  }

  function pageSeoRecordFor(file) {
    const topic = topicForFile(file);
    if (topic) return seo.topicPages?.[topic.id] || {};
    return seo.pages?.[file] || {};
  }

  function primaryKeywordFor(file, pageSeo) {
    const topic = topicForFile(file);
    if (topic) return topic.label.toLowerCase();
    if (file === 'index.html') return site.siteName;
    const intent = pageSeo.intent || file.replace(/\.html$/, '');
    return String(intent)
      .replace(/^topic-/, '')
      .replace(/-/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function secondaryKeywordsFor(file, pageSeo, relatedPages) {
    const topicLabels = (pageSeo.topics || [])
      .map((topicId) => (topics.topics || []).find((topic) => topic.id === topicId)?.label)
      .filter(Boolean);
    const relatedTitles = (relatedPages || [])
      .slice(0, 4)
      .map((href) => titleForSeoPath(href).replace(/\s*[-|]\s*Jevan Goldsmith.*$/i, ''))
      .filter(Boolean);
    return Array.from(new Set([...topicLabels, ...relatedTitles]))
      .filter((keyword) => keyword.toLowerCase() !== String(pageSeo.primaryKeyword || '').toLowerCase())
      .slice(0, 8);
  }

  function audienceFor(file, pageSeo) {
    if (pageSeo.schemaType === 'ContactPage') return 'People who want to contact or collaborate with Jevan Goldsmith';
    if (file.startsWith('topics/')) return 'Readers exploring a focused topic trail';
    const audiences = {
      home: 'Readers, builders, collaborators, and curious visitors',
      taste: 'Readers looking for taste, recommendations, books, tools, and objects',
      experience: 'Builders and operators looking for practical judgment',
      skills: 'Learners building practical skills and better thinking loops',
      explore: 'People trying to understand Jevan Goldsmith and his operating context',
      adventures: 'Readers interested in travel notes, places, and lived experiments'
    };
    return audiences[sectionFor(file)] || 'Readers looking for useful ideas and practical systems';
  }

  function searchIntentFor(file, pageSeo) {
    if (file === 'index.html') return 'navigate';
    if (pageSeo.schemaType === 'ContactPage') return 'contact';
    if (file === 'search.html') return 'search';
    if (file.startsWith('topics/') || pageSeo.schemaType === 'CollectionPage') return 'explore';
    if (pageSeo.schemaType === 'Article' || pageSeo.schemaType === 'BlogPosting') return 'learn';
    return 'understand';
  }

  function contentDepthFor(file, pageSeo) {
    if (file === 'index.html' || file.startsWith('topics/')) return 'pillar';
    if (prioritySeoPages().has(file)) return 'pillar';
    if (pageSeo.schemaType === 'ContactPage' || file === 'search.html') return 'utility';
    if (pageSeo.schemaType === 'Article' || pageSeo.schemaType === 'BlogPosting') return 'supporting';
    if (pageSeo.schemaType === 'CollectionPage') return 'archive';
    return 'supporting';
  }

  function prioritySeoPages() {
    return new Set([
      'index.html',
      'field-notes.html',
      'books.html',
      'reading-philosophy.html',
      'weekly-review-template.html',
      'products.html',
      'free-resources.html',
      'essays.html',
      'projects.html'
    ]);
  }

  function relatedPagesFor(file, pageSeo = pageSeoRecordFor(file)) {
    const explicit = pageSeo.relatedPages;
    if (Array.isArray(explicit) && explicit.length) return explicit;
    const topicIds = pageSeo.topics || [];
    const candidates = Object.entries(seo.pages || {})
      .filter(([pathName, record]) => pathName !== file && record.index !== false && !/^admin\//.test(pathName))
      .map(([pathName, record]) => {
        const overlap = (record.topics || []).filter((topicId) => topicIds.includes(topicId)).length;
        const priorityBoost = prioritySeoPages().has(pathName) ? 3 : 0;
        const sectionBoost = sectionFor(pathName) === sectionFor(file) ? 1 : 0;
        return {
          path: pathName,
          score: overlap * 5 + priorityBoost + sectionBoost,
          title: record.title || titleForSeoPath(pathName)
        };
      })
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .map((candidate) => candidate.path);

    const defaults = ['field-notes.html', 'free-resources.html', 'search.html']
      .filter((pathName) => pathName !== file);
    return Array.from(new Set([...candidates, ...defaults])).slice(0, 6);
  }

  function titleForSeoPath(pathName) {
    const topic = topicForFile(pathName);
    if (topic) return seo.topicPages?.[topic.id]?.title || topic.label;
    return seo.pages?.[pathName]?.title || titleCase(pathName.replace(/\.html$/, ''));
  }

  function descriptionForSeoPath(pathName) {
    const topic = topicForFile(pathName);
    if (topic) return seo.topicPages?.[topic.id]?.description || topic.description || '';
    return seo.pages?.[pathName]?.description || '';
  }

  function inferredTopicsFor(file) {
    const skill = skillForFile(file);
    if (skill) {
      const skillTopics = {
        'first-principles-thinking': ['better-thinking'],
        'deep-research': ['better-thinking'],
        'clear-communication': ['better-thinking'],
        'financial-analysis': ['business-building'],
        'strategic-thinking': ['better-thinking', 'business-building'],
        'spreadsheet-mastery': ['business-building', 'tools-objects'],
        'ai-assisted-work': ['ai-assisted-work'],
        'real-estate-development': ['real-estate-development', 'business-building']
      };
      return skillTopics[skill.id] || ['better-thinking'];
    }
    if (adventureForFile(file) || file === 'adventures.html') return ['adventure'];
    const sectionTopics = {
      home: ['better-thinking'],
      taste: ['taste', 'tools-objects'],
      experience: ['better-thinking', 'business-building'],
      skills: ['better-thinking'],
      explore: ['personal-systems'],
      page: ['better-thinking']
    };
    return sectionTopics[sectionFor(file)] || ['better-thinking'];
  }

  function inferredSchemaTypeFor(file) {
    if (['books.html', 'essays.html', 'free-resources.html', 'products.html', 'projects.html', 'quotes.html', 'skills.html'].includes(file)) return 'CollectionPage';
    if (file.startsWith('skill-') || file === 'reading-philosophy.html' || file === 'weekly-review-template.html') return 'Article';
    return 'WebPage';
  }

  function pageTitleFor(file, html) {
    const pageSeo = seoFor(file);
    return pageSeo.title || titleFromHtml(html, file);
  }

  function pageDescriptionFor(file, html, title) {
    const pageSeo = seoFor(file);
    if (pageSeo.description) return pageSeo.description;
    return descriptionFromHtml(html, title);
  }

  function isIndexable(file) {
    return seoFor(file).index !== false;
  }

  function metaDescriptionFromHtml(html) {
    return html.match(/<meta\s+name=["']description["']\s+content="([^"]*)"/i)?.[1]?.trim()
      || html.match(/<meta\s+name=["']description["']\s+content='([^']*)'/i)?.[1]?.trim()
      || '';
  }

  return {
    seoFor,
    pageTitleFor,
    pageDescriptionFor,
    isIndexable,
    metaDescriptionFromHtml,
    titleForSeoPath,
    descriptionForSeoPath,
    prioritySeoPages
  };
}

module.exports = { createSeoHelpers };
