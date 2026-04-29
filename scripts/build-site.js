const fs = require('fs');
const path = require('path');
const { buildAssetManifest, rewriteAssetReferences } = require('./build/assets');
const { buildCss } = require('./build/css');
const {
  publicProjects: collectPublicProjects,
  publicChallenges: collectPublicChallenges,
  publicQuotes: collectPublicQuotes,
  publicProducts: collectPublicProducts,
  publicResources: collectPublicResources,
  titleCase
} = require('./build/collections');
const { createSeoHelpers } = require('./build/seo');
const { createFileOps } = require('./build/io');
const { loadSiteData } = require('./build/site-data');
const { buildDist: packageDist } = require('./build/dist');
const { runBuildPipeline } = require('./build/pipeline');
const { buildRuntimeDataManifest } = require('./build/runtime-data-manifest');
const {
  escapeHTML,
  decodeHtmlEntities,
  formatDateRange,
  escapeRegExp,
  escapeHtmlAttr,
  sanitizeHref,
  stripHtml,
  wordCount
} = require('./build/html-utils');
const { applyPageCssBundle } = require('./build/page-routes');
const { pageManifestFor, pageMetaFor } = require('./build/page-meta');
const { discoverPages } = require('./build/page-discovery');
const { renderAdventurePageTemplate } = require('./build/render-adventure-page');
const { createSkillPageRenderer } = require('./build/render-skill-page');
const { renderDocument } = require('./build/document');
const { createPageEngines } = require('./build/engines');
const { createSourcePageHelpers } = require('./build/source-pages');
const { createCards } = require('./build/cards');
const { createTopicRelated } = require('./build/topic-related');
const countriesVisited = require('./build/countries-visited');
const routesFromGpx = require('./build/routes-from-gpx');

const root = process.cwd();
const verify = process.argv.includes('--verify');
const {
  site,
  deployConfig,
  products,
  projects,
  challenges,
  ctas,
  newsletter,
  topics,
  seo,
  adventures,
  essays,
  skills,
  books,
  quotes,
  remoteAssets
} = loadSiteData({ root });
const {
  adventurePageFiles,
  htmlFiles,
  publicHtmlFiles,
  skillPageFiles,
  sourcePagesDir,
  topicPageFiles
} = discoverPages({ root, adventures, skills, topics, seo });
const generated = new Map();
const fileOps = createFileOps({ root, verify, generated });
const {
  generatedPath,
  writeGenerated,
  copyFile,
  copyDirectory: baseCopyDirectory
} = fileOps;
const distDir = path.join(root, 'dist');
const assetDirs = ['css', 'js', 'images', 'data', 'fonts', 'vendor'];
const rootStaticFiles = ['robots.txt', 'sitemap.xml', 'llms.txt'];
const rootStaticDirs = ['.well-known'];
let sitePages = [];
let cssBundleFiles = [];
const seoReviewedAt = '2026-04-22';

const sourcePageHelpers = createSourcePageHelpers({
  root,
  site,
  sourcePagesDir,
  renderNav,
  renderFooter,
  escapeHtmlAttr
});
const {
  descriptionFromHtml,
  hasSourcePage,
  parseSourcePage,
  renderSourcePage,
  sourcePagePath,
  titleFromHtml
} = sourcePageHelpers;

const cards = createCards({ fs, path, root, products, escapeHTML, escapeHtmlAttr, titleCase });
const { productImageAsset, quoteCategories } = cards;

const topicRelated = createTopicRelated({
  seo,
  topics,
  essays,
  skills,
  getPublicResources,
  getPublicProducts,
  getPublicProjects,
  stripHtml,
  titleCase
});
const { topicRelatedContent } = topicRelated;

let pageEngines = null;

const seoHelpers = createSeoHelpers({
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
});
const {
  seoFor,
  pageTitleFor,
  pageDescriptionFor,
  isIndexable,
  metaDescriptionFromHtml,
  titleForSeoPath,
  descriptionForSeoPath,
  prioritySeoPages
} = seoHelpers;

function publicCsp() {
  return Object.entries(deployConfig.csp)
    .map(([directive, values]) => `${directive} ${values.join(' ')}`)
    .join('; ');
}

