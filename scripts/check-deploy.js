const fs = require('fs');

const firebase = JSON.parse(fs.readFileSync('firebase.json', 'utf8'));
const config = JSON.parse(fs.readFileSync('data/site.config.json', 'utf8'));
const hosting = firebase.hosting || {};
const headers = Array.isArray(hosting.headers) ? hosting.headers : [];
const allHeaders = headers.flatMap((entry) => entry.headers || []);
const headerNames = new Set(allHeaders.map((header) => header.key.toLowerCase()));
const requiredHeaders = [
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
  'content-security-policy'
];

const missing = requiredHeaders.filter((name) => !headerNames.has(name));

if (hosting.public !== config.hosting.public) {
  console.error(`Expected Firebase hosting public directory to be "${config.hosting.public}", got "${hosting.public}".`);
  process.exitCode = 1;
}

const ignore = new Set(hosting.ignore || []);
if (!ignore.has('admin/**')) {
  console.error('admin/** must stay out of Firebase Hosting until admin writes are server-enforced.');
  process.exitCode = 1;
}

if (Array.isArray(hosting.rewrites) && hosting.rewrites.some((rewrite) => rewrite.function)) {
  console.error('Function rewrites are enabled. Remove unused function rewrites or add an explicit API check.');
  process.exitCode = 1;
}

if (missing.length > 0) {
  console.error(`Missing Firebase security headers: ${missing.join(', ')}`);
  process.exitCode = 1;
}

const csp = allHeaders.find((header) => header.key.toLowerCase() === 'content-security-policy')?.value || '';
const expectedCsp = Object.entries(config.csp)
  .map(([directive, values]) => `${directive} ${values.join(' ')}`)
  .join('; ');
if (csp !== expectedCsp) {
  console.error('Firebase CSP differs from data/site.config.json.');
  process.exitCode = 1;
}

for (const directive of ['default-src', 'script-src', 'style-src', 'img-src', 'connect-src', 'form-action']) {
  if (!csp.includes(directive)) {
    console.error(`Content-Security-Policy is missing ${directive}.`);
    process.exitCode = 1;
  }
}

const rootHtml = fs.readdirSync('.').filter((file) => file.endsWith('.html'));
const pageCsp = rootHtml.filter((file) => fs.readFileSync(file, 'utf8').includes('Content-Security-Policy'));
if (pageCsp.length > 0) {
  console.error(`Root HTML files still contain per-page CSP meta tags: ${pageCsp.join(', ')}`);
  process.exitCode = 1;
}

if (!fs.existsSync(hosting.public)) {
  console.error(`${hosting.public}/ is missing. Run npm run build before deploying.`);
  process.exitCode = 1;
}

const distHtml = fs.existsSync(hosting.public) ? fs.readdirSync(hosting.public).filter((file) => file.endsWith('.html')) : [];
const distCsp = distHtml.filter((file) => fs.readFileSync(`${hosting.public}/${file}`, 'utf8').includes('Content-Security-Policy'));
if (distCsp.length > 0) {
  console.error(`Generated HTML files still contain per-page CSP meta tags: ${distCsp.join(', ')}`);
  process.exitCode = 1;
}

const deployedAdmin = fs.existsSync(`${hosting.public}/admin`);
if (deployedAdmin) {
  console.error('admin/ must not be present in generated Firebase Hosting output.');
  process.exitCode = 1;
}

const deployedFunctions = fs.existsSync(`${hosting.public}/functions`);
if (deployedFunctions) {
  console.error('functions/ must not be present in generated Firebase Hosting output.');
  process.exitCode = 1;
}

if (!fs.existsSync(`${hosting.public}/.well-known/security.txt`)) {
  console.error('.well-known/security.txt must be present in generated Firebase Hosting output.');
  process.exitCode = 1;
}

for (const file of [
  'api/v1/index.json',
  'api/v1/schema.json',
  'api/v1/search-index.json',
  'api/v1/pages.json',
  'api/v1/content.json',
  'api/v1/interests.json',
  'api/v1/books.json',
  'api/v1/skills.json',
  'api/v1/adventures.json',
  'api/v1/essays.json',
  'api/v1/quotes.json',
  'api/v1/products.json',
  'api/v1/ctas.json',
  'llms.txt'
]) {
  if (!fs.existsSync(`${hosting.public}/${file}`)) {
    console.error(`${file} must be present for crawler and agent ingestion.`);
    process.exitCode = 1;
  }
}

const generatedHtml = fs.existsSync(hosting.public) ? fs.readdirSync(hosting.public).filter((file) => file.endsWith('.html')) : [];
const externalUnpkg = generatedHtml.filter((file) => fs.readFileSync(`${hosting.public}/${file}`, 'utf8').includes('https://unpkg.com'));
if (externalUnpkg.length > 0) {
  console.error(`Generated HTML still references unpkg.com: ${externalUnpkg.join(', ')}`);
  process.exitCode = 1;
}

if (process.exitCode) process.exit(process.exitCode);

console.log('Firebase deploy surface OK.');
