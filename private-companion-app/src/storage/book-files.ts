import {
  AESEncryptionKey,
  AESSealedData,
  CryptoDigestAlgorithm,
  aesDecryptAsync,
  aesEncryptAsync,
  digest,
} from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';

import type { BookFormat } from '@/domain/models';

import { excludeFromDeviceBackup } from './backup-exclusion';
import { getOrCreateVaultKey } from './keys';

const MAX_BOOK_BYTES = 200 * 1024 * 1024;

function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function formatFor(name: string, mimeType?: string | null): BookFormat | null {
  const lower = name.toLowerCase();
  if (lower.endsWith('.epub') || mimeType === 'application/epub+zip') return 'epub';
  if (lower.endsWith('.pdf') || mimeType === 'application/pdf') return 'pdf';
  return null;
}

async function encryptionKey(): Promise<AESEncryptionKey> {
  return AESEncryptionKey.import(await getOrCreateVaultKey(), 'hex') as Promise<AESEncryptionKey>;
}

export type ImportedBookFile = {
  encryptedFileUri: string;
  fileHash: string;
  format: BookFormat;
  originalFileName: string;
  suggestedTitle: string;
};

export async function importBookFile(): Promise<ImportedBookFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  const format = formatFor(asset.name, asset.mimeType);
  if (!format) throw new Error('Choose a DRM-free EPUB or PDF file.');
  if (asset.size && asset.size > MAX_BOOK_BYTES) throw new Error('This first release supports books up to 200 MB.');

  const source = new File(asset.uri);
  const bytes = await source.bytes();
  if (bytes.byteLength > MAX_BOOK_BYTES) throw new Error('This first release supports books up to 200 MB.');
  const fileHash = hex(await digest(CryptoDigestAlgorithm.SHA256, bytes));
  const sealed = await aesEncryptAsync(bytes, await encryptionKey());

  const directory = new Directory(Paths.document, 'private-books');
  directory.create({ idempotent: true, intermediates: true });
  if (!(await excludeFromDeviceBackup(directory.uri))) throw new Error('The private library could not be excluded from device backup.');
  const destination = new File(directory, `${fileHash}.book`);
  if (!destination.exists) {
    destination.create({ intermediates: true });
    destination.write(await sealed.combined());
  }

  return {
    encryptedFileUri: destination.uri,
    fileHash,
    format,
    originalFileName: asset.name,
    suggestedTitle: asset.name.replace(/\.(epub|pdf)$/i, '').replace(/[_-]+/g, ' ').trim(),
  };
}

export async function prepareBookForReading(encryptedUri: string, format: BookFormat): Promise<string> {
  if (format === 'metadata') throw new Error('Attach a DRM-free EPUB or PDF before opening this book.');
  const encrypted = await new File(encryptedUri).bytes();
  const sealed = AESSealedData.fromCombined(encrypted);
  const plaintext = await aesDecryptAsync(sealed, await encryptionKey());
  const cache = new Directory(Paths.cache, 'private-reader');
  cache.create({ idempotent: true, intermediates: true });
  const output = new File(cache, `${Date.now()}-${Math.random().toString(16).slice(2)}.${format}`);
  output.create({ intermediates: true });
  output.write(plaintext);
  return output.uri;
}

export function removePreparedBook(uri: string | null): void {
  if (!uri) return;
  const file = new File(uri);
  if (file.exists) file.delete();
}

export function removeEncryptedBook(uri: string | null): void {
  if (!uri) return;
  const file = new File(uri);
  if (file.exists) file.delete();
}
