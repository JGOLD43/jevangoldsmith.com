const { pageMetaFor } = require('./page-meta');

function cssBundleForPage(file) {
  return pageMetaFor(file).cssBundle;
}

function applyPageCssBundle(file, html) {
  const bundle = cssBundleForPage(file);
  return html.replace(/(["'])css\/style\.css(?:\?v=\d+)?\1/g, `$1${bundle}$1`);
}

module.exports = {
  applyPageCssBundle,
  cssBundleForPage
};
