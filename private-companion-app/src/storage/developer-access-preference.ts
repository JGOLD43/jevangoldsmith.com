import * as SecureStore from 'expo-secure-store';

const DEVELOPER_ACCESS_KEY = 'private-companion-developer-access';
const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export async function loadDeveloperAccessEnabled(): Promise<boolean> {
  return (await SecureStore.getItemAsync(DEVELOPER_ACCESS_KEY, secureStoreOptions)) === 'true';
}

export async function saveDeveloperAccessEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(DEVELOPER_ACCESS_KEY, String(enabled), secureStoreOptions);
}
