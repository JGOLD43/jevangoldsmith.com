import LocalOnlyStorage from '../../modules/local-only-storage/src/LocalOnlyStorageModule';

export function excludeFromDeviceBackup(path: string): Promise<boolean> {
  return LocalOnlyStorage.excludeFromBackupAsync(path);
}

