// Shared path/arg resolvers. Most build scripts boot the same triplet:
//   const ROOT = path.resolve(__dirname, '..');
//   const DIST = process.argv.find((a) => a.startsWith('--dist='))?.slice(7) || ROOT/dist;
//   const FOO = arg('--foo=', default);
// Centralized here so a single fix flows across the whole pipeline.
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');

function flagValue(name, fallback = null) {
  const prefix = name.endsWith('=') ? name : `${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

function distDir() {
  return flagValue('--dist=', null) || path.join(ROOT, 'dist');
}

module.exports = { ROOT, flagValue, distDir };
