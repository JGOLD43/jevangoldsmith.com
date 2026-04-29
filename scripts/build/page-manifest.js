const routeManifest = require('./route-manifest');
const cssManifest = require('./css-manifest');

module.exports = {
  ...routeManifest,
  ...cssManifest
};
