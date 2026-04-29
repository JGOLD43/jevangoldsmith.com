const fs = require('fs');
const path = require('path');
const { transform } = require('lightningcss');
const { cssBundles, cssLayerGroups } = require('./css-manifest');

function renderCssLayer(root, file) {
  const fullPath = path.join('css', 'src', file);
  return `/* ${fullPath} */\n${fs.readFileSync(path.join(root, fullPath), 'utf8').trim()}\n`;
}

function minifyCss(css, filename) {
  const { code } = transform({
    filename,
    code: Buffer.from(css),
    minify: true,
    sourceMap: false
  });
  return code.toString();
}

function buildCss({ root, writeGenerated }) {
  const files = fs.readdirSync(path.join(root, 'css', 'src'))
    .filter((file) => file.endsWith('.css'))
    .sort();
  const css = files.map((file) => renderCssLayer(root, file)).join('\n');
  writeGenerated(path.join('css', 'style.css'), `${minifyCss(css, 'style.css')}\n`);

  const cssBundleFiles = [];
  for (const [bundleFile, groups] of Object.entries(cssBundles)) {
    const bundleLayers = [];
    const seen = new Set();
    for (const layer of groups.flatMap((group) => cssLayerGroups[group] || [])) {
      if (seen.has(layer)) continue;
      seen.add(layer);
      bundleLayers.push(layer);
    }
    const bundleCss = bundleLayers.map((file) => renderCssLayer(root, file)).join('\n');
    const target = path.join('css', bundleFile);
    writeGenerated(target, `${minifyCss(bundleCss, bundleFile)}\n`);
    cssBundleFiles.push(target);
  }

  return cssBundleFiles;
}

module.exports = {
  buildCss,
  cssBundles,
  cssLayerGroups
};
