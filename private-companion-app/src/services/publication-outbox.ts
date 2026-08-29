import type { PublicationJob } from '@/domain/models';
import type { PublishManifest } from '@/domain/privacy';
import { listPublicationJobs, queuePublicationJob, updatePublicationJob } from '@/storage/publication-repository';

import { hasPublishingConnection, publishManifest } from './publishing';

async function attempt(job: PublicationJob): Promise<PublicationJob> {
  if (!(await hasPublishingConnection())) return job;
  try {
    const result = await publishManifest(JSON.parse(job.manifestJson) as PublishManifest);
    return updatePublicationJob(job.id, 'submitted', { commitUrl: result.commitUrl ?? null });
  } catch (cause) {
    return updatePublicationJob(job.id, 'failed', {
      error: cause instanceof Error ? cause.message : 'Website submission failed.',
    });
  }
}

export async function queueAndAttemptPublication(manifest: PublishManifest, localId: string): Promise<PublicationJob> {
  return attempt(await queuePublicationJob(manifest, localId));
}

export async function retryPendingPublications(): Promise<PublicationJob[]> {
  const jobs = await listPublicationJobs();
  if (!(await hasPublishingConnection())) return jobs;
  const results: PublicationJob[] = [];
  for (const job of jobs) {
    results.push(job.status === 'submitted' ? job : await attempt(job));
  }
  return results;
}
