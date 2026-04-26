const fs = require('fs');
const path = require('path');
const { buildAssetManifest, rewriteAssetReferences } = require('./build/assets');
const { buildCss } = require('./build/css');
const {
  publicProjects: collectPublicProjects,
  publicQuotes: collectPublicQuotes,
  publicProducts: collectPublicProducts,
  publicResources: collectPublicResources,
  titleCase
} = require('./build/collections');
const { createSeoHelpers } = require('./build/seo');
const { createFileOps } = require('./build/io');
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
const { discoverPages } = require('./build/page-discovery');
const { renderAdventurePageTemplate } = require('./build/render-adventure-page');
const countriesVisited = require('./build/countries-visited');
const routesFromGpx = require('./build/routes-from-gpx');

const root = process.cwd();
const verify = process.argv.includes('--verify');
const site = JSON.parse(fs.readFileSync(path.join(root, 'data', 'site.json'), 'utf8'));
const deployConfig = JSON.parse(fs.readFileSync(path.join(root, 'data', 'site.config.json'), 'utf8'));
const products = readJson(path.join(root, 'data', 'products.json'), { products: [] });
const projects = readJson(path.join(root, 'data', 'projects.json'), { projects: [] });
const ctas = readJson(path.join(root, 'data', 'ctas.json'), { primary: {}, sections: [], ctas: [] });
const newsletter = readJson(path.join(root, 'data', 'newsletter.json'), {});
const topics = readJson(path.join(root, 'data', 'topics.json'), { topics: [] });
const seo = readJson(path.join(root, 'data', 'seo.json'), { defaults: {}, pages: {}, topicPages: {} });
const adventures = readJson(path.join(root, 'data', 'adventures.json'), { adventures: [] });
const essays = readJson(path.join(root, 'data', 'essays.json'), { essays: [] });
const skills = readJson(path.join(root, 'data', 'skills.json'), { skills: [] });
const books = readJson(path.join(root, 'data', 'books.json'), []);
const quotes = readJson(path.join(root, 'data', 'quotes.json'), {});
const remoteAssets = readJson(path.join(root, 'data', 'remote-assets.generated.json'), {});
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

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

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
function titleFromHtml(html, file) {
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
  if (title) return decodeHtmlEntities(title).replace(/\s*[-|]\s*Jevan Goldsmith.*$/i, '').trim();
  return file.replace(/\.html$/, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function descriptionFromHtml(html, title) {
  const description = metaDescriptionFromHtml(html);
  return description ? decodeHtmlEntities(description) : `${title} on ${site.siteName}.`;
}

function sourcePagePath(file) {
  return path.join(sourcePagesDir, file);
}

function hasSourcePage(file) {
  return fs.existsSync(sourcePagePath(file));
}

function readPublicHtmlSource(file) {
  const adventure = adventureForFile(file);
  if (adventure) return renderAdventurePage(file, adventure);
  const skill = skillForFile(file);
  if (skill) return renderSkillPage(file, skill);
  const topic = topicForFile(file);
  if (topic) return renderTopicPage(file, topic);
  if (file === 'products.html') return renderProductsPage(file);
  if (file === 'free-resources.html') return renderResourcesPage(file);
  if (file === 'projects.html') return renderProjectsPage(file);
  if (file === 'quotes.html') return renderQuotesPage(file);
  if (hasSourcePage(file)) return renderSourcePage(file);
  return fs.readFileSync(file, 'utf8');
}

function parseSourcePage(file) {
  const source = fs.readFileSync(sourcePagePath(file), 'utf8');
  const match = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return {
      data: {
        title: titleFromHtml(source, file),
        layout: 'base'
      },
      content: source.trim()
    };
  }

  return {
    data: parseFrontMatter(match[1], file),
    content: match[2].trim()
  };
}

function parseFrontMatter(source, file) {
  const data = {};
  for (const line of source.split('\n')) {
    if (!line.trim()) continue;
    const separator = line.indexOf(':');
    if (separator < 0) {
      console.error(`${sourcePagePath(file)} has invalid front matter line: ${line}`);
      process.exitCode = 1;
      continue;
    }
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  }
  return data;
}

function renderSourcePage(file) {
  const { data, content } = parseSourcePage(file);
  const layoutName = data.layout || 'base';
  const layoutPath = path.join(root, '_src', 'layouts', `${layoutName}.html`);
  if (!fs.existsSync(layoutPath)) {
    console.error(`${file} references missing layout: ${layoutName}`);
    process.exitCode = 1;
    return content;
  }

  const footerPath = path.join(root, '_src', 'partials', 'footer.html');
  const tokens = {
    title: data.title || titleFromHtml(content, file),
    metaDescription: data.description ? `<meta name="description" content="${escapeHtmlAttr(data.description)}">` : '',
    fontWeights: data.fontWeights || '300;400;600;700',
    bodyAttributes: data.bodyClass ? ` class="${escapeHtmlAttr(data.bodyClass)}"` : '',
    nav: data.includeNav === 'false' ? '' : fs.readFileSync(path.join(root, '_src', 'partials', 'nav.html'), 'utf8').trim(),
    footer: data.includeFooter === 'false' ? '' : fs.readFileSync(footerPath, 'utf8').trim(),
    content,
    scripts: data.scripts || '<script src="js/theme.js"></script>'
  };

  let html = fs.readFileSync(layoutPath, 'utf8');
  for (const [key, value] of Object.entries(tokens)) {
    html = html.split(`{{ ${key} }}`).join(value);
  }
  return `${html.trim()}\n`;
}

function shouldWriteRootHtml(file) {
  return !hasSourcePage(file);
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
  if (file === 'index.html') return 'home';
  if (file.startsWith('topics/')) return 'topics';
  if (file === 'field-notes.html') return 'experience';
  if (file.startsWith('adventure-') || file === 'adventures.html') return 'adventures';
  if (['books.html', 'reading-philosophy.html', 'movies.html', 'podcasts.html', 'products.html', 'people.html', 'quotes.html', 'cool-shit.html'].includes(file)) return 'taste';
  if (['essays.html', 'projects.html', 'challenges.html', 'free-resources.html', 'lesson-logger.html', 'important-or-not.html', 'changed-my-mind.html'].includes(file)) return 'experience';
  if (['north-star.html', 'about.html', 'health.html', 'dateme.html'].includes(file)) return 'explore';
  return 'page';
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
  if (file.startsWith('skill-')) activeHref = 'skills.html';
  if (file === 'learning-skills.html' || file === 'technical-skills.html' || file === 'applied-skills.html') activeHref = 'skills.html';

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

function categoryPageForSkill(skill) {
  const pageMap = {
    foundation: 'foundation-skills.html',
    applied: 'applied-skills.html',
    technical: 'technical-skills.html',
    learning: 'learning-skills.html'
  };
  return pageMap[skill.category] || 'skills.html';
}

function renderSkillPage(file, skill) {
  const nav = renderNav(file);
  const footer = fs.existsSync(path.join(root, '_src', 'partials', 'footer.html'))
    ? fs.readFileSync(path.join(root, '_src', 'partials', 'footer.html'), 'utf8').trim()
    : '';
  const category = skills.categories?.[skill.category];
  const proficiency = skills.proficiencyLevels?.[skill.proficiency];
  const activity = skills.activityStatuses?.[skill.activity];
  const related = (skill.relatedSkills || [])
    .map((id) => skills.skills.find((candidate) => candidate.id === id && candidate.status !== 'draft'))
    .filter(Boolean);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHTML(`${skill.title} - ${site.siteName}`)}</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="icon" type="image/svg+xml" href="images/favicon.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Chivo:wght@100;300;400;600;700&display=swap" rel="stylesheet">
</head>
<body>
    ${nav}

    <main class="container">
        <a href="${categoryPageForSkill(skill)}" class="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Back to ${escapeHTML(category?.name || 'Skills')}
        </a>

        <div class="skill-detail-hero">
            <span class="category-tag">${escapeHTML(category?.name || skill.category)}</span>
            <h1>${escapeHTML(skill.title)}</h1>
            <p class="skill-detail-tagline">${escapeHTML(skill.tagline)}</p>
            <div class="skill-detail-meta">
                <div class="skill-meta-item">
                    <span class="skill-meta-label">Proficiency</span>
                    ${renderStaticProficiencyBar(skill, proficiency)}
                </div>
                <div class="skill-meta-item">
                    <span class="skill-meta-label">Status</span>
                    ${renderStaticActivityBadge(skill, activity)}
                </div>
            </div>
        </div>

        <div class="skill-detail-content">
            <section class="skill-section">
                ${skill.fullContent || ''}
            </section>

            <section class="skill-section">
                <h2>Why This Matters</h2>
                <p>${escapeHTML(skill.importance)}</p>
            </section>

            <section class="skill-section">
                <h2>How I Apply This</h2>
                <ul>
                    ${(skill.howIApply || []).map((item) => `<li>${escapeHTML(item)}</li>`).join('\n                    ')}
                </ul>
            </section>

            <section class="skill-section">
                <h2>Skill Interactions</h2>
                <p>${escapeHTML(skill.skillInteractions)}</p>
                ${related.length > 0 ? `<div class="related-skills">
                    ${related.map((relatedSkill) => `<a href="skill-${escapeHtmlAttr(relatedSkill.id)}.html" class="related-skill-link">
                        <span class="related-skill-title">${escapeHTML(relatedSkill.title)}</span>
                        <span class="related-skill-tagline">${escapeHTML(relatedSkill.tagline)}</span>
                    </a>`).join('\n                    ')}
                </div>` : ''}
            </section>
        </div>
    </main>

    ${footer}
    <script src="js/theme.js"></script>
</body>
</html>
`;
}

function renderStaticProficiencyBar(skill, proficiency) {
  const levels = ['novice', 'beginner', 'intermediate', 'advanced', 'master'];
  const currentIndex = Math.max(0, levels.indexOf(skill.proficiency));
  const bars = Array.from({ length: 5 }, (_, index) => (
    `<div class="proficiency-segment ${index <= currentIndex ? 'filled' : ''}" data-level="${index + 1}"></div>`
  )).join('');
  return `<div class="proficiency-bar">
        <div class="proficiency-segments">${bars}</div>
        <span class="proficiency-label">${escapeHTML(proficiency?.label || skill.proficiency)} (${currentIndex + 1}/5)</span>
    </div>`;
}

function renderStaticActivityBadge(skill, activity) {
  return `<div class="activity-badge activity-${escapeHtmlAttr(skill.activity)}">
        <span class="activity-dot"></span>
        <span class="activity-label">${escapeHTML(activity?.label || skill.activity)}</span>
    </div>`;
}

function renderTopicPage(file, topic) {
  const topicSeo = seoFor(file);
  const related = topicRelatedContent(topic.id);
  return renderCollectionDocument({
    title: `${topicSeo.title} - ${site.siteName}`,
    description: topicSeo.description || topic.description,
    nav: renderNav(file),
    footer: fs.existsSync(path.join(root, '_src', 'partials', 'footer.html'))
      ? fs.readFileSync(path.join(root, '_src', 'partials', 'footer.html'), 'utf8').trim()
      : '',
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

function renderProductsPage(file) {
  const publishedProducts = getPublicProducts();
  const categories = products.productCategories || [];
  const filters = [{ id: 'all', title: 'All' }, ...categories];

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
  const statusFilters = [
    { id: 'all', label: 'All Projects' },
    { id: 'active', label: 'Active' },
    { id: 'completed', label: 'Completed' },
    { id: 'planned', label: 'Planned' }
  ];

  return renderCollectionPage(file, {
    title: `Projects - ${site.siteName}`,
    description: 'Projects Jevan Goldsmith is building, exploring, and planning.',
    scripts: '<script src="js/theme.js"></script>\n    <script src="js/collection-filters.js"></script>',
    main: `<main class="experience-content projects-page">
        <section class="experience-header">
            <p class="experience-eyebrow">Build Documentary</p>
            <h1 class="experience-title">Projects</h1>
            <p class="experience-subtitle">Things I am building, exploring, and learning in public. Each one has the current question, evidence, and next move.</p>
        </section>

        ${renderFilterControls('projects', statusFilters, 'status')}

        <div class="projects-grid project-documentary-list" id="projects-grid">
            ${publishedProjects.map(renderProjectCard).join('\n            ')}
        </div>
    </main>`
  });
}

function renderQuotesPage(file) {
  const publishedQuotes = getPublicQuotes();
  const categories = quoteCategories(publishedQuotes);
  const featured = quotes.featuredQuote || {
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

function renderCollectionPage(file, options) {
  const footer = fs.existsSync(path.join(root, '_src', 'partials', 'footer.html'))
    ? fs.readFileSync(path.join(root, '_src', 'partials', 'footer.html'), 'utf8').trim()
    : '';
  return renderCollectionDocument({
    ...options,
    nav: renderNav(file),
    footer
  });
}

function renderCollectionDocument({ title, description, nav, footer, main, scripts = '<script src="js/theme.js"></script>', baseHref = '', bodyClass = '' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHTML(title)}</title>
    ${baseHref ? `<base href="${escapeHtmlAttr(baseHref)}">` : ''}
    <link rel="stylesheet" href="css/style.css">
    <link rel="icon" type="image/svg+xml" href="images/favicon.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Chivo:wght@300;400;600;700&display=swap" rel="stylesheet">
    <meta name="description" content="${escapeHtmlAttr(description)}">
</head>
<body${bodyClass ? ` class="${escapeHtmlAttr(bodyClass)}"` : ''}>
    ${nav}

    ${main}

    ${footer}
    ${scripts}
</body>
</html>
`;
}

function renderShelfItem(product, index = 0) {
  const verdict = product.verdict || product.shortDescription || product.description || '';
  const why = product.whyItStayed || product.description || product.shortDescription || '';
  const how = product.howIUseIt || product.usage || '';
  const replaced = product.replaced || '';
  const brand = product.brand || '';
  const checkoutUrl = product.checkoutUrl || '';
  const productImage = productImagePath(product.slug || product.id);
  const markContent = productImage
    ? `<img class="shelf-object-photo" src="${escapeHtmlAttr(productImage)}" alt="${escapeHtmlAttr(product.title)}" width="800" height="800" loading="lazy" decoding="async">`
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
                    data-image="${escapeHtmlAttr(productImage || '')}"
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

function renderShelfOverlay() {
  return `<div class="shelf-overlay" data-shelf-overlay hidden>
            <div class="shelf-overlay-panel" role="dialog" aria-modal="true" aria-labelledby="shelf-detail-title">
                <button class="shelf-close" type="button" data-shelf-close aria-label="Close object detail">&times;</button>
                <div class="shelf-detail-media" aria-hidden="true">
                    <span data-shelf-detail-icon></span>
                </div>
                <div class="shelf-detail-copy">
                    <p class="shelf-detail-kicker" data-shelf-detail-category></p>
                    <h2 id="shelf-detail-title" data-shelf-detail-title></h2>
                    <p class="shelf-detail-brand" data-shelf-detail-brand></p>
                    <p class="shelf-detail-verdict" data-shelf-detail-verdict></p>
                </div>
                <div class="shelf-detail-grid">
                    <section>
                        <h3>Why it stayed</h3>
                        <p data-shelf-detail-why></p>
                    </section>
                    <section>
                        <h3>How I use it</h3>
                        <p data-shelf-detail-how></p>
                    </section>
                    <section>
                        <h3>What it replaced</h3>
                        <p data-shelf-detail-replaced></p>
                    </section>
                </div>
                <div class="shelf-detail-links" data-shelf-detail-links></div>
            </div>
        </div>`;
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
  const status = project.status || 'planned';
  const links = project.links || [];
  const proofItems = [
    ['What it is', project.whatItIs || project.description],
    ['Why I made it', project.whyIMadeIt],
    ['What I learned', project.whatILearned],
    ['Next step', project.nextStep]
  ].filter(([, value]) => value);
  const artifacts = project.proofArtifacts || [];
  const buildLog = project.buildLog || [];
  return `<article class="project-card project-documentary-card" id="${escapeHtmlAttr(project.slug || project.id)}" data-status="${escapeHtmlAttr(status)}">
                ${project.image ? `<div class="project-media"><img src="${escapeHtmlAttr(project.image)}" alt="${escapeHtmlAttr(project.imageAlt || project.title)}" class="project-image" width="600" height="400" loading="lazy" decoding="async"></div>` : ''}
                <div class="project-content">
                    <div class="project-card-header">
                        <div>
                            <div class="project-status ${escapeHtmlAttr(status)}">
                                <span class="project-status-dot"></span>
                                ${escapeHTML(statusLabel(status))}
                            </div>
                            <h3 class="project-name">${escapeHTML(project.title)}</h3>
                        </div>
                        ${project.category ? `<span class="project-category">${escapeHTML(titleCase(project.category))}</span>` : ''}
                    </div>
                    <p class="project-description">${escapeHTML(project.shortDescription || project.description)}</p>
                    ${project.documentaryLead ? `<p class="project-documentary-lead">${escapeHTML(project.documentaryLead)}</p>` : ''}
                    ${project.currentQuestion ? `<section class="project-current-question">
                        <span>Current question</span>
                        <p>${escapeHTML(project.currentQuestion)}</p>
                    </section>` : ''}
                    ${proofItems.length > 0 ? `<dl class="project-proof">
                        ${proofItems.map(([label, value]) => `<div class="project-proof-item">
                            <dt>${escapeHTML(label)}</dt>
                            <dd>${escapeHTML(value)}</dd>
                        </div>`).join('\n                        ')}
                    </dl>` : ''}
                    ${artifacts.length > 0 ? `<div class="project-artifacts">
                        ${artifacts.map((artifact) => `<div class="project-artifact">
                            <span>${escapeHTML(artifact.label)}</span>
                            <p>${escapeHTML(artifact.value)}</p>
                        </div>`).join('\n                        ')}
                    </div>` : ''}
                    ${buildLog.length > 0 ? `<div class="project-build-log">
                        <h4>Build notes</h4>
                        ${buildLog.map((entry) => `<article class="project-log-entry">
                            <time datetime="${escapeHtmlAttr(entry.date || '')}">${escapeHTML(formatPlainDate(entry.date))}</time>
                            <div>
                                <h5>${escapeHTML(entry.title || 'Progress note')}</h5>
                                <p>${escapeHTML(entry.note || '')}</p>
                            </div>
                        </article>`).join('\n                        ')}
                    </div>` : ''}
                    ${renderTagList(project.technologies || project.tags || [], 'project-tech', 'tech-tag')}
                    ${links.length > 0 ? `<div class="project-links">
                        ${links.map((link) => {
                          const safeLinkUrl = sanitizeHref(link.url);
                          return `<a href="${escapeHtmlAttr(safeLinkUrl)}" class="project-link"${externalLinkAttrs(safeLinkUrl)}>
                            ${iconSvg(link.icon || 'external')}
                            ${escapeHTML(link.label)}
                        </a>`;
                        }).join('\n                        ')}
                    </div>` : ''}
                </div>
            </article>`;
}

function formatPlainDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
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

function renderTagList(tags, listClass, itemClass) {
  if (!tags.length) return '';
  return `<div class="${escapeHtmlAttr(listClass)}">
                        ${tags.map((tag) => `<span class="${escapeHtmlAttr(itemClass)}">${escapeHTML(tag)}</span>`).join('\n                        ')}
                    </div>`;
}

function getPublicProjects() {
  return collectPublicProjects(projects);
}

function getPublicQuotes() {
  return collectPublicQuotes(quotes);
}

function renderRating(value) {
  const rating = Number(value);
  if (!rating) return '';
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  const stars = `${'★'.repeat(filled)}${'☆'.repeat(5 - filled)}`;
  return `<div class="product-rating">
                            <span class="stars" aria-label="${escapeHtmlAttr(`${rating} out of 5`)}">${stars}</span>
                            <span class="rating-value">${escapeHTML(rating.toFixed(1))}</span>
                        </div>`;
}

function getPublicProducts() {
  return collectPublicProducts(products);
}

function getPublicResources() {
  return collectPublicResources(products);
}

function quoteCategories(items) {
  return Array.from(new Set(items.map((quote) => quote.category).filter(Boolean)))
    .sort()
    .map((category) => ({ id: category, label: titleCase(category) }));
}

function statusLabel(status) {
  const labels = {
    active: 'Active',
    available: 'Available',
    completed: 'Completed',
    planned: 'Planned',
    preview: 'Preview'
  };
  return labels[status] || titleCase(status);
}

function externalLinkAttrs(url) {
  return /^https?:\/\//i.test(url) ? ' target="_blank" rel="noopener noreferrer"' : '';
}

function productImagePath(slug) {
  if (!slug) return null;
  const exts = ['.jpg', '.jpeg', '.png', '.webp'];
  for (const ext of exts) {
    const rel = `images/products/${slug}${ext}`;
    if (fs.existsSync(path.join(root, rel))) return rel;
  }
  return null;
}

function productIcon(icon) {
  const icons = {
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
  return icons[icon] || '•';
}

function iconSvg(name) {
  const icons = {
    arrow: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
    book: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    calendar: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    clock: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    dollar: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    file: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>',
    globe: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    heart: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    bag: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l1 13H5L6 8z"/><path d="M9 8V5a3 3 0 0 1 6 0v3"/></svg>',
    message: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    monitor: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    question: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    send: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    external: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
    github: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.5 11.5 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>'
  };
  return icons[name] || icons.file;
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
      products: products.products || [],
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

// Dist packaging
function buildDist() {
  if (!verify) {
    fs.rmSync(distDir, { recursive: true, force: true });
    fs.mkdirSync(distDir, { recursive: true });
  }

  const manifest = buildAssetManifest({
    root,
    distDir,
    cssBundleFiles,
    copyFile,
    copyDirectory,
    writeGenerated
  });

  for (const dir of assetDirs) {
    if (dir === 'css' || dir === 'js') continue;
    if (dir === 'vendor') {
      // dompurify is loaded via static <script> tags rewritten by
      // rewriteAssetReferences to hashed paths in dist/assets/vendor/, so the
      // unhashed copy is dead. leaflet + leaflet.markercluster are injected at
      // runtime by js/adventures.js using hardcoded unhashed paths, so they
      // must remain at vendor/<name>/.
      const runtimeVendor = ['leaflet', 'leaflet.markercluster'];
      for (const sub of runtimeVendor) {
        const source = path.join(root, dir, sub);
        if (fs.existsSync(source)) {
          copyDirectory(source, path.join(distDir, dir, sub));
        }
      }
      continue;
    }
    copyDirectory(path.join(root, dir), path.join(distDir, dir));
  }
  writeLocalizedPublicData();

  for (const file of rootStaticFiles) {
    if (fs.existsSync(file)) copyFile(file, path.join(distDir, file));
  }

  for (const dir of rootStaticDirs) {
    copyDirectory(path.join(root, dir), path.join(distDir, dir));
  }

  buildAgentApi(sitePages);

  for (const file of publicHtmlFiles) {
    const html = rewriteAssetReferences(applyPageCssBundle(file, normalizePublicHtml(file)), manifest);
    writeGenerated(path.join(distDir, file), html);
  }

  syncReferencedRemoteAssets();
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

for (const file of publicHtmlFiles) normalizePublicHtml(file);
buildPages();
buildPartials();
for (const file of publicHtmlFiles) normalizePublicHtml(file);
countriesVisited.build({ root, writeGenerated, log: (m) => console.log(m) });
routesFromGpx.build({ root, writeGenerated, log: (m) => console.log(m) });
cssBundleFiles = buildCss({ root, writeGenerated });
buildDist();
buildGeneratedManifest();
if (verify) checkChromeDrift();

if (!process.exitCode) {
  console.log(`${verify ? 'Verified' : 'Built'} site metadata, sitemap, shared chrome partials, CSS bundle, and dist output.`);
}
