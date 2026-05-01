const fs = require('fs');
const path = require('path');
const { canonicalScriptPath, jsBundles } = require('./js-manifest');

function wrapScript(file, source) {
  // Concatenate at script-level rather than wrapping in per-file IIFEs.
  // Multiple <script> tags share top-level scope, and several scripts
  // (sanitize.js, the collapsed page modules) rely on top-level names
  // declared in one file being visible to another. Wrapping each file
  // in its own IIFE breaks that contract.
  return `\n/* ${file} */\n${source}\n`;
}

function buildJsBundles({ root }) {
  const bundles = {};

  for (const [bundlePath, files] of Object.entries(jsBundles)) {
    const parts = files.map((file) => {
      const canonical = canonicalScriptPath(file);
      const fullPath = path.join(root, canonical);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`JS bundle input missing: ${canonical}`);
      }
      return wrapScript(canonical, fs.readFileSync(fullPath, 'utf8'));
    });
    bundles[bundlePath] = `${parts.join('\n')}\n`;
  }

  return bundles;
}

module.exports = {
  buildJsBundles
};
