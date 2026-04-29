function publicProjects(projects) {
  return (projects.projects || []).filter((project) => project.status !== 'draft' && project.status !== 'retired');
}

function publicChallenges(challenges) {
  return (challenges.challenges || []).filter((challenge) => challenge.status !== 'draft' && challenge.status !== 'retired');
}

function publicQuotes(quotes) {
  return (quotes.fullQuotes || []).filter((quote) => quote.status !== 'draft' && quote.status !== 'retired');
}

function publicProducts(products) {
  return (products.products || []).filter((product) => product.status !== 'draft' && product.status !== 'retired');
}

function publicResources(products) {
  return (products.resources || []).filter((resource) => resource.status !== 'draft' && resource.status !== 'retired');
}

function titleCase(value) {
  const acronyms = {
    ai: 'AI',
    api: 'API',
    qa: 'QA'
  };

  return String(value || '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w+\b/g, (word) => acronyms[word.toLowerCase()] || word.charAt(0).toUpperCase() + word.slice(1));
}

module.exports = {
  publicProjects,
  publicChallenges,
  publicQuotes,
  publicProducts,
  publicResources,
  titleCase
};
