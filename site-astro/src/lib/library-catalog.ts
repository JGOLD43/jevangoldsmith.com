// Build-time catalogue shared by shelf, detail pages and collection guides.
import archive from '../../../data/learning-archive.json';
import additions from '../../../data/library-additions.json';
import corrections from '../../../data/library-material-corrections.json';
import collectionData from '../../../data/library-collections.json';
import videoArtworks from '../../../data/library-video-artwork.json';
import artArtworks from '../../../data/library-art-artwork.json';
import { archiveVolume, type ArchiveItem, type LibraryClassification, type ArtArtwork } from './library-materials';
import type { VideoArtwork } from './video-artwork';

const corrected = corrections as Record<string, Partial<ArchiveItem>>;
export const libraryMaterials = [...archive.items, ...additions].map((entry) => {
  const item = { ...entry, ...corrected[entry.id] };
  return archiveVolume(item, (collectionData.items as Record<string, LibraryClassification>)[item.id],
    (videoArtworks as Record<string, VideoArtwork>)[item.id], (artArtworks as Record<string, ArtArtwork>)[item.id]);
});