function copyDirectory(sourceDir, targetDir) {
  baseCopyDirectory(sourceDir, targetDir, {
    generatedOnlyAssets: [
      'images/logo.png',
      'images/profile.jpg',
      'images/zen-nature.jpg',
      'images/logo-animated.mp4'
    ],
    skipPrefixList: [
      'images/source',
      'images/people',
      'images/products',
      'images/generated/remote'
    ],
    skipExactFiles: [
      'data/generated-manifest.json',
      'data/remote-assets.generated.json',
      'data/adventures.json',
      'data/books.json',
      'data/projects.json'
    ]
  });
}

// Page normalization

function getPageEngines() {
  if (!pageEngines) {
    pageEngines = createPageEngines({
      fs,
      root,
      site,
      products,
      quotes,
      topics,
      seo,
      essays,
      skills,
      hasSourcePage,
      parseSourcePage,
      renderSourcePage,
      adventureForFile,
      skillForFile,
      topicForFile,
      renderAdventurePage,
      renderSkillPage,
      escapeHTML,
      escapeHtmlAttr,
      stripHtml,
      titleCase,
      renderDocument,
      renderNav,
      renderFooter,
      seoFor,
      renderPageCtas,
      cards,
      topicRelated,
      getPublicProducts,
      getPublicResources,
      getPublicProjects,
      getPublicChallenges,
      getPublicQuotes
    });
  }

  return pageEngines;
}

function readPublicHtmlSource(file) {
  const entry = pageManifestFor(file) || null;
  if (entry) {
    const rendered = getPageEngines().renderPage({ file, entry });
    if (typeof rendered === 'string') return rendered;
  }
  if (hasSourcePage(file)) return renderSourcePage(file);
  return fs.readFileSync(file, 'utf8');
}

function shouldWriteRootHtml(file) {
  return !hasSourcePage(file) && fs.existsSync(path.join(root, file));
}

