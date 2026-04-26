const fs = require('node:fs');
const path = require('node:path');

function createFileOps({ root, verify, generated }) {
  function readJson(file, fallback) {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }

  function generatedPath(file) {
    const fullPath = path.isAbsolute(file) ? file : path.join(root, file);
    return path.relative(root, fullPath).replace(/\\/g, '/');
  }

  function writeGenerated(file, content) {
    generated.set(generatedPath(file), content);
    const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    if (current === content) return;
    if (verify) {
      console.error(`${file} is out of date. Run npm run build.`);
      process.exitCode = 1;
      return;
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }

  function copyFile(source, target) {
    const current = fs.existsSync(target) ? fs.readFileSync(target) : null;
    const next = fs.readFileSync(source);
    if (current && Buffer.compare(current, next) === 0) return;
    if (verify) {
      console.error(`${path.relative(root, target)} is out of date. Run npm run build.`);
      process.exitCode = 1;
      return;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, next);
  }

  function copyDirectory(sourceDir, targetDir, options = {}) {
    if (!fs.existsSync(sourceDir)) return;
    const generatedOnlyAssets = new Set(options.generatedOnlyAssets || []);
    const skipPrefixList = options.skipPrefixList || [];
    const skipExactFiles = new Set(options.skipExactFiles || []);

    for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
      const source = path.join(sourceDir, entry.name);
      const target = path.join(targetDir, entry.name);
      const relativeSource = path.relative(root, source).replace(/\\/g, '/');

      if (skipPrefixList.some((prefix) => relativeSource === prefix || relativeSource.startsWith(`${prefix}/`))) continue;
      if (generatedOnlyAssets.has(relativeSource)) continue;
      if (skipExactFiles.has(relativeSource)) continue;

      if (entry.isDirectory()) {
        copyDirectory(source, target, options);
        continue;
      }
      if (entry.isFile()) copyFile(source, target);
    }
  }

  return {
    readJson,
    generatedPath,
    writeGenerated,
    copyFile,
    copyDirectory
  };
}

module.exports = { createFileOps };
