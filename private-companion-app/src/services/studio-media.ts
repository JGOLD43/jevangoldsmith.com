import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import type { StudioMediaBlock } from '@/domain/studio-document.cjs';

export const studioMediaDirectory = () => new Directory(Paths.document, 'studio-media');

export async function pickStudioMedia(type: 'image' | 'video'): Promise<StudioMediaBlock | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: type === 'image' ? ['images'] : ['videos'], quality: 0.85 });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const source = new File(asset.uri);
  if (source.size > 20 * 1024 * 1024) throw new Error('Choose a photo or video under 20 MB. Trim longer videos first.');
  const extension = source.extension.toLowerCase().replace('.', '').replace('jpeg', 'jpg');
  if (!(type === 'image' ? ['jpg', 'png', 'webp'] : ['mp4', 'webm']).includes(extension)) throw new Error(type === 'image' ? 'Choose a JPEG, PNG or WebP photo.' : 'Choose an MP4 or WebM video.');
  const directory = studioMediaDirectory();
  directory.create({ intermediates: true, idempotent: true });
  const saved = new File(directory, `${Crypto.randomUUID()}.${extension}`);
  source.copy(saved);
  return { type, src: saved.uri, caption: '' };
}
