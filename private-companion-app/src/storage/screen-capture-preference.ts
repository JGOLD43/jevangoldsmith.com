import * as SecureStore from 'expo-secure-store';

const SCREENSHOTS_ALLOWED_KEY = 'private-companion-screenshots-allowed';
const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export async function loadScreenshotsAllowed(): Promise<boolean> {
  return (await SecureStore.getItemAsync(SCREENSHOTS_ALLOWED_KEY, secureStoreOptions)) === 'true';
}

export async function saveScreenshotsAllowed(allowed: boolean): Promise<void> {
  await SecureStore.setItemAsync(SCREENSHOTS_ALLOWED_KEY, String(allowed), secureStoreOptions);
}
