import type { PublicationJob } from '@/domain/models';
import type { PublishManifest } from '@/domain/privacy';
import { listPublicationJobs, queuePublicationJob, updatePublicationJob } from '@/storage/publication-repository';

import { publicationPageUrl } from './site-navigation';
import { loadStudioSnapshot } from './public-site';
import { publicationJobId } from './github-publishing';
import { hasPublishingConnection, publishManifest } from './publishing';

const attempts = new Map<string, Promise<PublicationJob>>();
function attempt(job: PublicationJob): Promise<PublicationJob> {
  const key = `${job.id}:${job.manifestJson}`;
  const pending = attempts.get(key);
  if (pending) return pending;
  const request = send(job).finally(() => { attempts.delete(key); });
  attempts.set(key, request);
  return request;
}

async function send(job: PublicationJob): Promise<PublicationJob> {
  try {
    if (!(await hasPublishingConnection())) return { ...job, error: 'Connect publishing in Settings to send this approved change.' };
    const result = await publishManifest(JSON.parse(job.manifestJson) as PublishManifest);
    return updatePublicationJob(job.id, 'submitted', { commitUrl: result.commitUrl ?? null, expectedManifest: job.manifestJson });
  } catch (cause) {
    return updatePublicationJob(job.id, 'failed', {
      error: cause instanceof Error ? cause.message : 'Website submission failed.',
      expectedManifest: job.manifestJson,
    });
  }
}

export async function queueAndAttemptPublication(manifest: PublishManifest, localId: string): Promise<PublicationJob> {
  return attempt(await queuePublicationJob(manifest, localId));
}

async function refresh(retryFailed: boolean): Promise<PublicationJob[]> {
  const jobs = await listPublicationJobs();
  if (!jobs.length) return [];
  const snapshot = await loadStudioSnapshot().catch(() => null);
  const results: PublicationJob[] = [];
  for (const job of jobs) {
    const receipt = snapshot?.receipts[await publicationJobId(JSON.parse(job.manifestJson) as PublishManifest)];
    if (receipt?.status === 'accepted') {
      results.push({ ...job, status: 'submitted', delivery: 'live', publicUrl: publicationPageUrl(job.itemType, receipt.publicId), error: '' });
    } else if (receipt?.status === 'rejected') {
      results.push({ ...job, delivery: 'rejected', error: receipt.reason || 'The website rejected this change. Edit it before trying again.' });
    } else if (job.status === 'queued' || (retryFailed && job.status === 'failed')) {
      results.push(await attempt(job));
    } else {
      results.push({ ...job, ...(snapshot ? {} : { error: 'Could not check the live website. Refresh to check again.' }) });
    }
  }
  return results;
}

let refreshInFlight: Promise<PublicationJob[]> | null = null;
export function refreshPublicationJobs(): Promise<PublicationJob[]> {
  if (!refreshInFlight) refreshInFlight = refresh(false).finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}
export async function retryPendingPublications(): Promise<PublicationJob[]> {
  if (refreshInFlight) await refreshInFlight;
  refreshInFlight = refresh(true).finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}
