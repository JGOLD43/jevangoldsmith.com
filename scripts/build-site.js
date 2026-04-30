const fs = require('fs');
const path = require('path');
const { buildAssetManifest, rewriteAssetReferences } = require('./build/assets');
const { buildCss } = require('./build/css');
const { buildJsBundles } = require('./build/js-bundles');
const { applyPageJsBundle } = require('./build/js-manifest');
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
const { buildPageArtifacts } = require('./build/page-index');
const { runBuildPipeline } = require('./build/pipeline');
const { localizeBooks: localizePublicBooks, writeLocalizedPublicData: writeLocalizedPublicDataArtifact } = require('./build/public-data');
const { syncReferencedRemoteAssets: syncReferencedRemoteAssetsArtifact } = require('./build/remote-assets');
const { buildRuntimeDataManifest } = require('./build/runtime-data-manifest');
const {
  escapeHTML,
  decodeHtmlEntities,
  formatDateRange,
  escapeRegExp,
  escapeHtmlAttr,
  stripHtml,
  wordCount
} = require('./build/html-utils');
const { pageManifestFor, pageMetaFor } = require('./build/route-manifest');
const { discoverPages } = require('./build/page-discovery');
const { renderAdventurePageTemplate } = require('./build/render-adventure-page');
const { createSkillPageRenderer } = require('./build/render-skill-page');
const { createAgentApiBuilder } = require('./build/agent-api');
const { createPageMetadataInjector } = require('./build/page-metadata');
const { createHtmlNormalizers } = require('./build/html-normalize');
const { createCtaHelpers } = require('./build/ctas');
const { renderDocument } = require('./build/document');
const { createPageEngines } = require('./build/engines');
const { createSourcePageHelpers } = require('./build/source-pages');
const { createCards } = require('./build/cards');
const { createTopicRelated } = require('./build/topic-related');
const { createPageEnhancements } = require('./build/page-enhancements');
const { createChromeRenderer } = require('./build/chrome');
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
let jsBundleFiles = {};
const seoReviewedAt = '2026-04-22';
let chromeRenderer = null;
let pageEnhancements = null;

function renderNav(file) {
  return chromeRenderer.renderNav(file);
}

function renderFooter(file) {
  return chromeRenderer.renderFooter(file);
}

function replaceSharedChrome(file, html) {
  return chromeRenderer.replaceSharedChrome(file, html);
}

function checkChromeDrift() {
  return chromeRenderer.checkChromeDrift();
}

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
  descriptionForSeoPath
} = seoHelpers;

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
  if (file === 'adventures.html') next = injectAdventureListing(next);
  next = injectRelatedInternalLinks(file, next);
  next = injectAnalyticsScript(next);
  next = decorateTrackedLinks(file, next);
  next = optimizeLocalImageReferences(next);
  next = localizeRemainingRemoteAssetReferences(next);
  if (shouldWriteRootHtml(file)) writeGenerated(file, next);
  return next;
}


function localizeRemoteStrings(value) {
  if (typeof value === 'string') return remoteAssetFor(value);
  if (Array.isArray(value)) return value.map(localizeRemoteStrings);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, localizeRemoteStrings(item)]));
}

function localizeBooks(bookList) {
  return localizePublicBooks({ books: bookList, remoteAssetFor });
}

function writeLocalizedPublicData() {
  writeLocalizedPublicDataArtifact({
    distDir,
    adventures,
    projects,
    books,
    localizeRemoteStrings,
    remoteAssetFor,
    writeGenerated
  });
}

function buildPages() {
  const pages = buildPageArtifacts({
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
  });
  sitePages = pages;
  return pages;
}

const ctaHelpers = createCtaHelpers({ ctas, sectionFor: (file) => sectionFor(file), escapeHTML, escapeHtmlAttr });
const { pageCtaFor, renderPageCtas, ctaLocationFor } = ctaHelpers;

pageEnhancements = createPageEnhancements({
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
  remoteAssetFor: (url, w) => remoteAssetFor(url, w),
  escapeHTML,
  escapeHtmlAttr
});
const {
  decorateTrackedLinks,
  injectAdventureListing,
  injectAnalyticsScript,
  injectFieldNotesCta,
  injectHomeStats,
  injectRelatedInternalLinks
} = pageEnhancements;

chromeRenderer = createChromeRenderer({
  fs,
  path,
  root,
  decorateTrackedLinks,
  escapeRegExp,
  sectionFor: (file) => sectionFor(file)
});

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

const htmlNormalizers = createHtmlNormalizers({ remoteAssets, escapeHtmlAttr, absolutizeAsset: (asset) => absolutizeAsset(asset) });
const {
  setHtmlAttribute,
  ensureHtmlAttribute,
  optimizeGeneratedRaster,
  remoteAssetFor,
  remoteAssetSrcset,
  localizeRemainingRemoteAssetReferences,
  optimizeLocalImageReferences,
  removeStaticLeafletTags,
  removeExternalFontLinks
} = htmlNormalizers;

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

function syncReferencedRemoteAssets() {
  syncReferencedRemoteAssetsArtifact({ root, distDir, verify, copyFile });
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
  buildJsBundles: () => {
    jsBundleFiles = buildJsBundles({ root });
  },
  packageDist: () => packageDist({
    root,
    verify,
    distDir,
    cssBundleFiles,
    jsBundleFiles,
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
    applyPageJsBundle,
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
