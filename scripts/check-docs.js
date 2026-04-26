const fs = require('fs');
const path = require('path');

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

const requiredSourcePaths = [
  '_src/layouts/base.html',
  '_src/pages/reading-philosophy.html'
];

const requiredPhrases = new Map([
  ['docs/START_HERE.md', ['Do not hand-edit `dist/`', 'npm run check']],
  ['docs/SOURCE_OF_TRUTH.md', ['Never hand-edit generated `dist/` files', 'data/site.config.json']],
  ['docs/DESIGN_SYSTEM.md', ['Visual Preservation Rule', 'Do not replace the font family']],
  ['docs/INTERACTION_CONTRACTS.md', ['Theme toggle', 'World map']],
  ['docs/PERFORMANCE_BUDGETS.md', ['scripts/check-performance-budget.js', 'Ratchet Rule']],
  ['docs/RELEASE_RUNBOOK.md', ['Firebase Hosting serves `dist/`', 'Do not patch `dist/` directly']],
  ['docs/AGENT_GUIDE.md', ['Preserve current style', 'Preserve current behavior']]
]);

let failed = false;

for (const file of requiredDocs) {
  if (!fs.existsSync(file)) {
    console.error(`${file} is missing.`);
    failed = true;
    continue;
  }

  const source = fs.readFileSync(file, 'utf8');
  for (const header of ['Status:', 'Audience:', 'Purpose:']) {
    if (!source.includes(header)) {
      console.error(`${file} is missing ${header}`);
      failed = true;
    }
  }

  const phrases = requiredPhrases.get(file) || [];
  for (const phrase of phrases) {
    if (!source.includes(phrase)) {
      console.error(`${file} is missing required phrase: ${phrase}`);
      failed = true;
    }
  }
}

for (const file of requiredSourcePaths) {
  if (!fs.existsSync(file)) {
    console.error(`${file} is missing.`);
    failed = true;
  }
}

const readme = fs.readFileSync('README.md', 'utf8');
if (readme.includes('Firebase Hosting serves the repository root')) {
  console.error('README.md still says Firebase Hosting serves the repository root.');
  failed = true;
}

const architecture = fs.existsSync('ARCHITECTURE.md') ? fs.readFileSync('ARCHITECTURE.md', 'utf8') : '';
if (architecture.includes('directly from the repository root')) {
  console.error('ARCHITECTURE.md still says Firebase serves directly from the repository root.');
  failed = true;
}

if (failed) process.exit(1);

console.log(`Docs OK (${requiredDocs.length} canonical docs).`);
