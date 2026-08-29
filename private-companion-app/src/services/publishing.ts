import type { PublishManifest } from '@/domain/privacy';
import { githubPublishingConfigured, publishManifestToGithub } from './github-publishing';

type PublishResponse = {
  status: 'ready' | 'published';
  previewUrl?: string;
  commitUrl?: string;
};

export function isPublishingConfigured(): boolean {
  return true;
}

export async function hasPublishingConnection(): Promise<boolean> {
  return githubPublishingConfigured();
}

export async function publishManifest(manifest: PublishManifest): Promise<PublishResponse> {
  return publishManifestToGithub(manifest);
}
