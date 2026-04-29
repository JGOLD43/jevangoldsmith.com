const path = require('path');

function buildPageArtifacts({
  publicHtmlFiles,
  normalizePublicHtml,
  pageTitleFor,
  seoFor,
  pageCtaFor,
  pageDescriptionFor,
  isIndexable,
  sectionFor,
  generatedFromFor,
  writeGenerated,
  site,
  lastModifiedDate,
  renderLlmsTxt
}) {
  const pages = publicHtmlFiles.map((file) => {
    const html = normalizePublicHtml(file);
    const title = pageTitleFor(file, html);
    const pageSeo = seoFor(file);
    const cta = pageCtaFor(file);
    return {
      path: file,
      url: file === 'index.html' ? '/' : `/${file}`,
      title,
      description: pageDescriptionFor(file, html, title),
      intent: pageSeo.intent || sectionFor(file),
      topics: pageSeo.topics || [],
      index: isIndexable(file),
      schemaType: pageSeo.schemaType || 'WebPage',
      primaryKeyword: pageSeo.primaryKeyword,
      secondaryKeywords: pageSeo.secondaryKeywords || [],
      audience: pageSeo.audience,
      searchIntent: pageSeo.searchIntent,
      contentDepth: pageSeo.contentDepth,
      relatedPages: pageSeo.relatedPages || [],
      lastReviewed: pageSeo.lastReviewed,
      section: sectionFor(file),
      generatedFrom: generatedFromFor(file),
      journeyStage: cta.journeyStage,
      primaryCta: cta.primaryCta,
      secondaryCtas: cta.secondaryCtas,
      ctaOptional: cta.optional || false
    };
  });

  writeGenerated(
    path.join('data', 'pages.json'),
    `${JSON.stringify(pages, null, 2)}\n`
  );

  const urls = pages.filter((page) => page.index !== false).map((page) => `  <url>
    <loc>https://${site.domain}${page.url}</loc>
    <lastmod>${lastModifiedDate(page.path)}</lastmod>
  </url>`).join('\n');
  writeGenerated('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`);

  writeGenerated('robots.txt', `User-agent: *
Allow: /

Sitemap: https://${site.domain}/sitemap.xml

AI-Agent-Index: https://${site.domain}/llms.txt
Content-API: https://${site.domain}/api/v1/index.json
`);

  writeGenerated('llms.txt', renderLlmsTxt(pages));
  return pages;
}

module.exports = {
  buildPageArtifacts
};
