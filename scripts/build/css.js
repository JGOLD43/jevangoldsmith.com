const fs = require('fs');
const path = require('path');
const { transform } = require('lightningcss');

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
  const target = path.join('css', 'style.css');
  writeGenerated(target, `${minifyCss(css, 'style.css')}\n`);
  return [target];
}

module.exports = {
  buildCss
};
