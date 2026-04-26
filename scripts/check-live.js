const https = require('https');

const baseUrl = (process.env.LIVE_BASE_URL || 'https://jevangoldsmith.com').replace(/\/$/, '');
const canonicalBaseUrl = (process.env.LIVE_CANONICAL_BASE_URL || baseUrl).replace(/\/$/, '');
const expectedDomain = new URL(canonicalBaseUrl).hostname;
const failures = [];

function fail(message) {
  failures.push(message);
}

function request(path, options = {}) {
  const url = new URL(path, `${baseUrl}/`);
  const method = options.method || 'GET';

  return new Promise((resolve, reject) => {
    const req = https.request(url, { method, timeout: 15000 }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body, url: url.href });
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error(`${method} ${url.href} timed out`));
    });
    req.on('error', reject);
    req.end();
  });
}

function assertStatus(result, expected = 200) {
  if (result.statusCode !== expected) {
    fail(`${result.url} returned ${result.statusCode}, expected ${expected}.`);
  }
}

function assertIncludes(result, text, label) {
  if (!result.body.includes(text)) {
    fail(`${result.url} is missing ${label || text}.`);
  }
}

async function readJson(path) {
  const result = await request(path);
  assertStatus(result);
  const contentType = result.headers['content-type'] || '';
  if (!/application\/json|text\/plain|application\/octet-stream/i.test(contentType)) {
    fail(`${result.url} returned content-type "${contentType}", expected JSON.`);
  }
  try {
    return JSON.parse(result.body);
  } catch (error) {
    fail(`${result.url} did not return valid JSON: ${error.message}`);
    return null;
  }
}

async function main() {
  const home = await request('/');
  assertStatus(home);
  assertIncludes(home, '<link rel="canonical"', 'canonical link');
  assertIncludes(home, '<meta property="og:title"', 'Open Graph title');
  assertIncludes(home, '<script type="application/ld+json">', 'JSON-LD');

  const server = String(home.headers.server || '');
  if (/github/i.test(server)) {
    fail(`${baseUrl} is still served by GitHub Pages. Expected generated Firebase Hosting output.`);
  }

  for (const header of ['content-security-policy', 'x-content-type-options', 'referrer-policy', 'permissions-policy']) {
    if (!home.headers[header]) fail(`${baseUrl}/ is missing ${header} header.`);
  }

  const robots = await request('/robots.txt');
  assertStatus(robots);
  assertIncludes(robots, `Sitemap: ${canonicalBaseUrl}/sitemap.xml`, 'Sitemap directive');
  assertIncludes(robots, `AI-Agent-Index: ${canonicalBaseUrl}/llms.txt`, 'AI-Agent-Index directive');
  assertIncludes(robots, `Content-API: ${canonicalBaseUrl}/api/v1/index.json`, 'Content-API directive');

  const sitemap = await request('/sitemap.xml');
  assertStatus(sitemap);
  assertIncludes(sitemap, '<urlset', 'sitemap urlset');
  assertIncludes(sitemap, `<loc>${canonicalBaseUrl}/</loc>`, 'home sitemap entry');
  if (/Page not found|GitHub Pages/i.test(sitemap.body)) {
    fail(`${baseUrl}/sitemap.xml is returning a hosting 404 page.`);
  }

  const llms = await request('/llms.txt');
  assertStatus(llms);
  const apiIndexPaths = [`${canonicalBaseUrl}/api/v1/index.json`, `${baseUrl}/api/v1/index.json`];
  if (!apiIndexPaths.some((link) => llms.body.includes(link))) {
    fail(`${llms.url} is missing agent API index link.`);
  }

  const apiIndex = await readJson('/api/v1/index.json');
  if (apiIndex) {
    if (apiIndex.version !== '1.0') fail('/api/v1/index.json must declare version 1.0.');
    if (apiIndex.site?.domain !== expectedDomain) {
      fail(`/api/v1/index.json site.domain is "${apiIndex.site?.domain}", expected "${expectedDomain}".`);
    }
    if (!apiIndex.endpoints?.pages || !apiIndex.guidance?.preferredIngestion) {
      fail('/api/v1/index.json is missing endpoints.pages or ingestion guidance.');
    }
  }

  const pages = await readJson('/api/v1/pages.json');
  if (pages && (!Array.isArray(pages) || pages.length < 10)) {
    fail('/api/v1/pages.json should expose the generated page inventory.');
  }

  const keyPages = ['/', '/books.html', '/essays.html', '/products.html', '/topics/better-thinking.html'];
  for (const path of keyPages) {
    const result = await request(path);
    assertStatus(result);
    assertIncludes(result, '<link rel="canonical"', 'canonical link');
    assertIncludes(result, '<meta property="og:title"', 'Open Graph title');
  }

  if (failures.length > 0) {
    console.error(`Live check failed for ${baseUrl}:`);
    for (const failure of failures) console.error(`  ${failure}`);
    process.exit(1);
  }

  console.log(`Live production OK (${baseUrl}).`);
}

main().catch((error) => {
  console.error(`Live check failed for ${baseUrl}: ${error.message}`);
  process.exit(1);
});
