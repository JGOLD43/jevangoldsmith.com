import * as Crypto from 'expo-crypto';
import { Base64 } from 'js-base64';
import { File } from 'expo-file-system';
import { validateDocument } from '@/domain/studio-document.cjs';
import { studioMediaDirectory } from './studio-media';

import type { PublishManifest } from '@/domain/privacy';
import { getPublishingCredentials, hasPublishingCredentials } from '@/storage/publishing-credentials';

const API_VERSION = '2022-11-28';

function safePathPart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80) || 'publication';
}

export async function githubPublishingConfigured(): Promise<boolean> {
  return hasPublishingCredentials();
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
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'Your publishing token has expired or lost access. Reconnect publishing in Settings.' : `GitHub inbox connection failed (${response.status}).`);
  const repository = (await response.json()) as { private?: boolean; permissions?: { push?: boolean } };
  if (repository.private !== true) throw new Error('The publishing inbox must remain private.');
  if (repository.permissions?.push === false) throw new Error('This token cannot submit approved public copies to the inbox.');
  return true;
}

export async function publicationJobId(manifest: PublishManifest): Promise<string> {
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, JSON.stringify(manifest));
  return `${safePathPart(manifest.type)}-${safePathPart(manifest.id)}-${digest.slice(0, 24)}`;
}

export async function publishManifestToGithub(manifest: PublishManifest): Promise<{ status: 'ready'; commitUrl?: string }> {
  const credentials = await getPublishingCredentials();
  if (!credentials) throw new Error('Connect the private GitHub publishing inbox in Settings.');
  if (Base64.encode(JSON.stringify(manifest)).length > 370000) throw new Error('This story is too large to submit. Split it into shorter posts; your draft is still saved.');
  if ('body' in manifest && (manifest.title.length > 240 || manifest.summary.length > 2000 || manifest.body.length > 200000)) throw new Error('Keep the title under 240 characters, summary under 2,000 and story under 200,000.');
  if ('document' in manifest && manifest.document && manifest.document.blocks.length > 100) throw new Error('Use at most 100 content blocks per story.');

  // The content hash creates an immutable idempotency key. Re-publishing the
  // same public copy produces the same path; an edited copy produces a new
  // submission. Private records are structurally absent from PublishManifest.
  const jobId = await publicationJobId(manifest);
  const prepared = JSON.parse(JSON.stringify(manifest)) as PublishManifest;
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${credentials.token}`,
    'X-GitHub-Api-Version': API_VERSION,
  };
  if ('document' in prepared && prepared.document) {
    for (const block of prepared.document.blocks) {
      if (block.type === 'text' || !block.src.startsWith('file:')) continue;
      // Only files explicitly picked for Studio may leave the phone.
      const file = new File(block.src);
      if (!file.uri.startsWith(`${studioMediaDirectory().uri.replace(/\/$/, '')}/`) || file.uri.includes('..')) throw new Error('Choose this media again in Studio.');
      if (!file.exists || file.size > 20 * 1024 * 1024) throw new Error('A media file is missing or exceeds 20 MB. Edit the draft and choose it again.');
      const bytes = await file.bytes();
      const hash = Array.from(new Uint8Array(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes))).map((byte) => byte.toString(16).padStart(2, '0')).join('');
      const name = `${hash}${file.extension.toLowerCase()}`;
      const url = `https://api.github.com/repos/${credentials.owner}/${credentials.repository}/contents/media/${name}`;
      const existing = await fetch(`${url}?ref=${encodeURIComponent(credentials.branch)}`, { headers, signal: AbortSignal.timeout(60000) });
      if (existing.status === 404) {
        const uploaded = await fetch(url, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(120000), body: JSON.stringify({ message: 'inbox: stage approved Studio media', content: await file.base64(), branch: credentials.branch }) });
        if (!uploaded.ok) throw new Error(`Media upload failed (${uploaded.status}). Retry when connected.`);
      } else if (!existing.ok) throw new Error(`Could not check media upload (${existing.status}).`);
      block.src = `/media/studio/${name}`;
    }
    validateDocument(prepared.document);
  }
  const envelope = {
    schemaVersion: 1 as const,
    jobId,
    createdAt: new Date().toISOString(),
    client: 'jgold-android' as const,
    manifest: prepared,
  };
  const filePath = `submissions/${jobId}.json`;
  const fileUrl = `https://api.github.com/repos/${credentials.owner}/${credentials.repository}/contents/${filePath}`;

  // A retry may encounter the exact immutable submission already in GitHub.
  // In that case it is already safely queued and no second write is needed.
  const existing = await fetch(`${fileUrl}?ref=${encodeURIComponent(credentials.branch)}`, { headers, signal: AbortSignal.timeout(30000) });
  if (existing.ok) {
    const result = (await existing.json()) as { html_url?: string };
    return { status: 'ready', commitUrl: result.html_url };
  }
  if (existing.status !== 404) throw new Error(existing.status === 401 || existing.status === 403 ? 'Your publishing token has expired or lost access. Reconnect publishing in Settings.' : `Could not check the publishing inbox (${existing.status}).`);

  const response = await fetch(fileUrl, {
    method: 'PUT',
    signal: AbortSignal.timeout(60000),
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `inbox: queue approved ${manifest.type} publication`,
      content: Base64.encode(`${JSON.stringify(envelope, null, 2)}\n`),
      branch: credentials.branch,
    }),
  });
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error([401, 403, 404].includes(response.status) ? 'Publishing cannot access the private inbox. In Settings, sign in again to reconnect your publishing inbox.' : detail?.message || `Publishing inbox submission failed (${response.status}).`);
  }
  const result = (await response.json()) as { content?: { html_url?: string }; commit?: { html_url?: string } };
  return { status: 'ready', commitUrl: result.content?.html_url ?? result.commit?.html_url };
}
