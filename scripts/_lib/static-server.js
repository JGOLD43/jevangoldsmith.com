// Tiny static-file server. Replaces the `http-server` devDep for verify.js
// and any local QA against `dist/`. ~30 LOC, zero deps, supports the URL
// shapes Firebase Hosting serves (`/foo` → `foo.html`, `/foo/` → `foo/index.html`).
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const url = require('node:url');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.avif': 'image/avif',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8'
};

function resolve(root, reqPath) {
  const safe = path.normalize(reqPath).replace(/^([./\\])+/, '');
  const direct = path.join(root, safe);
  const candidates = [direct, `${direct}.html`, path.join(direct, 'index.html')];
  for (const c of candidates) {
    if (c.startsWith(root) && fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

function serve(root, port) {
  const server = http.createServer((req, res) => {
    const { pathname } = url.parse(req.url);
    const file = resolve(root, decodeURIComponent(pathname));
    if (!file) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(port, '127.0.0.1', () => ok(server)));
}

module.exports = { serve };
