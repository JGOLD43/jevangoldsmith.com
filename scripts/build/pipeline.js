function runBuildPipeline({
  publicHtmlFiles,
  normalizePublicHtml,
  buildPages,
  buildPartials,
  buildCountriesVisited,
  buildRoutesFromGpx,
  buildCssBundles,
  packageDist,
  buildRuntimeDataManifest,
  buildGeneratedManifest,
  checkChromeDrift,
  verify
}) {
  const stages = [
    () => {
      for (const file of publicHtmlFiles) normalizePublicHtml(file);
    },
    buildPages,
    buildPartials,
    () => {
      for (const file of publicHtmlFiles) normalizePublicHtml(file);
    },
    buildCountriesVisited,
    buildRoutesFromGpx,
    buildCssBundles,
    packageDist,
    buildRuntimeDataManifest,
    buildGeneratedManifest
  ];

  for (const stage of stages) stage();
  if (verify) checkChromeDrift();
}

module.exports = {
  runBuildPipeline
};
