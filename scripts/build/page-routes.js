const SITE_CSS_BUNDLE = 'css/style.css';

function cssBundleForPage() {
  return SITE_CSS_BUNDLE;
}

function applyPageCssBundle(_file, html) {
  return html;
}

module.exports = {
  applyPageCssBundle,
  cssBundleForPage
};
