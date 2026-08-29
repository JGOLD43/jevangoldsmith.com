import * as Crypto from 'expo-crypto';
import { Base64 } from 'js-base64';

import type { PublishManifest } from '@/domain/privacy';
import { getPublishingCredentials } from '@/storage/publishing-credentials';

const API_VERSION = '2022-11-28';

function safePathPart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80) || 'publication';
}

export async function githubPublishingConfigured(): Promise<boolean> {
  return Boolean(await getPublishingCredentials());
}

export async function verifyGithubPublishingAccess(): Promise<boolean> {
  const credentials = await getPublishingCredentials();
  if (!credentials) return false;
  const response = await fetch(`https://api.github.com/repos/${credentials.owner}/${credentials.repository}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${credentials.token}`,
      'X-GitHub-Api-Version': API_VERSION,
    },
  });
  if (!response.ok) throw new Error(`GitHub inbox connection failed (${response.status}).`);
  const repository = (await response.json()) as { private?: boolean; permissions?: { push?: boolean } };
  if (repository.private !== true) throw new Error('The publishing inbox must remain private.');
  if (repository.permissions?.push === false) throw new Error('This token cannot submit approved public copies to the inbox.');
  return true;
}

export async function publishManifestToGithub(manifest: PublishManifest): Promise<{ status: 'ready'; commitUrl?: string }> {
  const credentials = await getPublishingCredentials();
  if (!credentials) throw new Error('Connect the private GitHub publishing inbox in Settings.');

  // The content hash creates an immutable idempotency key. Re-publishing the
  // same public copy produces the same path; an edited copy produces a new
  // submission. Private records are structurally absent from PublishManifest.
  const manifestJson = JSON.stringify(manifest);
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, manifestJson);
  const jobId = `${safePathPart(manifest.type)}-${safePathPart(manifest.id)}-${digest.slice(0, 24)}`;
  const envelope = {
    schemaVersion: 1 as const,
    jobId,
    createdAt: new Date().toISOString(),
    client: 'jgold-android' as const,
    manifest,
  };
  const filePath = `submissions/${jobId}.json`;
  const fileUrl = `https://api.github.com/repos/${credentials.owner}/${credentials.repository}/contents/${filePath}`;
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${credentials.token}`,
    'X-GitHub-Api-Version': API_VERSION,
  };

  // A retry may encounter the exact immutable submission already in GitHub.
  // In that case it is already safely queued and no second write is needed.
  const existing = await fetch(`${fileUrl}?ref=${encodeURIComponent(credentials.branch)}`, { headers });
  if (existing.ok) {
    const result = (await existing.json()) as { html_url?: string };
    return { status: 'ready', commitUrl: result.html_url };
  }
  if (existing.status !== 404) throw new Error(`Could not check the publishing inbox (${existing.status}).`);

  const response = await fetch(fileUrl, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `inbox: queue approved ${manifest.type} publication`,
      content: Base64.encode(`${JSON.stringify(envelope, null, 2)}\n`),
      branch: credentials.branch,
    }),
  });
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(detail?.message || `Publishing inbox submission failed (${response.status}).`);
  }
  const result = (await response.json()) as { commit?: { html_url?: string } };
  return { status: 'ready', commitUrl: result.commit?.html_url };
}
