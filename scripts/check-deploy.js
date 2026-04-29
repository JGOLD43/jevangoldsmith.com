const fs = require('fs');
const { readJson, readText, createReporter } = require('./check/harness');

const reporter = createReporter('check-deploy');
const firebase = readJson('firebase.json');
const config = readJson('data/site.config.json');
const hosting = firebase.hosting || {};
const allHeaders = (hosting.headers || []).flatMap((entry) => entry.headers || []);
const headerNames = new Set(allHeaders.map((header) => header.key.toLowerCase()));

const requiredHeaders = ['x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy', 'content-security-policy'];
for (const name of requiredHeaders) {
  if (!headerNames.has(name)) reporter.fail(`Missing Firebase security header: ${name}`);
}

if (hosting.public !== config.hosting.public) {
  reporter.fail(`Expected Firebase hosting public to be "${config.hosting.public}", got "${hosting.public}".`);
}

const ignore = new Set(hosting.ignore || []);
if (!ignore.has('admin/**')) reporter.fail('admin/** must stay out of Firebase Hosting until admin writes are server-enforced.');

if (Array.isArray(hosting.rewrites) && hosting.rewrites.some((rewrite) => rewrite.function)) {
  reporter.fail('Function rewrites are enabled. Remove unused function rewrites or add an explicit API check.');
}

const csp = allHeaders.find((header) => header.key.toLowerCase() === 'content-security-policy')?.value || '';
const expectedCsp = Object.entries(config.csp)
  .map(([directive, values]) => `${directive} ${values.join(' ')}`)
  .join('; ');
if (csp !== expectedCsp) reporter.fail('Firebase CSP differs from data/site.config.json.');

for (const directive of ['default-src', 'script-src', 'style-src', 'img-src', 'connect-src', 'form-action']) {
  if (!csp.includes(directive)) reporter.fail(`Content-Security-Policy is missing ${directive}.`);
}

const rootHtml = fs.readdirSync('.').filter((file) => file.endsWith('.html'));
for (const file of rootHtml) {
  if (readText(file).includes('Content-Security-Policy')) reporter.fail(`Root HTML file ${file} still contains per-page CSP meta tag.`);
}

if (!fs.existsSync(hosting.public)) {
  reporter.fail(`${hosting.public}/ is missing. Run npm run build before deploying.`);
}

const distHtml = fs.existsSync(hosting.public)
  ? fs.readdirSync(hosting.public).filter((file) => file.endsWith('.html'))
  : [];
for (const file of distHtml) {
  if (readText(`${hosting.public}/${file}`).includes('Content-Security-Policy')) {
    reporter.fail(`Generated HTML ${file} still contains per-page CSP meta tag.`);
  }
  if (readText(`${hosting.public}/${file}`).includes('https://unpkg.com')) {
    reporter.fail(`Generated HTML ${file} still references unpkg.com.`);
  }
}

if (fs.existsSync(`${hosting.public}/admin`)) reporter.fail('admin/ must not be present in generated Firebase Hosting output.');
if (fs.existsSync(`${hosting.public}/functions`)) reporter.fail('functions/ must not be present in generated Firebase Hosting output.');
if (!fs.existsSync(`${hosting.public}/.well-known/security.txt`)) {
  reporter.fail('.well-known/security.txt must be present in generated Firebase Hosting output.');
}

const requiredApiFiles = [
  'api/v1/index.json', 'api/v1/schema.json', 'api/v1/search-index.json', 'api/v1/pages.json',
  'api/v1/content.json', 'api/v1/interests.json', 'api/v1/books.json', 'api/v1/skills.json',
  'api/v1/adventures.json', 'api/v1/essays.json', 'api/v1/quotes.json', 'api/v1/products.json',
  'api/v1/ctas.json', 'llms.txt'
];
for (const file of requiredApiFiles) {
  if (!fs.existsSync(`${hosting.public}/${file}`)) reporter.fail(`${file} must be present for crawler and agent ingestion.`);
}

reporter.ok('Firebase deploy surface OK.');
