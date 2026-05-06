#!/usr/bin/env node
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DIST = process.argv.find((arg) => arg.startsWith('--dist='))?.slice(7) || path.join(ROOT, 'dist');
const swPath = path.join(DIST, 'service-worker.js');

if (!fs.existsSync(swPath)) {
  console.warn('[sw-version] no service-worker.js in dist');
  process.exit(0);
}

function buildHash() {
  if (process.env.BUILD_HASH) return process.env.BUILD_HASH;
  try {
    return execSync('git rev-parse --short=12 HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return String(Date.now());
  }
}

const hash = buildHash().replace(/[^a-zA-Z0-9._-]/g, '');
let source = fs.readFileSync(swPath, 'utf8');
source = source.replace(/const CACHE_HTML = 'jg-html-v[^']+';/, `const CACHE_HTML = 'jg-html-${hash}';`);
source = source.replace(/const CACHE_ASSETS = 'jg-assets-v[^']+';/, `const CACHE_ASSETS = 'jg-assets-${hash}';`);
source = source.replace(/const CACHE_IMG = 'jg-img-v[^']+';/, `const CACHE_IMG = 'jg-img-${hash}';`);
fs.writeFileSync(swPath, source);
console.log(`[sw-version] cache names include ${hash}`);
