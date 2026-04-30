const path = require('path');
const { contentPageConfigFor } = require('./content-config');
const { createCollectionPageEngine } = require('./collection-page');

function createPageEngines(deps) {
  const {
    fs,
    root,
    hasSourcePage,
    parseSourcePage,
    renderSourcePage,
    renderDocument,
    renderNav,
    renderFooter,
    escapeHtmlAttr,
    adventureForFile,
    renderAdventurePage,
    skillForFile,
    renderSkillPage
  } = deps;

  const collectionEngine = createCollectionPageEngine(deps);

  function readPartial(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8').trim();
  }

  function renderContentPage({ file, entry }) {
    const config = contentPageConfigFor(entry?.id || file.replace(/\.html$/, ''));
    if (config && hasSourcePage(file)) {
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
    if (hasSourcePage(file)) return renderSourcePage(file);
    return fs.readFileSync(file, 'utf8');
  }

  function renderDetailPage({ file, entry }) {
    if (entry.engineView === 'adventure') {
      const adventure = adventureForFile(file);
      return adventure ? renderAdventurePage(file, adventure) : null;
    }
    if (entry.engineView === 'skill') {
      const skill = skillForFile(file);
      return skill ? renderSkillPage(file, skill) : null;
    }
    return null;
  }

  return {
    renderPage({ file, entry }) {
      const engineName = entry?.engine || 'content';
      if (engineName === 'collection') return collectionEngine.render({ file, entry });
      if (engineName === 'detail') return renderDetailPage({ file, entry });
      if (engineName === 'content') return renderContentPage({ file, entry });
      throw new Error(`Unknown page engine "${engineName}" for ${file}`);
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
  createPageEngines
};
