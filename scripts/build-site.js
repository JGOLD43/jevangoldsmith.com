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
const { createAgentApiBuilder } = require('./build/agent-api');
const { createPageMetadataInjector } = require('./build/page-metadata');
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
  if (file === 'index.html') next = injectHomeStats(next);
  next = injectRelatedInternalLinks(file, next);
  next = injectAnalyticsScript(next);
  next = decorateTrackedLinks(file, next);
  next = optimizeLocalImageReferences(next);
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
  if (hasSourcePage(file)) return '_src/pages';
  if (file === 'products.html' || file === 'free-resources.html') return 'data/products.json';
  if (file === 'projects.html') return 'data/projects.json';
  if (file === 'quotes.html') return 'data/quotes.json';
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

// Agent API

const agentApi = createAgentApiBuilder({
  root, distDir, site, books, adventures, projects, quotes, ctas, newsletter, topics, essays, skills, products,
  getPublicProducts, getPublicResources, getPublicQuotes,
  localizeRemoteStrings, localizeBooks, quoteCategories, stripHtml, writeGenerated
});
const buildAgentApi = agentApi.buildAgentApi;
const renderLlmsTxt = agentApi.renderLlmsTxt;
const absoluteUrl = agentApi.absoluteUrl;
const latestSourceDate = agentApi.latestSourceDate;

function absolutizeAsset(asset) {
  if (!asset) return absoluteUrl('/images/logo.png');
  if (/^https?:\/\//i.test(asset)) return asset;
  return absoluteUrl(`/${asset.replace(/^\//, '')}`);
}

const pageMetadata = createPageMetadataInjector({
  site,
  books,
  skills,
  topics,
  absoluteUrl,
  absolutizeAsset,
  remoteAssetFor: (url, w) => remoteAssetFor(url, w),
  lastModifiedDate: (file) => lastModifiedDate(file),
  seoFor,
  pageTitleFor,
  isIndexable,
  sectionFor: (file) => sectionFor(file),
  descriptionFromHtml,
  metaDescriptionFromHtml,
  getPublicProducts: () => getPublicProducts(),
  getPublicResources: () => getPublicResources(),
  getPublicProjects: () => getPublicProjects(),
  getPublicQuotes: () => getPublicQuotes(),
  topicRelatedContent,
  adventureForFile: (file) => adventureForFile(file),
  topicForFile: (file) => topicForFile(file),
  readPublicHtmlSource: (file) => readPublicHtmlSource(file),
  escapeHTML,
  escapeHtmlAttr,
  decodeHtmlEntities,
  stripHtml,
  wordCount,
  titleForSeoPath
});
const injectPageMetadata = pageMetadata.injectPageMetadata;
const injectBreadcrumbs = pageMetadata.injectBreadcrumbs;

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
