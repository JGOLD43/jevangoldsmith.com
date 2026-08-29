import * as Crypto from 'expo-crypto';

import type { PublicationJob, PublicationJobStatus } from '@/domain/models';
import type { PublishManifest } from '@/domain/privacy';

import { getDatabase } from './database';

type PublicationRow = {
  id: string;
  item_type: PublicationJob['itemType'];
  local_id: string;
  manifest_json: string;
  status: PublicationJobStatus;
  error: string;
  commit_url: string | null;
  created_at: string;
  updated_at: string;
};

function mapJob(row: PublicationRow): PublicationJob {
  return {
    id: row.id,
    itemType: row.item_type,
    localId: row.local_id,
    manifestJson: row.manifest_json,
    status: row.status,
    error: row.error,
    commitUrl: row.commit_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function queuePublicationJob(manifest: PublishManifest, localId: string): Promise<PublicationJob> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const id = Crypto.randomUUID();
  const manifestJson = JSON.stringify(manifest);
  await database.runAsync(`INSERT INTO publication_jobs
    (id, item_type, local_id, manifest_json, status, error, commit_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'queued', '', NULL, ?, ?)
    ON CONFLICT(item_type, local_id) DO UPDATE SET
      manifest_json=excluded.manifest_json, status='queued', error='', commit_url=NULL, updated_at=excluded.updated_at`,
  id, manifest.type, localId, manifestJson, now, now);
  const saved = await database.getFirstAsync<PublicationRow>(
    'SELECT * FROM publication_jobs WHERE item_type=? AND local_id=?', manifest.type, localId,
  );
  if (!saved) throw new Error('Could not queue this website update.');
  return mapJob(saved);
}

export async function listPublicationJobs(): Promise<PublicationJob[]> {
  const rows = await (await getDatabase()).getAllAsync<PublicationRow>(
    'SELECT * FROM publication_jobs ORDER BY updated_at DESC',
  );
  return rows.map(mapJob);
}

export async function updatePublicationJob(
  id: string,
  status: PublicationJobStatus,
  options: { error?: string; commitUrl?: string | null } = {},
): Promise<PublicationJob> {
  const database = await getDatabase();
  const updatedAt = new Date().toISOString();
  await database.runAsync(
    'UPDATE publication_jobs SET status=?, error=?, commit_url=?, updated_at=? WHERE id=?',
    status, options.error ?? '', options.commitUrl ?? null, updatedAt, id,
  );
  const saved = await database.getFirstAsync<PublicationRow>('SELECT * FROM publication_jobs WHERE id=?', id);
  if (!saved) throw new Error('Publication job not found.');
  return mapJob(saved);
}
