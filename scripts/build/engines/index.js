const { createCollectionPageEngine } = require('./collection-page');
const { createContentPageEngine } = require('./content-page');
const { createDetailPageEngine } = require('./detail-page');

function createPageEngines(deps) {
  const engines = {
    content: createContentPageEngine(deps),
    collection: createCollectionPageEngine(deps),
    detail: createDetailPageEngine(deps)
  };

  return {
    renderPage({ file, entry }) {
      const engineName = entry?.engine || 'content';
      const engine = engines[engineName];
      if (!engine) {
        throw new Error(`Unknown page engine "${engineName}" for ${file}`);
      }
      return engine.render({ file, entry });
    }
  };
}

module.exports = {
  createPageEngines
};
