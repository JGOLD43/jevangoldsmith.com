const fs = require('fs');
const path = require('path');

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function loadSiteData({ root }) {
  return {
    site: readJson(path.join(root, 'data', 'site.json'), {}),
    deployConfig: readJson(path.join(root, 'data', 'site.config.json'), {}),
    products: readJson(path.join(root, 'data', 'products.json'), { products: [] }),
    projects: readJson(path.join(root, 'data', 'projects.json'), { projects: [] }),
    ctas: readJson(path.join(root, 'data', 'ctas.json'), { primary: {}, sections: [], ctas: [] }),
    newsletter: readJson(path.join(root, 'data', 'newsletter.json'), {}),
    topics: readJson(path.join(root, 'data', 'topics.json'), { topics: [] }),
    seo: readJson(path.join(root, 'data', 'seo.json'), { defaults: {}, pages: {}, topicPages: {} }),
    adventures: readJson(path.join(root, 'data', 'adventures.json'), { adventures: [] }),
    essays: readJson(path.join(root, 'data', 'essays.json'), { essays: [] }),
    skills: readJson(path.join(root, 'data', 'skills.json'), { skills: [] }),
    books: readJson(path.join(root, 'data', 'books.json'), []),
    quotes: readJson(path.join(root, 'data', 'quotes.json'), {}),
    remoteAssets: readJson(path.join(root, 'data', 'remote-assets.generated.json'), {})
  };
}

module.exports = {
  loadSiteData,
  readJson
};
