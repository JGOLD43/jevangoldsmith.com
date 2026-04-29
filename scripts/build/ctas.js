function createCtaHelpers({ ctas, sectionFor, escapeHTML, escapeHtmlAttr }) {
  function pageCtaFor(file) {
    if (file.startsWith('topics/')) {
      return { path: file, journeyStage: 'orientation', primaryCta: 'newsletter', secondaryCtas: ['free-resources'] };
    }
    const page = (ctas.pages || []).find((candidate) => candidate.path === file);
    if (page) return page;

    const sectionMap = {
      home: { journeyStage: 'orientation', primaryCta: 'newsletter', secondaryCtas: ['free-resources', 'contact'] },
      taste: { journeyStage: file === 'products.html' ? 'commerce' : 'trust', primaryCta: file === 'products.html' ? 'product-recommendations' : 'free-resources', secondaryCtas: ['contact'] },
      experience: { journeyStage: 'authority', primaryCta: file === 'essays.html' ? 'best-essays' : 'search', secondaryCtas: ['free-resources', 'contact'] },
      explore: { journeyStage: 'trust', primaryCta: 'contact', secondaryCtas: ['newsletter'] },
      adventures: { journeyStage: 'trust', primaryCta: 'best-essays', secondaryCtas: ['contact'] },
      page: { journeyStage: 'orientation', primaryCta: 'newsletter', secondaryCtas: ['search'] }
    };

    return {
      path: file,
      ...(sectionMap[sectionFor(file)] || sectionMap.page)
    };
  }

  function ctaById(id) {
    return (ctas.ctas || []).find((cta) => cta.id === id);
  }

  function renderCtaLink(id, location, className = 'btn-primary') {
    const cta = ctaById(id);
    if (!cta) return '';
    return `<a href="${escapeHtmlAttr(cta.href)}" class="${escapeHtmlAttr(className)}" data-analytics="cta" data-cta-id="${escapeHtmlAttr(cta.id)}" data-cta-location="${escapeHtmlAttr(location)}">${escapeHTML(cta.label)}</a>`;
  }

  function renderPageCtas(file, location, className = 'collection-cta-row') {
    const page = pageCtaFor(file);
    const ids = [page.primaryCta, ...(page.secondaryCtas || []).slice(0, 2)].filter(Boolean);
    if (!ids.length) return '';
    return `<div class="${escapeHtmlAttr(className)}">
            ${ids.map((id, index) => renderCtaLink(id, location, index === 0 ? 'btn-primary' : 'btn-secondary')).filter(Boolean).join('\n            ')}
        </div>`;
  }

  function ctaLocationFor(file) {
    return file.replace(/\.html$/, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  }

  return {
    pageCtaFor,
    ctaById,
    renderCtaLink,
    renderPageCtas,
    ctaLocationFor
  };
}

module.exports = { createCtaHelpers };
