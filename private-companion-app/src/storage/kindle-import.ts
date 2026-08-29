import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

import { parseKindleImport, parseKindleNotebookHtml, type KindleImportDocument } from '@/services/kindle-import';

const MAX_IMPORT_BYTES = 25 * 1024 * 1024;

export async function pickKindleImport(): Promise<KindleImportDocument | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/html', 'application/xhtml+xml'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (asset.size && asset.size > MAX_IMPORT_BYTES) throw new Error('The Kindle import is larger than 25 MB.');
  return loadKindleImportFile(asset.uri, asset.name);
}

export async function loadKindleImportFile(uri: string, name = ''): Promise<KindleImportDocument> {
  const source = new File(uri);
  if (source.size && source.size > MAX_IMPORT_BYTES) throw new Error('The Kindle import is larger than 25 MB.');
  const contents = await source.text();
  return /\.html?(?:$|[?#])/i.test(name || uri)
    ? parseKindleNotebookHtml(contents, name || source.name)
    : parseKindleImport(contents);
}
