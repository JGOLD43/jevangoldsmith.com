#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const APP = path.join(ROOT, 'private-companion-app');
const message = process.argv.slice(2).join(' ').trim();

if (!message) {
  console.error('Usage: npm run release:app -- "Describe the update"');
  process.exit(1);
}

function run(bin, args, options = {}) {
  const result = spawnSync(bin, args, {
    cwd: APP,
    encoding: 'utf8',
    env: { ...process.env, CI: '1' },
    ...options,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) process.exit(result.status || 1);
  return `${result.stdout || ''}\n${result.stderr || ''}`;
}

console.log('[release:app] verifying Android app');
run('npm', ['run', 'verify']);

console.log('[release:app] publishing verified Android bundle to preview');
const published = run('npx', [
  'eas-cli@latest', 'update', '--channel', 'preview', '--platform', 'android',
  '--message', message, '--environment', 'preview',
]);
const group = published.match(/Update group ID\s+([0-9a-f-]{36})/i)?.[1];
if (!group) {
  console.error('[release:app] Expo published no detectable update group; production was not changed.');
  process.exit(1);
}

console.log(`[release:app] promoting exact group ${group} to production`);
run('npx', [
  'eas-cli@latest', 'update:republish', '--group', group,
  '--destination-channel', 'production', '--platform', 'android',
  '--message', message, '--non-interactive',
]);

console.log('[release:app] verifying production assignment');
const production = run('npx', [
  'eas-cli@latest', 'update:list', '--branch', 'production',
  '--limit', '1', '--json', '--non-interactive',
]);
if (!production.includes(message)) {
  console.error('[release:app] Production does not report the new release message.');
  process.exit(1);
}
console.log('[release:app] complete');
