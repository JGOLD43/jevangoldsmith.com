function createTopicRelated({
  seo,
  topics,
  essays,
  skills,
  getPublicResources,
  getPublicProducts,
  getPublicProjects,
  stripHtml,
  titleCase
}) {
  function sitePagesForTopic(topicId) {
    return Object.entries(seo.pages || {})
      .filter(([, pageSeo]) => pageSeo.index !== false && (pageSeo.topics || []).includes(topicId))
      .map(([pathName, pageSeo]) => ({
        title: pageSeo.title || titleCase(pathName.replace(/\.html$/, '')),
        description: pageSeo.description || '',
        href: pathName
      }));
  }

  function itemMatchesTopic(item, topicId) {
    const haystack = [
      ...(item.topics || []),
      ...(item.tags || []),
      item.category,
      item.type,
      item.title,
      item.shortDescription,
      item.description
    ].filter(Boolean).map((value) => String(value).toLowerCase());
    const topic = (topics.topics || []).find((candidate) => candidate.id === topicId);
    const needles = [topicId, topic?.label].filter(Boolean).map((value) => String(value).toLowerCase());
    return needles.some((needle) => haystack.some((value) => value.includes(needle)));
  }

  function topicRelatedContent(topicId) {
    const pageMatches = sitePagesForTopic(topicId);
    const essayMatches = (essays.essays || [])
      .filter((essay) => essay.status === 'published' && itemMatchesTopic(essay, topicId))
      .slice(0, 4)
      .map((essay) => ({
        title: essay.title,
        description: stripHtml(essay.subtitle || essay.content).slice(0, 150),
        href: `essays.html#${essay.id}`
      }));
    const resourceMatches = getPublicResources()
      .filter((resource) => itemMatchesTopic(resource, topicId))
      .slice(0, 4)
      .map((resource) => ({
        title: resource.title,
        description: resource.shortDescription || resource.description,
        href: `free-resources.html#${resource.slug || resource.id}`
      }));
    const productMatches = getPublicProducts()
      .filter((product) => itemMatchesTopic(product, topicId))
      .slice(0, 4)
      .map((product) => ({
        title: product.title,
        description: product.verdict || product.shortDescription || product.description,
        href: `products.html#${product.slug || product.id}`
      }));
    const skillMatches = (skills.skills || [])
      .filter((skill) => skill.status !== 'draft' && itemMatchesTopic(skill, topicId))
      .slice(0, 4)
      .map((skill) => ({
        title: skill.title,
        description: skill.shortDescription || skill.tagline,
        href: `skill-${skill.id}.html`
      }));
    const projectMatches = getPublicProjects()
      .filter((project) => itemMatchesTopic(project, topicId))
      .slice(0, 3)
      .map((project) => ({
        title: project.title,
        description: project.shortDescription || project.description,
        href: `projects.html#${project.slug || project.id}`
      }));

    return {
      firstReads: pageMatches.slice(0, 5),
      notes: [...pageMatches.filter((item) => /field-notes|essays|reading|weekly/i.test(item.href)), ...essayMatches].slice(0, 6),
      resources: [...resourceMatches, ...pageMatches.filter((item) => /books|resources|template/i.test(item.href))].slice(0, 6),
      objects: [...skillMatches, ...projectMatches, ...productMatches].slice(0, 6)
    };
  }

  return {
    sitePagesForTopic,
    itemMatchesTopic,
    topicRelatedContent
  };
}

module.exports = { createTopicRelated };
