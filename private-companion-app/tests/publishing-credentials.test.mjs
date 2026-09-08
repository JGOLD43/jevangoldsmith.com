import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';
const sessionKey = 'website.github.inbox.session.v3';
const pendingKey = 'website.github.inbox.pending.v3';
const fresh = {accessToken:'ghu_new',refreshToken:'ghr_new',expiresAt:Date.now()+3600000,refreshExpiresAt:Date.now()+90000000};
function storage(initial={}, {renew=async()=>fresh, verify=async()=>{}}={}) {
  const values = new Map(Object.entries(initial));
  const SecureStore = {getItemAsync:async key=>values.get(key)??null,setItemAsync:async(key,value)=>values.set(key,value),deleteItemAsync:async key=>values.delete(key),WHEN_UNLOCKED_THIS_DEVICE_ONLY:'device'};
  const code = stripTypeScriptTypes(readFileSync(new URL('../src/storage/publishing-credentials.ts',import.meta.url),'utf8')).replace(/^import .*;$/gm,'').replace(/^export /gm,'');
  return {...new Function('SecureStore','renewPublishingSession','verifyPublishingSession',`${code}\nreturn {savePublishingSession,getPublishingCredentials,hasPublishingCredentials,removePublishingToken,getPendingAuthorization};`)(SecureStore,renew,verify),values};
}
test('failed sign-in verification leaves existing credential intact',async()=>{
  const service=storage({[sessionKey]:JSON.stringify(fresh)},{verify:async()=>{throw new Error('offline')}});
  await assert.rejects(service.savePublishingSession({...fresh,accessToken:'ghu_bad'}),/offline/);
  assert.equal((await service.getPublishingCredentials()).token,'ghu_new');
});
test('concurrent publications share one credential renewal',async()=>{
  let renewals=0;
  const service=storage({[sessionKey]:JSON.stringify({...fresh,expiresAt:0})},{renew:async()=>{renewals++;await new Promise(r=>setTimeout(r,10));return fresh}});
  const results=await Promise.all([service.getPublishingCredentials(),service.getPublishingCredentials()]);
  assert.equal(renewals,1);
  assert.equal(results[0].token,results[1].token);
  assert.equal(JSON.parse(service.values.get(sessionKey)).refreshToken,'ghr_new');
});
test('disconnect during renewal cannot restore the removed connection',async()=>{
  let finish;
  const service=storage({[sessionKey]:JSON.stringify({...fresh,expiresAt:0})},{renew:()=>new Promise(r=>{finish=r})});
  const refreshing=service.getPublishingCredentials();
  await new Promise(r=>setImmediate(r));
  await service.removePublishingToken();
  finish(fresh);
  await assert.rejects(refreshing,/disconnected/);
  assert.equal(await service.hasPublishingCredentials(),false);
});
test('connection presence can be read offline without refreshing',async()=>{
  const service=storage({[sessionKey]:JSON.stringify({...fresh,expiresAt:0})},{renew:async()=>{throw new Error('should not run')}});
  assert.equal(await service.hasPublishingCredentials(),true);
});
test('approved session survives code expiry for verification retry',async()=>{
  const service=storage({[pendingKey]:JSON.stringify({expiresAt:0,session:fresh})});
  assert.equal((await service.getPendingAuthorization()).session.accessToken,'ghu_new');
});
