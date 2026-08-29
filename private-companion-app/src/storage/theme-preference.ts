import * as SecureStore from 'expo-secure-store';

import type { ThemeMode } from '@/constants/theme';

const THEME_PREFERENCE_KEY = 'private-companion-theme';
const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export async function loadThemePreference(): Promise<ThemeMode | null> {
  const stored = await SecureStore.getItemAsync(THEME_PREFERENCE_KEY, secureStoreOptions);
  return stored === 'dark' || stored === 'light' ? stored : null;
}

export async function saveThemePreference(theme: ThemeMode): Promise<void> {
  await SecureStore.setItemAsync(THEME_PREFERENCE_KEY, theme, secureStoreOptions);
}
