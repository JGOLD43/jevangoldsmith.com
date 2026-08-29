import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const VAULT_KEY = 'jevans.private-companion.vault-key.v1';

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

const keyOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  keychainService: 'com.jevangoldsmith.companion.vault',
};

export async function getOrCreateVaultKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(VAULT_KEY, keyOptions);
  if (existing) return existing;

  const key = toHex(await Crypto.getRandomBytesAsync(32));
  await SecureStore.setItemAsync(VAULT_KEY, key, keyOptions);
  return key;
}

