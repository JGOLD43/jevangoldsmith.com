function createPageEnhancements({
  adventures,
  books,
  ctas,
  essays,
  getPublicProjects,
  getPublicResources,
  seoFor,
  titleForSeoPath,
  descriptionForSeoPath,
  ctaLocationFor,
  remoteAssetFor,
  escapeHTML,
  escapeHtmlAttr
}) {
  function injectAnalyticsScript(html) {
    if (!html.includes('</body>') || html.includes('js/analytics.js')) return html;
    return html.replace('</body>', '    <script src="js/analytics.js"></script>\n</body>');
  }

  function injectHomeStats(html) {
    const counts = {
      essays: (essays.essays || []).filter((essay) => essay.status === 'published').length,
      books: books.length,
      projects: getPublicProjects().length,
      resources: getPublicResources().length
    };
    return html.replace(
      /<span class="stat-number" data-home-stat="([a-z]+)">[^<]*<\/span>/g,
      (match, key) => Object.prototype.hasOwnProperty.call(counts, key)
        ? `<span class="stat-number" data-home-stat="${key}">${counts[key]}</span>`
        : match
    );
  }

  function formatAdventureDateRange(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const opts = { month: 'short', year: 'numeric' };
    if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
      return startDate.toLocaleDateString('en-US', opts);
    }
    if (startDate.getFullYear() === endDate.getFullYear()) {
      return `${startDate.toLocaleDateString('en-US', { month: 'short' })} - ${endDate.toLocaleDateString('en-US', opts)}`;
    }
    return `${startDate.toLocaleDateString('en-US', opts)} - ${endDate.toLocaleDateString('en-US', opts)}`;
  }

  function injectAdventureListing(html) {
    const cards = (adventures.adventures || [])
      .filter((adventure) => adventure.status === 'published')
      .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
      .map((adventure) => {
        const heroLocal = remoteAssetFor(adventure.heroImage, 800);
        const dateLabel = formatAdventureDateRange(adventure.startDate, adventure.endDate);
        const meta = [dateLabel, adventure.duration].filter(Boolean).join(' · ');
        return `<div class="adventure-compact-card" id="card-${escapeHtmlAttr(adventure.id)}" data-adventure-id="${escapeHtmlAttr(adventure.id)}">
                    <img src="${escapeHtmlAttr(heroLocal)}" alt="${escapeHtmlAttr(adventure.title)}" class="adventure-compact-image" width="800" height="533" loading="lazy" decoding="async">
                    <div class="adventure-compact-info">
                        <div class="adventure-compact-location">${escapeHTML(adventure.location)}</div>
                        <h3 class="adventure-compact-title">${escapeHTML(adventure.title)}</h3>
                        <div class="adventure-compact-meta">${escapeHTML(meta)}</div>
                    </div>
                </div>`;
      })
      .join('\n                ');
    return html.replace('<!-- ADVENTURES_LIST -->', `\n                ${cards}\n            `);
  }

  function injectFieldNotesCta(file, html) {
    const eligible = file === 'essays.html' || file === 'reading-philosophy.html';
    if (!eligible || html.includes('data-field-notes-inline')) return html;
    const location = escapeHtmlAttr(file.replace(/\.html$/, ''));
    const block = `<section class="field-notes-inline-cta" data-field-notes-inline>
        <p class="archive-kicker">Field Notes</p>
        <h2>Want more notes like this?</h2>
        <p>Field Notes is where I send useful ideas before they become polished essays: books, objects, questions, and experiments worth keeping.</p>
        <a href="field-notes.html" class="btn-primary" data-analytics="cta" data-cta-id="newsletter" data-cta-location="${location}-inline">Get Field Notes</a>
    </section>`;
    return html.replace('</main>', `    ${block}\n</main>`);
  }

  function injectRelatedInternalLinks(file, html) {
    let nextHtml = html.replace(/\n?\s*<section class=["']seo-related-section["'] data-seo-related>[\s\S]*?<\/section>\n*/gi, '\n');
    const pageSeo = seoFor(file);
    if (pageSeo.index === false || pageSeo.contentDepth === 'utility') return nextHtml;
    const related = (pageSeo.relatedPages || [])
      .filter((href) => href !== file)
      .map((href) => ({ href, title: titleForSeoPath(href), description: descriptionForSeoPath(href) }))
      .filter((item) => item.title && item.href)
      .slice(0, 4);
    if (related.length < 2) return nextHtml;

    const cards = related.map((item) => `<a class="seo-related-card" href="${escapeHtmlAttr(item.href)}">
                <span>${escapeHTML(item.title)}</span>
                <p>${escapeHTML(item.description)}</p>
            </a>`).join('\n            ');
    const section = `<section class="seo-related-section" data-seo-related>
        <p class="seo-related-eyebrow">Related thread</p>
        <h2>Keep exploring this idea</h2>
        <p class="seo-related-intro">A few adjacent notes and pages that connect this topic to the wider archive. These links are chosen from shared topics and intent, so each page leads toward a more specific skill, resource, essay, or collection instead of sending you back through generic navigation. Follow the thread that best matches what you are trying to learn next.</p>
        <div class="seo-related-grid">
            ${cards}
        </div>
    </section>`;
    if (nextHtml.includes('</main>')) return nextHtml.replace('</main>', `    ${section}\n</main>`);
    if (nextHtml.includes('<footer class="footer"')) return nextHtml.replace('<footer class="footer"', `${section}\n\n    <footer class="footer"`);
    return nextHtml.replace('</body>', `    ${section}\n</body>`);
  }

  function decorateTrackedLinks(file, html) {
    const ctaByHref = new Map((ctas.ctas || []).map((cta) => [cta.href, cta]));
    return html.replace(/<a\b([^>]*?)href=(["'])([^"']+)\2([^>]*)>/gi, (match, before, quote, href, after) => {
      if (/data-analytics=/.test(match)) return match;
      const location = ctaLocationFor(file);
      const cta = ctaByHref.get(href);
      if (cta) return `<a${before}href=${quote}${href}${quote}${after} data-analytics="cta" data-cta-id="${escapeHtmlAttr(cta.id)}" data-cta-location="${escapeHtmlAttr(location)}">`;
      if (/^mailto:/i.test(href) || href.includes('contact.html') || href.includes('meet.html')) {
        return `<a${before}href=${quote}${href}${quote}${after} data-analytics="contact" data-cta-location="${escapeHtmlAttr(location)}">`;
      }
      return match;
    });
  }

  return {
    decorateTrackedLinks,
    formatAdventureDateRange,
    injectAdventureListing,
    injectAnalyticsScript,
    injectFieldNotesCta,
    injectHomeStats,
    injectRelatedInternalLinks
  };
}

module.exports = { createPageEnhancements };
