import * as SecureStore from 'expo-secure-store';

const tokenKey = 'website.github.inbox.token.v2';
const legacyTokenKey = 'website.github.token.v1';
const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export type PublishingCredentials = {
  owner: string;
  repository: string;
  branch: string;
  token: string;
};

export async function savePublishingToken(token: string): Promise<void> {
  const trimmed = token.trim();
  if (!trimmed) throw new Error('Enter a GitHub token.');
  if (trimmed.length > 512 || !/^github_pat_[A-Za-z0-9_]+$/.test(trimmed)) throw new Error('Enter a fine-grained GitHub personal access token.');
  await SecureStore.setItemAsync(tokenKey, trimmed, secureStoreOptions);
  await SecureStore.deleteItemAsync(legacyTokenKey, secureStoreOptions);
}

export async function removePublishingToken(): Promise<void> {
  await SecureStore.deleteItemAsync(tokenKey, secureStoreOptions);
  await SecureStore.deleteItemAsync(legacyTokenKey, secureStoreOptions);
}

export async function getPublishingCredentials(): Promise<PublishingCredentials | null> {
  const token = await SecureStore.getItemAsync(tokenKey, secureStoreOptions);
  if (!token) return null;
  return {
    owner: 'JGOLD43',
    repository: 'jgold-publishing-inbox',
    branch: 'main',
    token,
  };
}
