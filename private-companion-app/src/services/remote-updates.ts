import * as Updates from 'expo-updates';

export type RemoteUpdateResult = 'disabled' | 'current' | 'downloaded';

export function remoteUpdatesEnabled() {
  return Updates.isEnabled;
}

export async function checkForRemoteUpdate(): Promise<RemoteUpdateResult> {
  if (!Updates.isEnabled) return 'disabled';

  const result = await Updates.checkForUpdateAsync();
  if (!result.isAvailable) return 'current';

  await Updates.fetchUpdateAsync();
  return 'downloaded';
}

export async function applyDownloadedUpdate() {
  await Updates.reloadAsync();
}
