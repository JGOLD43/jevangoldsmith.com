const fs = require('fs');
const path = require('path');

function buildDist({
  root,
  verify,
  distDir,
  cssBundleFiles,
  jsBundleFiles,
  assetDirs,
  rootStaticFiles,
  rootStaticDirs,
  publicHtmlFiles,
  copyFile,
  copyDirectory,
  writeGenerated,
  buildAssetManifest,
  rewriteAssetReferences,
  writeLocalizedPublicData,
  buildAgentApi,
  sitePages,
  applyPageJsBundle,
  normalizePublicHtml,
  syncReferencedRemoteAssets
}) {
  if (!verify) {
    fs.rmSync(distDir, { recursive: true, force: true });
    fs.mkdirSync(distDir, { recursive: true });
  }

  const manifest = buildAssetManifest({
    root,
    distDir,
    cssBundleFiles,
    jsBundleFiles,
    copyFile,
    copyDirectory,
    writeGenerated
  });

  for (const dir of assetDirs) {
    if (dir === 'css' || dir === 'js') continue;
    if (dir === 'vendor') {
      const runtimeVendor = ['leaflet', 'leaflet.markercluster'];
      for (const sub of runtimeVendor) {
        const source = path.join(root, dir, sub);
        if (fs.existsSync(source)) {
          copyDirectory(source, path.join(distDir, dir, sub));
        }
      }
      continue;
    }
    copyDirectory(path.join(root, dir), path.join(distDir, dir));
  }

  writeLocalizedPublicData();

  for (const file of rootStaticFiles) {
    if (fs.existsSync(file)) copyFile(file, path.join(distDir, file));
  }

  for (const dir of rootStaticDirs) {
    copyDirectory(path.join(root, dir), path.join(distDir, dir));
  }

  buildAgentApi(sitePages);

  for (const file of publicHtmlFiles) {
    const html = rewriteAssetReferences(applyPageJsBundle(file, normalizePublicHtml(file)), manifest);
    writeGenerated(path.join(distDir, file), html);
  }

  syncReferencedRemoteAssets();
}

module.exports = {
  buildDist
};
