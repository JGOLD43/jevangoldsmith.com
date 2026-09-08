#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

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

const releasePath = path.join(APP, 'src/constants/release.json');
const config = JSON.parse(fs.readFileSync(path.join(APP, 'app.json'), 'utf8')).expo;
const previous = JSON.parse(fs.readFileSync(releasePath, 'utf8'));
const revision = previous.baseVersion === config.version ? previous.revision + 1 : 1;
const label = `${config.version}-update.${revision}`;
const release = { baseVersion: config.version, revision, label, releasedAt: new Date().toISOString(), notes: message };
fs.writeFileSync(releasePath, `${JSON.stringify(release, null, 2)}\n`);
const releaseMessage = `v${label}: ${message}`;
console.log(`[release:app] preparing ${label} for Android runtime ${config.version}`);
console.log('[release:app] verifying Android app');
run('npm', ['run', 'verify']);

console.log('[release:app] publishing verified Android bundle to preview');
const published = run('npx', [
  'eas-cli@latest', 'update', '--channel', 'preview', '--platform', 'android',
  '--message', releaseMessage, '--environment', 'preview',
]);
const group = published.match(/Update group ID\s+([0-9a-f-]{36})/i)?.[1];
if (!group) {
  console.error('[release:app] Expo published no detectable update group; production was not changed.');
  process.exit(1);
}

console.log(`[release:app] promoting exact group ${group} to production`);
const promoted = run('npx', [
  'eas-cli@latest', 'update:republish', '--group', group,
  '--destination-channel', 'production', '--platform', 'android',
  '--message', releaseMessage, '--non-interactive',
]);

console.log('[release:app] verifying production assignment');
const production = run('npx', [
  'eas-cli@latest', 'update:list', '--branch', 'production',
  '--limit', '1', '--json', '--non-interactive',
]);
const productionGroup = promoted.match(/Update group ID\s+([0-9a-f-]{36})/i)?.[1];
if (!productionGroup || !production.includes(productionGroup) || !production.includes(releaseMessage)) {
  console.error('[release:app] Production does not report the new release message.');
  process.exit(1);
}
const historyPath = path.join(APP, 'release-history.json');
const history = fs.existsSync(historyPath) ? JSON.parse(fs.readFileSync(historyPath, 'utf8')) : [];
history.unshift({ ...release, previewGroup: group, productionGroup, platform: 'android', channel: 'production' });
fs.writeFileSync(historyPath, `${JSON.stringify(history, null, 2)}\n`);
console.log(`[release:app] complete: ${label} (${productionGroup})`);
