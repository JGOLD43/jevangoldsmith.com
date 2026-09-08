import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';

function oauth(responses) {
  const requests = [];
  const fetch = async (url, options) => {
    requests.push({ url, ...options });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return { ok: true, json: async () => next };
  };
  const code = stripTypeScriptTypes(readFileSync(new URL('../src/services/github-oauth.ts', import.meta.url), 'utf8')).replace(/^export /gm, '');
  return { requests, ...new Function('fetch', `${code}\nreturn { beginDeviceAuthorization, pollDeviceAuthorization, renewPublishingSession, verifyPublishingSession };`)(fetch) };
}
const device = { deviceCode: 'test', userCode: 'AAAA-BBBB', expiresAt: Date.now() + 600000, interval: 5 };
const granted = { access_token: 'ghu_test', refresh_token: 'ghr_test', expires_in: 28800, refresh_token_expires_in: 15897600 };

test('device flow uses only public client ID and never asks for broad repo scope', async () => {
  const flow = oauth([{ device_code: 'test', user_code: 'AAAA-BBBB', expires_in: 900, interval: 5 }]);
  assert.equal((await flow.beginDeviceAuthorization()).userCode, 'AAAA-BBBB');
  assert.match(flow.requests[0].body, /client_id=Iv23li7mN75GNJ5pR3Ud/);
  assert.doesNotMatch(flow.requests[0].body, /scope|client_secret/);
});
test('pending approval and rate limiting are distinct from failure', async () => {
  const flow = oauth([{ error: 'authorization_pending' }, { error: 'slow_down' }]);
  assert.deepEqual(await flow.pollDeviceAuthorization(device), { interval: 5 });
  assert.deepEqual(await flow.pollDeviceAuthorization(device), { interval: 10 });
});
test('denied and expired codes produce actionable errors', async () => {
  const flow = oauth([{ error: 'access_denied' }, { error: 'expired_token' }]);
  await assert.rejects(flow.pollDeviceAuthorization(device), /cancelled/);
  await assert.rejects(flow.pollDeviceAuthorization(device), /expired/);
  await assert.rejects(flow.pollDeviceAuthorization({ ...device, expiresAt: 0 }), /expired/);
  assert.equal(flow.requests.length, 2);
});
test('successful approval and renewal retain expiration without a client secret', async () => {
  const flow = oauth([granted, granted]);
  const { session } = await flow.pollDeviceAuthorization(device);
  assert.ok(session.expiresAt > Date.now());
  assert.equal((await flow.renewPublishingSession(session)).accessToken, 'ghu_test');
  assert.match(flow.requests[1].body, /grant_type=refresh_token/);
  assert.doesNotMatch(flow.requests[1].body, /client_secret/);
});
test('issued approval can resume after network interruption without exchanging again', async () => {
  const flow = oauth([]);
  const session = { accessToken: 'ghu_test' };
  assert.equal((await flow.pollDeviceAuthorization({ ...device, session })).session, session);
  assert.equal(flow.requests.length, 0);
});
test('wrong account or missing private inbox cannot connect', async () => {
  const wrong = oauth([{ id: 1 }]);
  await assert.rejects(wrong.verifyPublishingSession('ghu_test'), /JGOLD43/);
  const noInbox = oauth([{ id: 96007276 }, { repositories: [{full_name:'JGOLD43/other',private:true}] }]);
  await assert.rejects(noInbox.verifyPublishingSession('ghu_test'), /private publishing inbox/);
  const publicInbox = oauth([{ id: 96007276 }, { repositories: [{full_name:'JGOLD43/jgold-publishing-inbox',private:false}] }]);
  await assert.rejects(publicInbox.verifyPublishingSession('ghu_test'), /private publishing inbox/);
});
test('registered installation and private inbox are checked before connection', async () => {
  const flow = oauth([{ id: 96007276 }, { repositories: [{full_name:'JGOLD43/jgold-publishing-inbox',private:true}] }]);
  await flow.verifyPublishingSession('ghu_test');
  assert.match(flow.requests[1].url, /159950539\/repositories$/);
});
