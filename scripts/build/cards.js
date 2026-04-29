const PROJECT_CATEGORY_META = {
  software: { label: 'Software', emoji: '💻', placeholder: 'placeholder-software' },
  research: { label: 'Research', emoji: '📚', placeholder: 'placeholder-research' },
  ai: { label: 'AI', emoji: '🤖', placeholder: 'placeholder-ai' },
  writing: { label: 'Writing', emoji: '✍️', placeholder: 'placeholder-writing' },
  'real-estate': { label: 'Real Estate', emoji: '🏠', placeholder: 'placeholder-real-estate' },
  finance: { label: 'Finance', emoji: '💰', placeholder: 'placeholder-finance' }
};

const PROJECT_STATUS_META = {
  active: { label: 'Active', emoji: '⚡' },
  completed: { label: 'Completed', emoji: '✅' },
  planned: { label: 'Planned', emoji: '📋' }
};

const CHALLENGE_CATEGORY_META = {
  learning: { label: 'Learning', emoji: '📚', placeholder: 'placeholder-learning' },
  fitness: { label: 'Fitness', emoji: '💪', placeholder: 'placeholder-fitness' },
  creative: { label: 'Creative', emoji: '✍️', placeholder: 'placeholder-creative' },
  financial: { label: 'Financial', emoji: '💰', placeholder: 'placeholder-financial' }
};

const CHALLENGE_STATUS_META = {
  active: { label: 'Active', emoji: '⚡' },
  upcoming: { label: 'Upcoming', emoji: '📋' },
  completed: { label: 'Completed', emoji: '✅' }
};

const PRODUCT_ICON_GLYPHS = {
  backpack: '🎒',
  barbell: '🏋',
  display: '🖥',
  headphones: '🎧',
  keyboard: '⌨',
  laptop: '💻',
  notebook: '📓',
  phone: '📱',
  pill: '💊',
  plug: '🔌',
  suitcase: '🧳',
  watch: '⌚'
};

const ICON_SVGS = {
  arrow: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
  book: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  calendar: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  bars: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  bolt: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  brain: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a8 8 0 0 0-8 8c0 3.5 2 6 4 8l1 4h6l1-4c2-2 4-4.5 4-8a8 8 0 0 0-8-8z"/><line x1="12" y1="2" x2="12" y2="8"/><line x1="8" y1="8" x2="16" y2="8"/></svg>',
  clock: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  dollar: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  edit: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>',
  file: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>',
  flask: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3h6v6l3 9H6l3-9V3z"/><line x1="6" y1="21" x2="18" y2="21"/><circle cx="12" cy="15" r="1"/></svg>',
  globe: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  graduation: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
  grid: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>',
  heart: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  lightbulb: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>',
  bag: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l1 13H5L6 8z"/><path d="M9 8V5a3 3 0 0 1 6 0v3"/></svg>',
  megaphone: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>',
  message: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  monitor: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
  openBook: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  question: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  send: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
  star: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  target: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  user: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  users: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  external: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
  github: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.5 11.5 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>'
};

const STATUS_LABELS = {
  active: 'Active',
  available: 'Available',
  completed: 'Completed',
  planned: 'Planned',
  preview: 'Preview'
};

