import * as SecureStore from 'expo-secure-store';
import { renewPublishingSession, verifyPublishingSession, type PublishingSession, type DeviceAuthorization } from '@/services/github-oauth';

const tokenKey = 'website.github.inbox.token.v2';
const legacyTokenKey = 'website.github.token.v1';
const sessionKey = 'website.github.inbox.session.v3';
const pendingKey = 'website.github.inbox.pending.v3';
const secureStoreOptions: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
let generation = 0;
let renewing: Promise<PublishingSession> | null = null;
export type PublishingCredentials = { owner: string; repository: string; branch: string; token: string };

export async function savePublishingSession(session: PublishingSession): Promise<void> {
  const expected = generation;
  await verifyPublishingSession(session.accessToken);
  if (expected !== generation) throw new Error('Connection cancelled.');
  generation++;
  await SecureStore.setItemAsync(sessionKey, JSON.stringify(session), secureStoreOptions);
  await SecureStore.deleteItemAsync(tokenKey, secureStoreOptions);
  await SecureStore.deleteItemAsync(legacyTokenKey, secureStoreOptions);
  await savePendingAuthorization(null);
}
export async function savePendingAuthorization(device: DeviceAuthorization | null): Promise<void> {
  if (device) await SecureStore.setItemAsync(pendingKey, JSON.stringify(device), secureStoreOptions);
  else await SecureStore.deleteItemAsync(pendingKey, secureStoreOptions);
}
export async function getPendingAuthorization(): Promise<DeviceAuthorization | null> {
  const raw = await SecureStore.getItemAsync(pendingKey, secureStoreOptions);
  if (!raw) return null;
  const device = JSON.parse(raw) as DeviceAuthorization;
  if (device.expiresAt <= Date.now() && !device.session) { await savePendingAuthorization(null); return null; }
  return device;
}
export async function removePublishingToken(): Promise<void> {
  generation++;
  await SecureStore.deleteItemAsync(sessionKey, secureStoreOptions);
  await SecureStore.deleteItemAsync(tokenKey, secureStoreOptions);
  await SecureStore.deleteItemAsync(legacyTokenKey, secureStoreOptions);
  await savePendingAuthorization(null);
}
export async function hasPublishingCredentials(): Promise<boolean> {
  return Boolean(await SecureStore.getItemAsync(sessionKey, secureStoreOptions) || await SecureStore.getItemAsync(tokenKey, secureStoreOptions));
}
export async function getPublishingCredentials(): Promise<PublishingCredentials | null> {
  const raw = await SecureStore.getItemAsync(sessionKey, secureStoreOptions);
  let token: string | null;
  if (raw) {
    let session = JSON.parse(raw) as PublishingSession;
    if (session.expiresAt <= Date.now() + 60000) {
      if (!renewing) {
        const expected = generation;
        renewing = (async () => {
          const next = await renewPublishingSession(session);
          if (expected !== generation) throw new Error('Publishing was disconnected.');
          await SecureStore.setItemAsync(sessionKey, JSON.stringify(next), secureStoreOptions);
          return next;
        })().finally(() => { renewing = null; });
      }
      session = await renewing;
    }
    token = session.accessToken;
  } else token = await SecureStore.getItemAsync(tokenKey, secureStoreOptions);
  if (!token) return null;
  return { owner: 'JGOLD43', repository: 'jgold-publishing-inbox', branch: 'main', token };
}
