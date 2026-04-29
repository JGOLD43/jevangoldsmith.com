const path = require('path');
const { contentPageConfigFor } = require('../content-config');

function createContentPageEngine({
  fs,
  root,
  hasSourcePage,
  parseSourcePage,
  renderSourcePage,
  renderDocument,
  renderNav,
  renderFooter,
  escapeHtmlAttr
}) {
  function readPartial(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8').trim();
  }

  function renderConfiguredPage(file, entry) {
    const config = contentPageConfigFor(entry?.id || file.replace(/\.html$/, ''));
    if (!config || !hasSourcePage(file)) return null;

    const { data } = parseSourcePage(file);
    const scripts = data.scripts || '<script src="js/theme.js"></script>';
    const bodyAttributes = data.bodyAttributes
      ? data.bodyAttributes
      : (data.bodyClass ? `class="${escapeHtmlAttr(data.bodyClass)}"` : '');
    const includeNav = data.includeNav !== 'false';
    const includeFooter = data.includeFooter !== 'false';

    return renderDocument({
      title: data.title || file.replace(/\.html$/, ''),
      description: data.description || '',
      nav: includeNav ? renderNav(file) : '',
      main: renderConfiguredMain(config, readPartial(config.bodyPath)),
      footer: includeFooter ? renderFooter(file) : '',
      scripts,
      bodyAttributes
    });
  }

  return {
    render({ file, entry }) {
      const configured = renderConfiguredPage(file, entry);
      if (configured) return configured;
      if (hasSourcePage(file)) return renderSourcePage(file);
      return fs.readFileSync(file, 'utf8');
    }
  };
}

function renderConfiguredMain(config, bodyHtml) {
  if (config.mode === 'raw') return bodyHtml;

  const headerHtml = config.header
    ? `<header class="page-header">
        <div class="container">
            <h1>${config.header.title}</h1>
            ${config.header.subtitle ? `<p>${config.header.subtitle}</p>` : ''}
        </div>
    </header>`
    : '';
  const wrapperTag = config.contentWrapperTag || 'div';
  const wrappedBody = config.contentWrapperClass
    ? `<${wrapperTag} class="${config.contentWrapperClass}">
            ${bodyHtml}
        </${wrapperTag}>`
    : bodyHtml;
  const mainHtml = config.mainClass
    ? `<main class="${config.mainClass}">
        ${wrappedBody}
    </main>`
    : wrappedBody;

  return `${headerHtml}

    ${mainHtml}`;
}

module.exports = {
  createContentPageEngine
};