function normalizePublicHtml(file) {
  const original = readPublicHtmlSource(file);
  let next = original.replace(/\n?\s*<meta http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '');
  next = next
    .replace(/https:\/\/unpkg\.com\/leaflet@1\.9\.4\/dist\/leaflet\.css/g, 'vendor/leaflet/leaflet.css')
    .replace(/https:\/\/unpkg\.com\/leaflet@1\.9\.4\/dist\/leaflet\.js/g, 'vendor/leaflet/leaflet.js')
    .replace(
      /\n?\s*<script\s+src=["']https:\/\/cdn\.jsdelivr\.net\/npm\/dompurify@3\.2\.4\/dist\/purify\.min\.js["'][^>]*><\/script>/gi,
      '\n    <script src="vendor/dompurify/purify.min.js"></script>'
    );
  if (file === 'adventures.html') next = removeStaticLeafletTags(next);
  next = removeExternalFontLinks(next);
  next = replaceSharedChrome(file, next);
  next = injectPageMetadata(file, next);
  next = injectBreadcrumbs(file, next);
  next = injectFieldNotesCta(file, next);
  next = injectRelatedInternalLinks(file, next);
  next = injectAnalyticsScript(next);
  next = decorateTrackedLinks(file, next);
  next = optimizeLocalImageReferences(next);
  next = injectStaticInitialContent(file, next);
  next = localizeRemainingRemoteAssetReferences(next);
  if (shouldWriteRootHtml(file)) writeGenerated(file, next);
  return next;
}

function removeStaticLeafletTags(html) {
  return html
    .replace(/\n?\s*<link\s+rel=["']stylesheet["']\s+href=["']vendor\/leaflet\/leaflet\.css["'][^>]*>/gi, '')
    .replace(/\n?\s*<script\s+src=["']vendor\/leaflet\/leaflet\.js["']><\/script>/gi, '');
}

function removeExternalFontLinks(html) {
  return html
    .replace(/\n?\s*<link\s+rel=["']preconnect["']\s+href=["']https:\/\/fonts\.googleapis\.com["'][^>]*>/gi, '')
    .replace(/\n?\s*<link\s+rel=["']preconnect["']\s+href=["']https:\/\/fonts\.gstatic\.com["'][^>]*>/gi, '')
    .replace(/\n?\s*<link\s+href=["']https:\/\/fonts\.googleapis\.com\/css2\?family=Chivo[^"']*["']\s+rel=["']stylesheet["'][^>]*>/gi, '')
    .replace(/\n?\s*<link\s+rel=["']stylesheet["']\s+href=["']https:\/\/fonts\.googleapis\.com\/css2\?family=Chivo[^"']*["'][^>]*>/gi, '');
}

function setHtmlAttribute(tag, name, value) {
  const escaped = escapeHtmlAttr(value);
  const pattern = new RegExp(`\\s${name}=(["'])[^"']*\\1`, 'i');
  if (pattern.test(tag)) return tag.replace(pattern, ` ${name}="${escaped}"`);
  return tag.replace(/>$/, ` ${name}="${escaped}">`);
}

function ensureHtmlAttribute(tag, name, value) {
  if (new RegExp(`\\s${name}=`, 'i').test(tag)) return tag;
  return setHtmlAttribute(tag, name, value);
}

function optimizeGeneratedRaster(tag, original, replacement, srcset, sizes) {
  if (!tag.includes(`src="${original}"`) && !tag.includes(`src='${original}'`)) return tag;
  if (/srcset=/i.test(tag)) return tag;
  let next = setHtmlAttribute(tag, 'src', replacement);
  next = setHtmlAttribute(next, 'srcset', srcset);
  next = setHtmlAttribute(next, 'sizes', sizes);
  next = ensureHtmlAttribute(next, 'loading', 'lazy');
  next = ensureHtmlAttribute(next, 'decoding', 'async');
  return next;
}

function remoteAssetFor(url, preferredWidth = 800, format = 'jpg') {
  if (!url || !/^https?:\/\//i.test(url)) return url;
  let normalizedUrl = url.replace(/&amp;/g, '&');
  let entry = remoteAssets[normalizedUrl];
  if (!entry && /images\.unsplash\.com/i.test(normalizedUrl) && /[?&]w=1200\b/.test(normalizedUrl)) {
    normalizedUrl = normalizedUrl.replace(/([?&]w=)1200\b/, '$1800');
    entry = remoteAssets[normalizedUrl];
  }
  if (!entry && /images\.unsplash\.com/i.test(normalizedUrl) && /[?&]w=800\b/.test(normalizedUrl)) {
    normalizedUrl = normalizedUrl.replace(/([?&]w=)800\b/, '$1400');
    entry = remoteAssets[normalizedUrl];
  }
  if (!entry) return url;
  const widths = (entry.widths || Object.keys(entry.formats || {}).map(Number)).sort((a, b) => a - b);
  const width = widths.find((candidate) => candidate >= preferredWidth) || widths[widths.length - 1];
  return entry.formats?.[width]?.[format] || entry.formats?.[width]?.jpg || url;
}

function remoteAssetSrcset(url, format = 'jpg') {
  const entry = remoteAssets[url.replace(/&amp;/g, '&')];
  if (!entry) return '';
  const widths = (entry.widths || Object.keys(entry.formats || {}).map(Number)).sort((a, b) => a - b);
  return widths
    .map((width) => entry.formats?.[width]?.[format] ? `${entry.formats[width][format]} ${width}w` : '')
    .filter(Boolean)
    .join(', ');
}

function localizeRemainingRemoteAssetReferences(html) {
  let next = html;
  for (const url of Object.keys(remoteAssets)) {
    const local = absolutizeAsset(remoteAssetFor(url, 1200));
    next = next.split(url).join(local);
    next = next.split(url.replace(/&/g, '&amp;')).join(local);
  }
  return next;
}

function optimizeLocalImageReferences(html) {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const remoteMatch = tag.match(/\ssrc=(["'])(https:\/\/(?:images\.unsplash\.com|covers\.openlibrary\.org)\/[^"']+)\1/i);
    if (remoteMatch && !/srcset=/i.test(tag)) {
      const url = remoteMatch[2].replace(/&amp;/g, '&');
      const replacement = remoteAssetFor(url, /covers\.openlibrary\.org/i.test(url) ? 360 : 800);
      if (replacement !== url) {
        let remote = setHtmlAttribute(tag, 'src', replacement);
        remote = setHtmlAttribute(remote, 'srcset', remoteAssetSrcset(url));
        remote = setHtmlAttribute(remote, 'sizes', /covers\.openlibrary\.org/i.test(url) ? '(max-width: 768px) 38vw, 180px' : '(max-width: 768px) 92vw, 640px');
        remote = ensureHtmlAttribute(remote, 'loading', 'lazy');
        remote = ensureHtmlAttribute(remote, 'decoding', 'async');
        return remote;
      }
    }

    const peopleMatch = tag.match(/\ssrc=(["'])images\/people\/([^"']+)\1/i);
    if (peopleMatch && !/srcset=/i.test(tag)) {
      const basename = path.parse(peopleMatch[2]).name;
      let people = setHtmlAttribute(tag, 'src', `images/generated/people/${basename}-400.jpg`);
      people = setHtmlAttribute(people, 'srcset', `images/generated/people/${basename}-200.jpg 200w, images/generated/people/${basename}-400.jpg 400w, images/generated/people/${basename}-800.jpg 800w`);
      people = setHtmlAttribute(people, 'sizes', '(max-width: 768px) 42vw, 220px');
      people = ensureHtmlAttribute(people, 'width', '400');
      people = ensureHtmlAttribute(people, 'height', '400');
      people = ensureHtmlAttribute(people, 'loading', 'lazy');
      people = ensureHtmlAttribute(people, 'decoding', 'async');
      return people;
    }

    let next = optimizeGeneratedRaster(
      tag,
      'images/logo.png',
      'images/generated/logo/logo-nav-352.png',
      'images/generated/logo/logo-nav-88.png 88w, images/generated/logo/logo-nav-176.png 176w, images/generated/logo/logo-nav-264.png 264w, images/generated/logo/logo-nav-352.png 352w',
      '88px'
    );
    if (next.includes('images/generated/logo/logo-nav-352.png')) {
      next = ensureHtmlAttribute(next, 'width', '88');
      next = ensureHtmlAttribute(next, 'height', '80');
    }
    next = optimizeGeneratedRaster(
      next,
      'images/profile.jpg',
      'images/generated/profile/profile-720.jpg',
      'images/generated/profile/profile-360.jpg 360w, images/generated/profile/profile-520.jpg 520w, images/generated/profile/profile-720.jpg 720w, images/generated/profile/profile-960.jpg 960w',
      '(max-width: 768px) 82vw, 480px'
    );
    next = optimizeGeneratedRaster(
      next,
      'images/zen-nature.jpg',
      'images/generated/content/zen-nature-720.jpg',
      'images/generated/content/zen-nature-320.jpg 320w, images/generated/content/zen-nature-480.jpg 480w, images/generated/content/zen-nature-720.jpg 720w, images/generated/content/zen-nature-960.jpg 960w, images/generated/content/zen-nature-1200.jpg 1200w',
      '(max-width: 768px) 92vw, 640px'
    );
    return next;
  });
}

function localizeRemoteStrings(value) {
  if (typeof value === 'string') return remoteAssetFor(value);
  if (Array.isArray(value)) return value.map(localizeRemoteStrings);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, localizeRemoteStrings(item)]));
}

function localizeBooks(bookList) {
  return bookList.map((book) => {
    const isbn = String(book.isbn || '').replace(/[^0-9X]/gi, '');
    const coverUrl = isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg` : '';
    return {
      ...book,
      coverImage: coverUrl ? remoteAssetFor(coverUrl, 360) : book.coverImage,
      coverImageMedium: coverUrl ? remoteAssetFor(coverUrl, 240) : book.coverImageMedium
    };
  });
}

function writeLocalizedPublicData() {
  writeGenerated(path.join(distDir, 'data', 'adventures.json'), `${JSON.stringify(localizeRemoteStrings(adventures), null, 2)}\n`);
  writeGenerated(path.join(distDir, 'data', 'projects.json'), `${JSON.stringify(localizeRemoteStrings(projects), null, 2)}\n`);
  const localizedBooks = `${JSON.stringify(localizeBooks(books), null, 2)}\n`;
  writeGenerated(path.join('data', 'books.generated.json'), localizedBooks);
  writeGenerated(path.join(distDir, 'data', 'books.json'), localizedBooks);
  writeGenerated(path.join(distDir, 'data', 'books.generated.json'), localizedBooks);
}

function injectStaticInitialContent(file, html) {
  if (file === 'books.html') return injectStaticBooks(html);
  if (file === 'adventures.html') return injectStaticAdventures(html);
  return html;
}

function injectStaticBooks(html) {
  const staticBooks = localizeBooks(books).map((book) => {
    const stars = `${'★'.repeat(book.rating)}${'☆'.repeat(5 - book.rating)}`;
    const timesRead = (book.reReads || 0) + 1;
    return `<div class="book-card${book.review ? ' has-review' : ''}" data-isbn="${escapeHtmlAttr(book.isbn)}">
                    ${timesRead > 1 ? `<div class="times-read-badge">Read ${timesRead}x</div>` : ''}
                    <div class="book-cover-wrapper">
                        <img src="${escapeHtmlAttr(book.coverImage || '')}" alt="${escapeHtmlAttr(book.title)}" class="book-cover" width="360" height="540" loading="lazy" decoding="async">
                    </div>
                    <div class="book-info">
                        <div class="book-title-row">
                            <h3 class="book-title">${escapeHTML(book.title)}</h3>
                            ${book.year ? `<span class="book-year">${escapeHTML(book.year)}</span>` : ''}
                        </div>
                        <p class="book-author">by ${escapeHTML(book.author)}</p>
                        <div class="book-rating"><span class="rating-number">${escapeHTML(book.rating)}</span> ${stars}</div>
                        ${book.review ? `<p class="book-description">${escapeHTML(book.shortDescription || '')}</p>` : ''}
                        ${book.review ? '<button class="read-review-btn" type="button">Read My Review</button>' : ''}
                    </div>
                </div>`;
  }).join('\n                ');

  return html
    .replace(/<span class="counter-number" id="book-count">0<\/span>/, `<span class="counter-number" id="book-count">${books.length}</span>`)
    .replace(/<div id="books-container" class="books-grid">\s*<!-- Books will be loaded here dynamically -->\s*<\/div>/, `<div id="books-container" class="books-grid">
                ${staticBooks}
            </div>`);
}

function injectStaticAdventures(html) {
  const published = localizeRemoteStrings(adventures.adventures || [])
    .filter((adventure) => adventure.status === 'published')
    .sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  const cards = published.map((adventure) => `<div class="adventure-compact-card" id="card-${escapeHtmlAttr(adventure.id)}" data-adventure-id="${escapeHtmlAttr(adventure.id)}">
                    <img src="${escapeHtmlAttr(adventure.heroImage)}" alt="${escapeHtmlAttr(adventure.title)}" class="adventure-compact-image" width="800" height="533" loading="lazy" decoding="async">
                    <div class="adventure-compact-info">
                        <div class="adventure-compact-location">${escapeHTML(adventure.location)}</div>
                        <h3 class="adventure-compact-title">${escapeHTML(adventure.title)}</h3>
                        <div class="adventure-compact-meta">${escapeHTML(formatDateRange(adventure.startDate, adventure.endDate))} · ${escapeHTML(adventure.duration)}</div>
                    </div>
                </div>`).join('\n                ');

  return html
    .replace(/<span id="adventure-count">0<\/span>/, `<span id="adventure-count">${published.length}</span>`)
    .replace(/<div class="adventures-compact-list" id="adventures-container">\s*<!-- Adventure cards will be loaded dynamically -->\s*<\/div>/, `<div class="adventures-compact-list" id="adventures-container">
                ${cards}
            </div>`);
}

function injectAnalyticsScript(html) {
  if (!html.includes('</body>') || html.includes('js/analytics.js')) return html;
  return html.replace('</body>', '    <script src="js/analytics.js"></script>\n</body>');
}

function injectFieldNotesCta(file, html) {
  const eligible = file === 'essays.html' || file === 'reading-philosophy.html';
  if (!eligible || html.includes('data-field-notes-inline')) return html;
  const block = `<section class="field-notes-inline-cta" data-field-notes-inline>
        <p class="archive-kicker">Field Notes</p>
        <h2>Want more notes like this?</h2>
        <p>Field Notes is where I send useful ideas before they become polished essays: books, objects, questions, and experiments worth keeping.</p>
        <a href="field-notes.html" class="btn-primary" data-analytics="cta" data-cta-id="newsletter" data-cta-location="${escapeHtmlAttr(file.replace(/\.html$/, ''))}-inline">Get Field Notes</a>
    </section>`;
  return html.replace('</main>', `    ${block}\n</main>`);
}

function injectRelatedInternalLinks(file, html) {
  let nextHtml = html.replace(/\n?\s*<section class=["']seo-related-section["'] data-seo-related>[\s\S]*?<\/section>\n*/gi, '\n');
  const pageSeo = seoFor(file);
  if (pageSeo.index === false || pageSeo.contentDepth === 'utility') return nextHtml;
  const related = (pageSeo.relatedPages || [])
    .filter((href) => href !== file)
    .map((href) => ({
      href,
      title: titleForSeoPath(href),
      description: descriptionForSeoPath(href)
    }))
    .filter((item) => item.title && item.href)
    .slice(0, 4);
  if (related.length < 2) return nextHtml;

  const section = `<section class="seo-related-section" data-seo-related>
        <p class="seo-related-eyebrow">Related thread</p>
        <h2>Keep exploring this idea</h2>
        <p class="seo-related-intro">A few adjacent notes and pages that connect this topic to the wider archive. These links are chosen from shared topics and intent, so each page leads toward a more specific skill, resource, essay, or collection instead of sending you back through generic navigation. Follow the thread that best matches what you are trying to learn next.</p>
        <div class="seo-related-grid">
            ${related.map((item) => `<a class="seo-related-card" href="${escapeHtmlAttr(item.href)}">
                <span>${escapeHTML(item.title)}</span>
                <p>${escapeHTML(item.description)}</p>
            </a>`).join('\n            ')}
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
    const cta = ctaByHref.get(href);
    const location = ctaLocationFor(file);
    if (cta) {
      return `<a${before}href=${quote}${href}${quote}${after} data-analytics="cta" data-cta-id="${escapeHtmlAttr(cta.id)}" data-cta-location="${escapeHtmlAttr(location)}">`;
    }
    if (/^mailto:/i.test(href) || href.includes('contact.html') || href.includes('meet.html')) {
      return `<a${before}href=${quote}${href}${quote}${after} data-analytics="contact" data-cta-location="${escapeHtmlAttr(location)}">`;
    }
    return match;
  });
}

function renderFooter(file) {
  const footerPath = path.join(root, '_src', 'partials', 'footer.html');
  if (!fs.existsSync(footerPath)) return '';
  return decorateTrackedLinks(file, fs.readFileSync(footerPath, 'utf8').trim());
}

function buildPages() {
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

  sitePages = pages;
  return pages;
}

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

function sectionFor(file) {
  return pageMetaFor(file).section;
}

function generatedFromFor(file) {
  if (adventureForFile(file)) return 'data/adventures.json';
  if (skillForFile(file)) return 'data/skills.json';
  if (topicForFile(file)) return 'data/topics.json';
  if (file === 'products.html' || file === 'free-resources.html') return 'data/products.json';
  if (file === 'projects.html') return 'data/projects.json';
  if (file === 'quotes.html') return 'data/quotes.json';
  if (hasSourcePage(file)) return '_src/pages';
  return 'root-html';
}

// Collection rendering
function buildPartials() {
  checkChromeDrift();
}

function replaceSharedChrome(file, html) {
  if (file === 'meet.html') return html;

  const navPath = path.join('_src', 'partials', 'nav.html');
  const footerPath = path.join('_src', 'partials', 'footer.html');
  if (!fs.existsSync(navPath) || !fs.existsSync(footerPath)) return html;

  let next = html;
  if (/<nav class=["']navbar["']>/.test(next)) {
    if (/<nav class=["']navbar["']>[\s\S]*?<\/nav>/.test(next)) {
      next = next.replace(/<nav class=["']navbar["']>[\s\S]*?<\/nav>/, renderNav(file));
    } else {
      next = replaceUnclosedNav(next, renderNav(file));
    }
  }
  if (/<footer class=["']footer["']>/.test(next)) {
    next = next.replace(/<footer class=["']footer["']>[\s\S]*?<\/footer>/, fs.readFileSync(footerPath, 'utf8').trim());
  }
  return next;
}

function replaceUnclosedNav(html, nav) {
  const navStart = html.search(/<nav class=["']navbar["']>/);
  if (navStart < 0) return html;

  const contentMarkers = [
    '\n    <header',
    '\n    <main',
    '\n    <section',
    '\n    <div class="page',
    '\n    <div class="hero',
    '\n        <div class="projects-grid"'
  ];
  const contentStart = contentMarkers
    .map((marker) => html.indexOf(marker, navStart))
    .filter((index) => index > navStart)
    .sort((a, b) => a - b)[0];

  if (!contentStart) return html;
  return `${html.slice(0, navStart)}${nav.trim()}\n\n${html.slice(contentStart).trimStart()}`;
}

function renderNav(file) {
  const nav = fs.readFileSync(path.join('_src', 'partials', 'nav.html'), 'utf8');
  const cleared = nav
    .replace(/\sclass="active"/g, '')
    .replace(/\sclass="dropdown-trigger active"/g, ' class="dropdown-trigger"');

  const section = sectionFor(file);
  let activeHref = file;
  if (file.startsWith('adventure-')) activeHref = 'adventures.html';

  const navLinksStart = cleared.indexOf('<ul class="nav-links">');
  let next = cleared;
  if (navLinksStart >= 0) {
    const beforeLinks = cleared.slice(0, navLinksStart);
    const navLinks = cleared.slice(navLinksStart).replace(
      new RegExp(`<a href="${escapeRegExp(activeHref)}">`),
      `<a href="${activeHref}" class="active">`
    );
    next = beforeLinks + navLinks;
  }

  const triggerBySection = {
    explore: 'Explore',
    taste: 'Taste',
    experience: 'Experience'
  };
  if (triggerBySection[section]) {
    next = next.replace(
      `class="dropdown-trigger">${triggerBySection[section]}</a>`,
      `class="dropdown-trigger active">${triggerBySection[section]}</a>`
    );
  }

  return next.trim();
}

function adventureForFile(file) {
  const match = file.match(/^adventure-(.+)\.html$/);
  if (!match) return null;
  return adventures.adventures.find((adventure) => adventure.id === match[1] && adventure.status !== 'draft') || null;
}

function skillForFile(file) {
  const match = file.match(/^skill-(.+)\.html$/);
  if (!match) return null;
  return skills.skills.find((skill) => skill.id === match[1] && skill.status !== 'draft') || null;
}

function topicForFile(file) {
  const match = file.match(/^topics\/(.+)\.html$/);
  if (!match) return null;
  return (topics.topics || []).find((topic) => topic.id === match[1]) || null;
}

const skillPageRenderer = createSkillPageRenderer({
  skills,
  site,
  renderNav: (file) => renderNav(file),
  renderFooter: (file) => renderFooter(file)
});

const renderSkillPage = skillPageRenderer.renderSkillPage;
const categoryPageForSkill = skillPageRenderer.categoryPageForSkill;

function getPublicProjects() {
  return collectPublicProjects(projects);
}

function getPublicChallenges() {
  return collectPublicChallenges(challenges);
}

function getPublicQuotes() {
  return collectPublicQuotes(quotes);
}

function getPublicProducts() {
  return collectPublicProducts(products).map((product) => {
    const image = productImageAsset(product);
    return image ? { ...product, image: image.src } : product;
  });
}

function getPublicResources() {
  return collectPublicResources(products);
}


function renderAdventurePage(file, adventure) {
  const nav = renderNav(file);
  const footer = fs.existsSync(path.join(root, '_src', 'partials', 'footer.html'))
    ? fs.readFileSync(path.join(root, '_src', 'partials', 'footer.html'), 'utf8').trim()
    : '';
  const gallery = adventure.gallery || [];
  const photoMarkers = gallery
    .filter((photo) => typeof photo.lat === 'number' && typeof photo.lng === 'number')
    .map((photo) => ({
      lat: photo.lat,
      lng: photo.lng,
      caption: photo.caption || adventure.title
    }));
  const lightboxImages = gallery.map((photo) => ({
    src: remoteAssetFor((photo.src || '').replace(/w=\d+/, 'w=1200'), 1200),
    caption: photo.caption || adventure.title
  }));

  return renderAdventurePageTemplate({
    nav,
    footer,
    adventure,
    gallery,
    photoMarkers,
    lightboxImages,
    siteName: site.siteName,
    formatDateRange,
    escapeHTML,
    escapeHtmlAttr
  });
}

// Metadata/SEO
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

function injectBreadcrumbs(file, html) {
  return html.replace(/\n?\s*<nav class=["']breadcrumbs["'][\s\S]*?<\/nav>\n*/gi, '\n');
}

function stripGeneratedMetadata(html) {
  return html
    .replace(/\n?\s*<meta name=["']description["'][^>]*>/gi, '')
    .replace(/\n?\s*<meta name=["']robots["'][^>]*>/gi, '')
    .replace(/\n?\s*<link rel=["']canonical["'][^>]*>/gi, '')
    .replace(/\n?\s*<link rel=["']alternate["'][^>]*(?:api\/v1|llms\.txt)[^>]*>/gi, '')
    .replace(/\n?\s*<meta (?:property|name)=["'](?:og|twitter):[^>]+>/gi, '')
    .replace(/\n?\s*<script type=["']application\/ld\+json["'][\s\S]*?<\/script>/gi, '');
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

// Agent API
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
  writeGenerated(path.join(apiDir, 'search-index.json'), `${JSON.stringify(searchIndex, null, 2)}\n`);
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

function absoluteUrl(urlPath) {
  if (/^https?:\/\//i.test(urlPath)) return urlPath;
  const normalized = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
  return `https://${site.domain}${normalized}`;
}

function absolutizeAsset(asset) {
  if (!asset) return absoluteUrl('/images/logo.png');
  if (/^https?:\/\//i.test(asset)) return asset;
  return absoluteUrl(`/${asset.replace(/^\//, '')}`);
}

function lastModifiedDate(file) {
  let source = file;
  if (hasSourcePage(file)) source = sourcePagePath(file);
  if (adventureForFile(file)) source = path.join(root, 'data', 'adventures.json');
  if (skillForFile(file)) source = path.join(root, 'data', 'skills.json');
  if (topicForFile(file)) source = path.join(root, 'data', 'topics.json');
  const stat = fs.statSync(source);
  return stat.mtime.toISOString().slice(0, 10);
}

function walkFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, files);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function textDistFiles() {
  const textExtensions = new Set(['.html', '.css', '.js', '.json', '.xml', '.txt']);
  return walkFiles(distDir).filter((file) => textExtensions.has(path.extname(file).toLowerCase()));
}

function referencedRemoteAssetPaths() {
  const refs = new Set();
  const pattern = /images\/generated\/remote\/[A-Za-z0-9._/-]+\.(?:jpg|jpeg|png|webp|avif)/gi;
  for (const file of textDistFiles()) {
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(pattern)) refs.add(match[0].replace(/\\/g, '/'));
  }
  return refs;
}

function syncReferencedRemoteAssets() {
  const refs = referencedRemoteAssetPaths();
  const targetDir = path.join(distDir, 'images', 'generated', 'remote');
  for (const relative of refs) {
    const source = path.join(root, relative);
    if (!fs.existsSync(source)) {
      console.error(`${relative} is referenced but missing. Run npm run assets:optimize.`);
      process.exitCode = 1;
      continue;
    }
    copyFile(source, path.join(distDir, relative));
  }

  const deployed = walkFiles(targetDir);
  for (const file of deployed) {
    const relative = path.relative(distDir, file).replace(/\\/g, '/');
    if (refs.has(relative)) continue;
    if (verify) {
      console.error(`${relative} is not referenced by dist output. Run npm run build.`);
      process.exitCode = 1;
    } else {
      fs.rmSync(file, { force: true });
    }
  }
}

function buildGeneratedManifest() {
  const files = Array.from(generated.keys()).map((file) => file.replace(/\\/g, '/')).sort();
  const manifest = {
    version: '1.0',
    generatedAt: 'deterministic-build',
    source: 'scripts/build-site.js',
    files
  };
  writeGenerated(path.join('data', 'generated-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

// Verification
function checkChromeDrift() {
  const nav = fs.existsSync(path.join('_src', 'partials', 'nav.html'));
  const footer = fs.existsSync(path.join('_src', 'partials', 'footer.html'));
  if (!nav || !footer) {
    console.error('Shared chrome partials are missing. Run npm run build.');
    process.exitCode = 1;
  }
}

runBuildPipeline({
  publicHtmlFiles,
  normalizePublicHtml,
  buildPages,
  buildPartials,
  buildCountriesVisited: () => countriesVisited.build({ root, writeGenerated, log: (m) => console.log(m) }),
  buildRoutesFromGpx: () => routesFromGpx.build({ root, writeGenerated, log: (m) => console.log(m) }),
  buildCssBundles: () => {
    cssBundleFiles = buildCss({ root, writeGenerated });
  },
  packageDist: () => packageDist({
    root,
    verify,
    distDir,
    cssBundleFiles,
    assetDirs,
    rootStaticFiles,
    rootStaticDirs,
    publicHtmlFiles,
    copyFile,
    copyDirectory,
    writeGenerated,
    buildAssetManifest,
    rewriteAssetReferences,
    writeLocalizedPublicData,
    buildAgentApi,
    sitePages,
    applyPageCssBundle,
    normalizePublicHtml,
    syncReferencedRemoteAssets
  }),
  buildRuntimeDataManifest: () => buildRuntimeDataManifest({ distDir, writeGenerated }),
  buildGeneratedManifest,
  checkChromeDrift,
  verify
});

if (!process.exitCode) {
  console.log(`${verify ? 'Verified' : 'Built'} site metadata, sitemap, shared chrome partials, CSS bundle, and dist output.`);
}
