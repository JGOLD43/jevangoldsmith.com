const fs = require('fs');
const path = require('path');
const { collectionPageConfigFor } = require('../collection-config');

function createCollectionPageEngine({
  root,
  site,
  products,
  quotes,
  topics,
  seo,
  essays,
  skills,
  escapeHTML,
  escapeHtmlAttr,
  stripHtml,
  titleCase,
  renderDocument,
  renderNav,
  renderFooter,
  seoFor,
  renderPageCtas,
  renderShelfItem,
  renderResourceCard,
  renderProjectCard,
  renderQuoteCard,
  renderFilterControls,
  quoteCategories,
  iconSvg,
  getPublicProducts,
  getPublicResources,
  getPublicProjects,
  getPublicQuotes,
  topicForFile
}) {
  function readPartial(relativePath) {
    if (!relativePath) return '';
    const absolutePath = path.join(root, relativePath);
    if (!fs.existsSync(absolutePath)) return '';
    return fs.readFileSync(absolutePath, 'utf8').trim();
  }

  function renderAttrs(attrs = {}, extraClass = '') {
    const entries = Object.entries(attrs)
      .filter(([, value]) => value !== '' && value != null)
      .map(([key, value]) => {
        if (key === 'class') return null;
        return `${key}="${escapeHtmlAttr(String(value))}"`;
      })
      .filter(Boolean);

    const className = [attrs.class || '', extraClass].filter(Boolean).join(' ').trim();
    if (className) entries.unshift(`class="${escapeHtmlAttr(className)}"`);
    return entries.length ? ` ${entries.join(' ')}` : '';
  }

  function renderListDropdown(config) {
    if (!config?.listOptions?.length) return '';
    const actionAttr = config.listAction ? ` data-action="${escapeHtmlAttr(config.listAction)}"` : '';
    const options = config.listOptions.map((item) => {
      const attrs = renderAttrs(item.attrs || {}, item.active ? 'list-option active' : 'list-option');
      return `<a href="${escapeHtmlAttr(item.href)}"${attrs}>${escapeHTML(item.label)}</a>`;
    }).join('\n                        ');

    return `<div class="sidebar-list-selector">
                <div class="list-dropdown" id="list-dropdown">
                    <button class="list-dropdown-btn"${actionAttr}>
                        <span id="current-list-name">${escapeHTML(config.currentListName || '')}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                    <div class="list-dropdown-menu" id="list-dropdown-menu">
                        ${options}
                    </div>
                </div>
            </div>`;
  }

  function renderSearch(config) {
    if (!config?.search) return '';
    const search = config.search;
    const inputAttrs = renderAttrs({
      id: search.inputId,
      class: search.inputClass,
      placeholder: search.placeholder,
      'data-action': search.searchAction,
      'data-action-event': search.searchEvent,
      'data-action-value': search.searchUsesValue ? 'true' : ''
    }, '');
    const clearAttrs = renderAttrs({
      id: search.clearButtonId,
      'data-action': search.clearAction,
      style: 'display: none;'
    }, 'search-clear-btn');
    const wrapperClass = search.wrapperClass || 'search-input-wrapper search-bubble';

    return `<div class="sidebar-search">
                <div class="${escapeHtmlAttr(wrapperClass)}">
                    <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input type="text"${inputAttrs}>
                    <button${clearAttrs}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>`;
  }

  function renderSection(item) {
    const attrs = renderAttrs(item.attrs || {}, 'sidebar-category');
    const icon = item.icon.trim().startsWith('<') ? item.icon : escapeHTML(item.icon);
    const countIdAttr = item.countId ? ` id="${escapeHtmlAttr(item.countId)}"` : '';
    const panel = item.panelId
      ? `\n                <div class="${escapeHtmlAttr(item.panelClass || '')}" id="${escapeHtmlAttr(item.panelId)}"></div>`
      : '';

    return `<div class="sidebar-section">
                <button${attrs}${item.tooltip ? ` data-tooltip="${escapeHtmlAttr(item.tooltip)}"` : ''}>
                    <span class="category-icon"${item.tooltip ? ` title="${escapeHtmlAttr(item.label)}"` : ''}>${icon}</span>
                    <span class="category-name">${escapeHTML(item.label)}</span>
                    <span class="category-count"${countIdAttr}>${escapeHTML(item.count || '0')}</span>
                    ${item.panelId ? '<span class="expand-icon">▼</span>' : ''}
                </button>${panel}
            </div>`;
  }

  function renderSourceCollectionPage(file, view) {
    const config = collectionPageConfigFor(view);
    if (!config) return null;

    const sectionsHtml = (config.sidebar.sections || []).map(renderSection).join('\n\n                ');
    const sectionsWrapped = config.sidebar.sectionsWrapperId
      ? `<div id="${escapeHtmlAttr(config.sidebar.sectionsWrapperId)}" style="display: none;">
                ${sectionsHtml}
            </div>`
      : sectionsHtml;
    const footerHtml = config.sidebar.footerText
      ? `<div class="sidebar-footer"${config.sidebar.footerId ? ` id="${escapeHtmlAttr(config.sidebar.footerId)}"` : ''}${config.sidebar.footerHidden ? ' style="display: none;"' : ''}>
                <p>${escapeHTML(config.sidebar.footerText)}</p>
            </div>`
      : '';
    const subtitleHtml = config.main.subtitleHtml
      ? config.main.subtitleHtml
      : (config.main.subtitleText ? `<p class="header-subtitle">${escapeHTML(config.main.subtitleText)}</p>` : '');
    const extraHeaderHtml = readPartial(config.main.headerExtraPath);
    const counterExtraHtml = readPartial(config.main.counterExtraPath);
    const bodyHtml = config.main.bodyHtml || readPartial(config.main.bodyPath);
    const afterMainHtml = readPartial(config.afterMainPath);
    const counterInnerHtml = `${counterExtraHtml}
                    <div class="header-counter collection-header-counter">
                        <span class="counter-number collection-counter-number" id="${escapeHtmlAttr(config.main.counterId)}">0</span>
                        <span class="counter-label collection-counter-label"${config.main.counterLabelId ? ` id="${escapeHtmlAttr(config.main.counterLabelId)}"` : ''}>${escapeHTML(config.main.counterLabel)}</span>
                    </div>`;
    const renderedCounter = config.main.counterGroupClass
      ? `<div class="${escapeHtmlAttr(config.main.counterGroupClass)}">${counterInnerHtml}</div>`
      : counterInnerHtml;

    return renderCollectionPage(file, {
      title: config.title,
      description: config.description,
      bodyClass: config.bodyClass,
      scripts: config.scripts,
      main: `<main class="${escapeHtmlAttr(config.layout.className)}" id="${escapeHtmlAttr(config.layout.id)}">
        <aside class="${escapeHtmlAttr(config.sidebar.className)}" id="${escapeHtmlAttr(config.sidebar.id)}">
            <div class="sidebar-header">
                <button class="sidebar-collapse-btn"${config.sidebar.collapseAction ? ` data-action="${escapeHtmlAttr(config.sidebar.collapseAction)}"` : ''} title="Collapse sidebar">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="9" y1="3" x2="9" y2="21"></line>
                    </svg>
                </button>
                <span class="sidebar-browse-label">Browse</span>
            </div>
            ${renderListDropdown(config.sidebar)}
            ${renderSearch(config.sidebar)}
            ${readPartial(config.sidebar.extraPath)}
            ${config.sidebar.loadingMessage ? `<div id="loading-sidebar" class="loading" style="padding: 1rem;"><p style="font-size: 0.85rem;">${escapeHTML(config.sidebar.loadingMessage)}</p></div>` : ''}
            ${sectionsWrapped}
            ${footerHtml}
        </aside>

        <div class="${escapeHtmlAttr(config.main.className)}">
            <header class="main-header collection-header">
                <div class="header-content">
                    <${config.main.titleTag || 'h1'}>${escapeHTML(config.main.title)}</${config.main.titleTag || 'h1'}>
                    ${subtitleHtml}
                </div>
                ${extraHeaderHtml}
                ${renderedCounter}
            </header>
            ${bodyHtml}
        </div>
        ${afterMainHtml}
    </main>`
    });
  }

  function renderCollectionPage(file, options) {
    return renderCollectionDocument({
      ...options,
      nav: renderNav(file),
      footer: renderFooter(file)
    });
  }

  function renderCollectionDocument({
    title,
    description,
    nav,
    footer,
    main,
    scripts = '<script src="js/theme.js"></script>',
    baseHref = '',
    bodyClass = ''
  }) {
    return renderDocument({
      title,
      description,
      nav,
      main,
      footer,
      scripts,
      baseHref,
      bodyAttributes: bodyClass ? `class="${escapeHtmlAttr(bodyClass)}"` : ''
    });
  }

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

  function renderTopicSection(title, items) {
    if (!items.length) return '';
    return `<section class="resources-section topic-hub-section">
            <p class="section-eyebrow">${escapeHTML(title)}</p>
            <div class="topic-link-grid">
                ${items.map((item) => `<a class="topic-link-card" href="${escapeHtmlAttr(item.href)}">
                    <span>${escapeHTML(item.title)}</span>
                    <p>${escapeHTML(item.description || '')}</p>
                </a>`).join('\n                ')}
            </div>
        </section>`;
  }

  function renderTopicPage(file) {
    const topic = topicForFile(file);
    if (!topic) return null;
    const topicSeo = seoFor(file);
    const related = topicRelatedContent(topic.id);
    return renderCollectionDocument({
      title: `${topicSeo.title} - ${site.siteName}`,
      description: topicSeo.description || topic.description,
      nav: renderNav(file),
      footer: renderFooter(file),
      baseHref: '../',
      main: `<main class="resources-content topic-hub-page">
        <section class="resources-intro topic-hub-hero">
            <p class="resources-eyebrow">Topic Hub</p>
            <h1 class="resources-title">${escapeHTML(topic.label)}</h1>
            <p class="resources-subtitle">${escapeHTML(topicSeo.thesis || topic.description)}</p>
            ${renderPageCtas(file, `topic-${topic.id}`)}
        </section>

        ${renderTopicSection('Best first reads', related.firstReads)}
        ${renderTopicSection('Field Notes and essays', related.notes)}
        ${renderTopicSection('Books and resources', related.resources)}
        ${renderTopicSection('Skills, projects, and objects', related.objects)}

        <section class="resources-section topic-subscribe">
            <p class="section-eyebrow">Field Notes</p>
            <h2 class="section-title">Follow this thread</h2>
            <p class="section-text">I send the useful pieces before they become polished essays: books, tools, questions, experiments, and notes worth keeping.</p>
            <a href="field-notes.html" class="btn-primary" data-analytics="cta" data-cta-id="newsletter" data-cta-location="topic-${escapeHtmlAttr(topic.id)}">Get Field Notes</a>
        </section>
    </main>`
    });
  }

  function renderProductsPage(file) {
    const publishedProducts = getPublicProducts();
    const filters = [{ id: 'all', title: 'All' }, ...((products && products.productCategories) || [])];

    return renderCollectionPage(file, {
      title: `The Shelf - ${site.siteName}`,
      description: 'Objects, tools, and products that earned a place in Jevan Goldsmith\'s life.',
      bodyClass: 'shelf-experience nav-compact',
      scripts: '<script src="js/theme.js"></script>\n    <script src="js/grid-zoom.js"></script>\n    <script src="js/shelf.js"></script>',
      main: `<main class="shelf-page">
        <h1 class="sr-only">The Shelf: Tools, Objects &amp; Gear That Earned Their Place</h1>

        <div class="shelf-filter" data-shelf-filter aria-label="Shelf filters">
            ${filters.map((filter, index) => `<button type="button" class="${index === 0 ? 'active' : ''}" data-shelf-category="${escapeHtmlAttr(filter.id)}">${escapeHTML(filter.title)}</button>`).join('\n            ')}
        </div>

        <section class="shelf-grid" aria-label="Objects on the shelf">
            ${publishedProducts.map((product, index) => renderShelfItem(product, index)).join('\n            ')}
        </section>

        <div class="shelf-disclosure">
            <p>No paid placements. Some links may eventually be affiliate links, but the rule is simple: only things I actually use or would recommend to a friend.</p>
        </div>
    </main>`
    });
  }

  function renderResourcesPage(file) {
    const publishedResources = getPublicResources();

    return renderCollectionPage(file, {
      title: `Useful Resources - ${site.siteName}`,
      description: 'Guides, templates, and tools from Jevan Goldsmith for thinking better, working smarter, and living well.',
      main: `<main class="resources-content">
        <section class="resources-intro">
            <p class="resources-eyebrow">Useful Resources</p>
            <h1 class="resources-title">Practical artifacts from the archive.</h1>
            <p class="resources-subtitle">Templates, guides, and tools I use or am shaping into something useful. Start with the weekly review.</p>
            ${renderPageCtas(file, 'resources-hero')}
        </section>

        <div class="resources-grid">
            ${publishedResources.map(renderResourceCard).join('\n            ')}
        </div>

        <section class="resources-section">
            <p class="section-eyebrow">Philosophy</p>
            <h2 class="section-title">Why Free?</h2>
            <p class="section-text">I create these resources because organizing my own thinking makes the thinking better. If they help others along the way, that is the whole point. No fake scarcity, no hard sell, just useful tools available to anyone who wants them.</p>
        </section>

        <section class="resources-section">
            <p class="section-eyebrow">Suggestions</p>
            <h2 class="section-title">Request a Resource</h2>
            <div class="request-card">
                <div class="request-icon">${iconSvg('message')}</div>
                <div class="request-content">
                    <h4>Have an idea?</h4>
                    <p>If there's a template, guide, or tool you'd find useful, let me know. I'm always looking for ways to create practical resources.</p>
                    <a href="contact.html" class="request-link" data-analytics="cta" data-cta-id="contact" data-cta-location="resources-request">
                        Send a suggestion
                        ${iconSvg('arrow')}
                    </a>
                </div>
            </div>
        </section>
    </main>`
    });
  }

  function renderProjectsPage(file) {
    const publishedProjects = getPublicProjects();
    const total = publishedProjects.length;

    const statusCounts = { active: 0, completed: 0, planned: 0 };
    const categoryCounts = new Map();
    for (const project of publishedProjects) {
      const status = (project.status || 'planned').toLowerCase();
      if (statusCounts[status] !== undefined) statusCounts[status] += 1;
      const category = (project.category || '').toLowerCase();
      if (category) categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    }

    const statusMeta = {
      active: { label: 'Active', emoji: '⚡' },
      completed: { label: 'Completed', emoji: '✅' },
      planned: { label: 'Planned', emoji: '📋' }
    };

    const categoryMetaFor = (category) => {
      const meta = {
        software: { label: 'Software', emoji: '💻' },
        research: { label: 'Research', emoji: '📚' },
        ai: { label: 'AI', emoji: '🤖' },
        writing: { label: 'Writing', emoji: '✍️' },
        'real-estate': { label: 'Real Estate', emoji: '🏠' },
        finance: { label: 'Finance', emoji: '💰' }
      };

      return meta[(category || '').toLowerCase()] || {
        label: titleCase(category || 'General'),
        emoji: '🛠️'
      };
    };

    const statusButtons = ['active', 'completed', 'planned'].map((status) => {
      const meta = statusMeta[status];
      return `<div class="sidebar-section">
                <button class="sidebar-category" data-action="filterProjects" data-action-args="${status}" data-action-this="true" data-tooltip="${escapeHtmlAttr(meta.label)}">
                    <span class="category-icon">${meta.emoji}</span>
                    <span class="category-name">${escapeHTML(meta.label)}</span>
                    <span class="category-count" id="count-${status}">${statusCounts[status]}</span>
                </button>
            </div>`;
    }).join('\n            ');

    const categoryButtons = Array.from(categoryCounts.keys())
      .sort()
      .map((category) => {
        const meta = categoryMetaFor(category);
        return `<div class="sidebar-section">
                <button class="sidebar-category" data-action="filterProjects" data-action-args="${escapeHtmlAttr(category)}" data-action-this="true" data-tooltip="${escapeHtmlAttr(meta.label)}">
                    <span class="category-icon">${meta.emoji}</span>
                    <span class="category-name">${escapeHTML(meta.label)}</span>
                    <span class="category-count" id="count-cat-${escapeHtmlAttr(category)}">${categoryCounts.get(category)}</span>
                </button>
            </div>`;
      }).join('\n            ');

    return renderCollectionPage(file, {
      title: `Projects - ${site.siteName}`,
      description: 'Projects Jevan Goldsmith is building, exploring, and planning.',
      bodyClass: 'nav-compact',
      scripts: '<script src="js/grid-zoom.js"></script>\n    <script src="js/action-dispatcher.js"></script>\n    <script src="js/projects.js"></script>\n    <script src="js/theme.js"></script>\n    <script src="js/analytics.js"></script>',
      main: `<main class="movies-layout sidebar-collapsed" id="projects-layout">
        <aside class="movies-sidebar collapsed" id="projects-sidebar">
            <div class="sidebar-header">
                <button class="sidebar-collapse-btn" data-action="toggleProjectSidebar" title="Collapse sidebar">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="9" y1="3" x2="9" y2="21"></line>
                    </svg>
                </button>
                <span class="sidebar-browse-label">Browse</span>
            </div>

            <div class="sidebar-list-selector">
                <div class="list-dropdown" id="list-dropdown">
                    <button class="list-dropdown-btn" data-action="toggleProjectListDropdown">
                        <span id="current-list-name">Projects</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                    <div class="list-dropdown-menu" id="list-dropdown-menu">
                        <a href="projects.html" class="list-option active">Projects</a>
                        <a href="challenges.html" class="list-option">Challenges</a>
                        <a href="free-resources.html" class="list-option">Resources</a>
                        <a href="lesson-logger.html" class="list-option">Lesson Logger</a>
                    </div>
                </div>
            </div>

            <div class="sidebar-search">
                <div class="search-input-wrapper search-bubble">
                    <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input type="text" id="project-search" class="movie-search-input" placeholder="Search projects..." data-action="searchProjects" data-action-event="input" data-action-value="true">
                    <button class="search-clear-btn" id="project-search-clear-btn" data-action="clearProjectSearch" style="display: none;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>

            <div class="sidebar-section">
                <button class="sidebar-category active" data-action="filterProjects" data-action-args="all" data-action-this="true" data-tooltip="All Projects">
                    <span class="category-icon">🎯</span>
                    <span class="category-name">All Projects</span>
                    <span class="category-count" id="count-all-projects">${total}</span>
                </button>
            </div>

            ${statusButtons}

            ${categoryButtons}

            <div class="sidebar-footer">
                <p>Things I am building, exploring, and planning</p>
            </div>
        </aside>

        <div class="movies-main">
            <header class="main-header">
                <div class="header-content">
                    <h1>Projects</h1>
                    <p>Things I am building, exploring, and learning in public.</p>
                </div>
                <div class="header-counter">
                    <span class="counter-number" id="project-count">${total}</span>
                    <span class="counter-label">Projects</span>
                </div>
            </header>

            <div id="projects-container" class="movies-grid">
                ${publishedProjects.map(renderProjectCard).join('\n                ')}
            </div>
        </div>
    </main>`
    });
  }

  function renderQuotesPage(file) {
    const publishedQuotes = getPublicQuotes();
    const categories = quoteCategories(publishedQuotes);
    const featured = quotes?.featuredQuote || {
      text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.',
      author: 'Aristotle (via Will Durant)'
    };

    return renderCollectionPage(file, {
      title: `Quotes - ${site.siteName}`,
      description: 'Quotes and ideas that have shaped how Jevan Goldsmith thinks about life, business, growth, and decision-making.',
      scripts: '<script src="js/theme.js"></script>\n    <script src="js/collection-filters.js"></script>',
      main: `<main>
        <section class="quotes-hero">
            <h1>Words That Shaped My Thinking</h1>
            <p>A collection of quotes that have influenced how I see the world, make decisions, and approach life. These are ideas I return to regularly.</p>
        </section>

        <section class="featured-quote">
            <blockquote>&ldquo;${escapeHTML(featured.text)}&rdquo;</blockquote>
            ${featured.author ? `<cite>- ${escapeHTML(featured.author)}</cite>` : ''}
        </section>

        ${renderFilterControls('quotes', [{ id: 'all', label: 'All Quotes' }, ...categories], 'category')}

        <div class="quotes-container">
            <div class="quotes-grid" id="quotes-grid">
                ${publishedQuotes.map(renderQuoteCard).join('\n                ')}
            </div>
        </div>

        <div class="submit-quote-section">
            <h2>Share a Quote</h2>
            <p>Have a quote that changed how you think? I'd love to hear it.</p>
            <a href="contact.html" class="btn-primary">
                ${iconSvg('send')}
                Send me a quote
            </a>
        </div>
    </main>`
    });
  }

  return {
    render({ file, entry }) {
      const configuredCollection = renderSourceCollectionPage(file, entry.engineView);
      if (configuredCollection) return configuredCollection;
      if (entry.engineView === 'topic') return renderTopicPage(file);
      if (entry.engineView === 'products') return renderProductsPage(file);
      if (entry.engineView === 'resources') return renderResourcesPage(file);
      if (entry.engineView === 'projects') return renderProjectsPage(file);
      if (entry.engineView === 'quotes') return renderQuotesPage(file);
      return null;
    }
  };
}

module.exports = {
  createCollectionPageEngine
};
