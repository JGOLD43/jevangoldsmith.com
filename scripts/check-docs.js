const fs = require('fs');
const { readText, createReporter } = require('./check/harness');

const requiredDocs = [
  'docs/START_HERE.md',
  'docs/DOC_INDEX.md',
  'docs/HOW_WE_BUILD.md',
  'docs/SOURCE_OF_TRUTH.md',
  'docs/DESIGN_SYSTEM.md',
  'docs/INFORMATION_ARCHITECTURE.md',
  'docs/PAGE_TEMPLATE_CATALOG.md',
  'docs/COMPONENT_REGISTRY.md',
  'docs/CONTENT_MODEL.md',
  'docs/PERFORMANCE_BUDGETS.md',
  'docs/INTERACTION_CONTRACTS.md',
  'docs/RELEASE_RUNBOOK.md',
  'docs/DECISION_LOG.md',
  'docs/AGENT_GUIDE.md'
];

const requiredSourcePaths = ['_src/layouts/base.html', '_src/pages/reading-philosophy.html'];

const requiredPhrases = new Map([
  ['docs/START_HERE.md', ['Do not hand-edit `dist/`', 'npm run check']],
  ['docs/SOURCE_OF_TRUTH.md', ['Never hand-edit generated `dist/` files', 'data/site.config.json']],
  ['docs/DESIGN_SYSTEM.md', ['Visual Preservation Rule', 'Do not replace the font family']],
  ['docs/INTERACTION_CONTRACTS.md', ['Theme toggle', 'World map']],
  ['docs/PERFORMANCE_BUDGETS.md', ['scripts/check-performance-budget.js', 'Ratchet Rule']],
  ['docs/RELEASE_RUNBOOK.md', ['Firebase Hosting serves `dist/`', 'Do not patch `dist/` directly']],
  ['docs/AGENT_GUIDE.md', ['Preserve current style', 'Preserve current behavior']]
]);

const reporter = createReporter('check-docs');

for (const file of requiredDocs) {
  if (!fs.existsSync(file)) {
    reporter.fail(`${file} is missing.`);
    continue;
  }
  const source = readText(file);
  for (const header of ['Status:', 'Audience:', 'Purpose:']) {
    if (!source.includes(header)) reporter.fail(`${file} is missing ${header}`);
  }
  for (const phrase of requiredPhrases.get(file) || []) {
    if (!source.includes(phrase)) reporter.fail(`${file} is missing required phrase: ${phrase}`);
  }
}

for (const file of requiredSourcePaths) {
  if (!fs.existsSync(file)) reporter.fail(`${file} is missing.`);
}

if (readText('README.md', '').includes('Firebase Hosting serves the repository root')) {
  reporter.fail('README.md still says Firebase Hosting serves the repository root.');
}
if (readText('ARCHITECTURE.md', '').includes('directly from the repository root')) {
  reporter.fail('ARCHITECTURE.md still says Firebase serves directly from the repository root.');
}

reporter.ok(`Docs OK (${requiredDocs.length} canonical docs).`);
