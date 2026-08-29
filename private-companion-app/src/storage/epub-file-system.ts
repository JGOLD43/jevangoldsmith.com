import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useState } from 'react';

// epubjs-react-native currently imports removed legacy methods from the main
// Expo FileSystem entry point. This small adapter deliberately uses Expo 57's
// supported legacy entry point until the reader package adopts File/Directory.
export function useEpubFileSystem() {
  const [file, setFile] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [size, setSize] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const downloadFile = useCallback(async (fromUrl: string, toFile: string) => {
    setDownloading(true);
    try {
      const task = FileSystem.createDownloadResumable(
        fromUrl,
        `${FileSystem.documentDirectory}${toFile}`,
        {},
        ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
          setProgress(totalBytesExpectedToWrite > 0
            ? Math.round((totalBytesWritten / totalBytesExpectedToWrite) * 100)
            : 0);
        },
      );
      const value = await task.downloadAsync();
      if (!value) throw new Error('Download failed');
      const contentLength = value.headers?.['Content-Length'] ?? value.headers?.['content-length'];
      if (contentLength) setSize(Number(contentLength));
      setSuccess(true);
      setError(null);
      setFile(value.uri);
      return { uri: value.uri, mimeType: value.mimeType ?? null };
    } catch (cause) {
      setSuccess(false);
      setError(cause instanceof Error ? cause.message : 'Error downloading file');
      return { uri: null, mimeType: null };
    } finally {
      setDownloading(false);
    }
  }, []);

  const getFileInfo = useCallback(async (fileUri: string) => {
    const info = await FileSystem.getInfoAsync(fileUri);
    return {
      uri: info.uri,
      exists: info.exists,
      isDirectory: info.exists ? info.isDirectory : false,
      size: info.exists ? info.size : undefined,
    };
  }, []);

  return {
    file,
    progress,
    downloading,
    size,
    error,
    success,
    documentDirectory: FileSystem.documentDirectory ?? '',
    cacheDirectory: FileSystem.cacheDirectory ?? '',
    bundleDirectory: FileSystem.bundleDirectory ?? undefined,
    readAsStringAsync: FileSystem.readAsStringAsync,
    writeAsStringAsync: FileSystem.writeAsStringAsync,
    deleteAsync: FileSystem.deleteAsync,
    downloadFile,
    getFileInfo,
  };
}