function createCards({ fs, path, root, products, escapeHTML, escapeHtmlAttr, titleCase }) {
  function iconSvg(name) {
    return ICON_SVGS[name] || ICON_SVGS.file;
  }

  function productIcon(icon) {
    return PRODUCT_ICON_GLYPHS[icon] || '•';
  }

  function statusLabel(status) {
    return STATUS_LABELS[status] || titleCase(status);
  }

  function projectCategoryMeta(category) {
    const key = (category || '').toLowerCase();
    return PROJECT_CATEGORY_META[key] || {
      label: titleCase(category || 'General'),
      emoji: '🛠️',
      placeholder: 'placeholder-software'
    };
  }

  function challengeCategoryMeta(category) {
    const key = (category || '').toLowerCase();
    return CHALLENGE_CATEGORY_META[key] || {
      label: titleCase(category || 'General'),
      emoji: '🎯',
      placeholder: 'placeholder-learning'
    };
  }

  function generatedProductImageAsset(slug) {
    if (!slug) return null;
    const widths = [240, 400, 640, 800];
    for (const ext of ['jpg', 'png']) {
      const candidate = `images/generated/products/${slug}-640.${ext}`;
      if (!fs.existsSync(path.join(root, candidate))) continue;
      return {
        src: candidate,
        srcset: widths
          .filter((width) => fs.existsSync(path.join(root, `images/generated/products/${slug}-${width}.${ext}`)))
          .map((width) => `images/generated/products/${slug}-${width}.${ext} ${width}w`)
          .join(', '),
        sizes: '(max-width: 768px) 78vw, 320px',
        width: 800,
        height: 800
      };
    }
    return null;
  }

  function productImageAsset(product) {
    if (!product) return null;
    const slug = product.slug || product.id;
    const generated = generatedProductImageAsset(slug);
    if (generated) return generated;
    if (product.image && fs.existsSync(path.join(root, product.image))) {
      return {
        src: product.image,
        srcset: '',
        sizes: '',
        width: 800,
        height: 800
      };
    }
    for (const ext of ['.jpg', '.jpeg', '.png', '.webp']) {
      const rel = `images/products/${slug}${ext}`;
      if (fs.existsSync(path.join(root, rel))) {
        return {
          src: rel,
          srcset: '',
          sizes: '',
          width: 800,
          height: 800
        };
      }
    }
    return null;
  }

  function quoteCategories(items) {
    return Array.from(new Set(items.map((quote) => quote.category).filter(Boolean)))
      .sort()
      .map((category) => ({ id: category, label: titleCase(category) }));
  }

  function renderShelfItem(product, index = 0) {
    const verdict = product.verdict || product.shortDescription || product.description || '';
    const why = product.whyItStayed || product.description || product.shortDescription || '';
    const how = product.howIUseIt || product.usage || '';
    const replaced = product.replaced || '';
    const brand = product.brand || '';
    const checkoutUrl = product.checkoutUrl || '';
    const productImage = productImageAsset(product);
    const markContent = productImage
      ? `<img class="shelf-object-photo" src="${escapeHtmlAttr(productImage.src)}"${productImage.srcset ? ` srcset="${escapeHtmlAttr(productImage.srcset)}"` : ''}${productImage.sizes ? ` sizes="${escapeHtmlAttr(productImage.sizes)}"` : ''} alt="${escapeHtmlAttr(product.title)}" width="${escapeHtmlAttr(String(productImage.width || 800))}" height="${escapeHtmlAttr(String(productImage.height || 800))}" loading="lazy" decoding="async">`
      : escapeHTML(productIcon(product.icon));
    return `<article class="shelf-item" id="${escapeHtmlAttr(product.slug || product.id)}" data-shelf-card data-category="${escapeHtmlAttr(product.category)}" style="--shelf-index: ${index}">
                <button class="shelf-object" type="button"
                    data-shelf-item
                    data-id="${escapeHtmlAttr(product.id)}"
                    data-title="${escapeHtmlAttr(product.title)}"
                    data-brand="${escapeHtmlAttr(brand)}"
                    data-category="${escapeHtmlAttr(titleCase(product.category))}"
                    data-verdict="${escapeHtmlAttr(verdict)}"
                    data-why="${escapeHtmlAttr(why)}"
                    data-how="${escapeHtmlAttr(how)}"
                    data-replaced="${escapeHtmlAttr(replaced)}"
                    data-usage="${escapeHtmlAttr(product.usage || '')}"
                    data-icon="${escapeHtmlAttr(productIcon(product.icon))}"
                    data-image="${escapeHtmlAttr(productImage?.src || '')}"
                    data-related="${escapeHtmlAttr((product.relatedContent || []).join('|'))}"
                    data-link="${escapeHtmlAttr(checkoutUrl)}">
                    <span class="shelf-object-stage${productImage ? ' has-photo' : ''}" aria-hidden="true">
                        <span class="shelf-object-mark">${markContent}</span>
                    </span>
                    ${product.badge ? `<span class="shelf-badge">${escapeHTML(product.badge)}</span>` : ''}
                    <span class="shelf-object-name">${escapeHTML(product.title)}</span>
                    <span class="shelf-object-verdict">${escapeHTML(verdict)}</span>
                </button>
                <div class="shelf-object-detail" aria-hidden="true">
                    ${brand ? `<p class="shelf-object-detail-brand">${escapeHTML(brand)}</p>` : ''}
                    <p class="shelf-object-detail-verdict">${escapeHTML(verdict)}</p>
                    ${why ? `<p class="shelf-object-detail-line"><span>Why it stayed —</span> ${escapeHTML(why)}</p>` : ''}
                    ${how ? `<p class="shelf-object-detail-line"><span>How I use it —</span> ${escapeHTML(how)}</p>` : ''}
                    ${replaced ? `<p class="shelf-object-detail-line"><span>Replaced —</span> ${escapeHTML(replaced)}</p>` : ''}
                    ${checkoutUrl ? `<a class="shelf-object-detail-link" href="${escapeHtmlAttr(checkoutUrl)}" target="_blank" rel="noopener noreferrer">Find it</a>` : ''}
                </div>
            </article>`;
  }

  function renderResourceCard(resource) {
    const category = (products.resourceCategories || []).find((candidate) => candidate.id === resource.category);
    const href = resource.downloadUrl || resource.checkoutUrl || '';
    const cta = href
      ? `<a href="${escapeHtmlAttr(href)}" class="resource-link" data-analytics="resource" data-resource-id="${escapeHtmlAttr(resource.id)}" data-cta-location="resource-card">${escapeHTML(resource.ctaLabel || 'Download')}${iconSvg('arrow')}</a>`
      : `<a href="contact.html?subject=${escapeHtmlAttr(encodeURIComponent(`Resource interest: ${resource.title}`))}" class="resource-link" data-analytics="cta" data-cta-id="contact" data-cta-location="resource-card">${escapeHTML(resource.ctaLabel === 'Coming Soon' ? 'Tell me you want this' : resource.ctaLabel || 'Tell me you want this')}${iconSvg('arrow')}</a>`;

    return `<article class="resource-card" id="${escapeHtmlAttr(resource.slug || resource.id)}">
                <div class="resource-icon">${iconSvg(category?.icon || 'file')}</div>
                <p class="resource-category">${escapeHTML(category?.title || resource.category || resource.type)}</p>
                <h3 class="resource-title">${escapeHTML(resource.title)}</h3>
                <p class="resource-description">${escapeHTML(resource.shortDescription || resource.description)}</p>
                ${cta}
            </article>`;
  }

  function renderProjectCard(project) {
    const status = (project.status || 'planned').toLowerCase();
    const category = (project.category || '').toLowerCase();
    const meta = projectCategoryMeta(category);
    const statusLabelText = (PROJECT_STATUS_META[status] && PROJECT_STATUS_META[status].label) || statusLabel(status);
    const description = project.shortDescription || project.description || '';
    const searchTerms = [
      project.title,
      project.shortDescription,
      project.description,
      meta.label,
      statusLabelText,
      ...(project.tags || []),
      ...(project.technologies || []),
      ...(project.topics || [])
    ].filter(Boolean).join(' ');
    const dataCategory = [status, category].filter(Boolean).join(' ');

    return `<div class="movie-card project-card js-zoom-item" data-status="${escapeHtmlAttr(status)}" data-category="${escapeHtmlAttr(dataCategory)}" data-search="${escapeHtmlAttr(searchTerms)}" id="${escapeHtmlAttr(project.slug || project.id)}">
                    <div class="movie-poster-wrapper">
                        <div class="podcast-cover-placeholder ${meta.placeholder}">${meta.emoji}</div>
                    </div>
                    <div class="movie-info">
                        <div class="times-read-badge movie-watch-badge status-${escapeHtmlAttr(status)}">${escapeHTML(statusLabelText)}</div>
                        <div class="movie-title-row">
                            <h3 class="movie-title">${escapeHTML(project.title)}</h3>
                        </div>
                        <div class="podcast-category-badge">${escapeHTML(meta.label)}</div>
                        <p class="movie-description">${escapeHTML(description)}</p>
                    </div>
                </div>`;
  }

  function renderChallengeCard(challenge) {
    const status = (challenge.status || 'upcoming').toLowerCase();
    const category = (challenge.category || '').toLowerCase();
    const meta = challengeCategoryMeta(category);
    const statusMeta = CHALLENGE_STATUS_META[status] || { label: titleCase(status) };
    const description = challenge.shortDescription || challenge.description || '';
    const timeframe = challenge.timeframe || '';
    const categoryLine = [meta.label, timeframe].filter(Boolean).join(' · ');
    const searchTerms = [
      challenge.title,
      challenge.shortDescription,
      challenge.description,
      meta.label,
      statusMeta.label,
      timeframe,
      ...(challenge.tags || []),
      ...(challenge.searchTerms || [])
    ].filter(Boolean).join(' ');
    const dataCategory = [status, category].filter(Boolean).join(' ');
    const progress = challenge.progress;
    const progressHtml = progress
      ? `<div class="challenge-progress">
                            <div class="progress-header">
                                <span class="progress-label">${escapeHTML(progress.label || 'Progress')}</span>
                                <span class="progress-value">${escapeHTML(progress.value || '')}</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${Number(progress.percent) || 0}%;"></div>
                            </div>
                        </div>`
      : '';

    const icon = challenge.icon || meta.emoji;

    return `<div class="movie-card challenge-card js-zoom-item" data-status="${escapeHtmlAttr(status)}" data-category="${escapeHtmlAttr(dataCategory)}" data-search="${escapeHtmlAttr(searchTerms)}" id="${escapeHtmlAttr(challenge.slug || challenge.id)}">
                    <div class="movie-poster-wrapper">
                        <div class="podcast-cover-placeholder ${meta.placeholder}">${icon}</div>
                    </div>
                    <div class="movie-info">
                        <div class="times-read-badge movie-watch-badge status-${escapeHtmlAttr(status)}">${escapeHTML(statusMeta.label)}</div>
                        <div class="movie-title-row">
                            <h3 class="movie-title">${escapeHTML(challenge.title)}</h3>
                        </div>
                        <div class="podcast-category-badge">${escapeHTML(categoryLine)}</div>
                        <p class="movie-description">${escapeHTML(description)}</p>
                        ${progressHtml}
                    </div>
                </div>`;
  }

  function renderQuoteCard(quote) {
    return `<article class="quote-card" id="${escapeHtmlAttr(quote.slug || quote.id)}" data-category="${escapeHtmlAttr(quote.category)}">
                    <p class="quote-text">${escapeHTML(quote.text)}</p>
                    <div class="quote-footer">
                        <span class="quote-author">${escapeHTML(quote.author || 'Unknown')}</span>
                        <span class="quote-category">${escapeHTML(titleCase(quote.category))}</span>
                    </div>
                </article>`;
  }

  function renderFilterControls(group, filters, field) {
    return `<div class="${group === 'quotes' ? 'quote-filters' : 'section-nav'}" data-filter-group="${escapeHtmlAttr(group)}" data-filter-field="${escapeHtmlAttr(field)}">
            ${filters.map((filter, index) => `<button class="${group === 'quotes' ? 'filter-btn' : 'section-nav-btn'} ${index === 0 ? 'active' : ''}" type="button" data-filter-value="${escapeHtmlAttr(filter.id)}">${escapeHTML(filter.label)}</button>`).join('\n            ')}
        </div>`;
  }

  return {
    iconSvg,
    productIcon,
    statusLabel,
    projectCategoryMeta,
    challengeCategoryMeta,
    productImageAsset,
    generatedProductImageAsset,
    quoteCategories,
    renderShelfItem,
    renderResourceCard,
    renderProjectCard,
    renderChallengeCard,
    renderQuoteCard,
    renderFilterControls
  };
}

module.exports = {
  createCards,
  PROJECT_CATEGORY_META,
  PROJECT_STATUS_META,
  CHALLENGE_CATEGORY_META,
  CHALLENGE_STATUS_META
};
