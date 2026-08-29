import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const settingsPath = new URL('../src/app/settings.tsx', import.meta.url);

test('Settings uses compact grouped rows with progressive disclosure', async () => {
  const settings = await readFile(settingsPath, 'utf8');

  assert.match(settings, /function SettingsGroup/);
  assert.match(settings, /function SettingsRow/);
  assert.match(settings, /publishingExpanded/);
  assert.match(settings, /securityExpanded/);
  assert.match(settings, /Lock JGOLD now/);
  assert.match(settings, /Software Update/);
  assert.match(settings, /borderBottomWidth: StyleSheet\.hairlineWidth/);
  assert.doesNotMatch(settings, /Control and clarity/);
});
