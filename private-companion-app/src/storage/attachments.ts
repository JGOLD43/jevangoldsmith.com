import { AESEncryptionKey, aesEncryptAsync } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { excludeFromDeviceBackup } from './backup-exclusion';
import { getOrCreateVaultKey } from './keys';

async function encryptAsset(uri: string): Promise<string> {
  const source = new File(uri);
  const plaintext = await source.bytes();
  const rawKey = await getOrCreateVaultKey();
  const encryptionKey = (await AESEncryptionKey.import(rawKey, 'hex')) as AESEncryptionKey;
  const sealed = await aesEncryptAsync(plaintext, encryptionKey);
  const encrypted = await sealed.combined();

  const vaultDirectory = new Directory(Paths.document, 'private-vault');
  vaultDirectory.create({ idempotent: true, intermediates: true });
  const excluded = await excludeFromDeviceBackup(vaultDirectory.uri);
  if (!excluded) throw new Error('The private attachment directory could not be excluded from device backup.');
  const destination = new File(vaultDirectory, `${Date.now()}-${Math.random().toString(16).slice(2)}.vault`);
  destination.create({ intermediates: true });
  destination.write(encrypted);
  return destination.uri;
}

export async function importPrivatePhoto(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Photo library permission was not granted.');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
    selectionLimit: 1,
  });
  if (result.canceled) return null;
  return encryptAsset(result.assets[0].uri);
}

export async function capturePrivatePhoto(): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error('Camera permission was not granted.');

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
  });
  if (result.canceled) return null;
  return encryptAsset(result.assets[0].uri);
}

export function removePrivateAttachment(uri: string): void {
  const file = new File(uri);
  if (file.exists) file.delete();
}
