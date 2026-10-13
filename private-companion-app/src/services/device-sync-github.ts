import { Base64 } from 'js-base64';
export const SYNC_BRANCH = 'jgold-device-sync-v1';
const API = 'https://api.github.com/repos/JGOLD43/jgold-publishing-inbox';
type Head = { commit: string; tree: string; entries: Map<string, string> };
export class SyncRace extends Error {}
export class SyncGithub {
  constructor(private token: string, private checkActive: () => void = () => {}) {}
  async request(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST', allowMissing = false): Promise<any> {
    this.checkActive();
    const response = await fetch(API + path, { method, headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${this.token}`, 'X-GitHub-Api-Version': '2022-11-28', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(120_000) });
    this.checkActive();
    if (response.status === 404 && allowMissing) return null;
    if ([409, 422].includes(response.status)) throw new SyncRace('Another device changed sync data. Retrying safely.');
    if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'Reconnect GitHub in Settings to sync your devices.' : `Sync could not reach private storage (${response.status}). Your local changes are safe.`);
    return response.json();
  }
  async head(create = false): Promise<Head | null> {
    const repository = await this.request('');
    if (repository.private !== true || repository.full_name?.toLowerCase() !== 'jgold43/jgold-publishing-inbox') throw new Error('Device sync requires the private JGOLD inbox.');
    let ref = await this.request(`/git/ref/heads/${SYNC_BRANCH}`, undefined, 'GET', true);
    if (!ref && create) {
      const main = await this.request('/git/ref/heads/main');
      try { ref = await this.request('/git/refs', { ref: `refs/heads/${SYNC_BRANCH}`, sha: main.object.sha }); }
      catch (error) { if (!(error instanceof SyncRace)) throw error; ref = await this.request(`/git/ref/heads/${SYNC_BRANCH}`); }
    }
    if (!ref) return null;
    const commit = await this.request(`/git/commits/${ref.object.sha}`);
    const tree = await this.request(`/git/trees/${commit.tree.sha}?recursive=1`);
    if (tree.truncated) throw new Error('The sync storage index is too large. No data was changed.');
    return { commit: ref.object.sha, tree: commit.tree.sha, entries: new Map(tree.tree.filter((item: any) => item.type === 'blob').map((item: any) => [item.path, item.sha])) };
  }
  async read(sha: string): Promise<Uint8Array<ArrayBuffer>> {
    if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('Invalid encrypted object.');
    const blob = await this.request(`/git/blobs/${sha}`);
    if (blob.encoding !== 'base64' || typeof blob.content !== 'string' || blob.content.length > 40_000_000) throw new Error('Invalid encrypted sync response.');
    return Base64.toUint8Array(blob.content) as Uint8Array<ArrayBuffer>;
  }
  async blob(bytes: Uint8Array): Promise<string> {
    if (bytes.length > 24 * 1024 * 1024) throw new Error('This sync object is too large.');
    const blob = await this.request('/git/blobs', { content: Base64.fromUint8Array(bytes), encoding: 'base64' });
    return blob.sha;
  }
  async commit(head: Head, entries: Record<string, string>): Promise<void> {
    const tree = await this.request('/git/trees', { base_tree: head.tree, tree: Object.entries(entries).map(([path, sha]) => ({ path, mode: '100644', type: 'blob', sha })) });
    const commit = await this.request('/git/commits', { message: 'sync: encrypted JGOLD device update', tree: tree.sha, parents: [head.commit] });
    // A concurrent push cannot be overwritten: GitHub rejects a non-fast-forward
    // update. The caller downloads and merges the latest state before retrying.
    await this.request(`/git/refs/heads/${SYNC_BRANCH}`, { sha: commit.sha, force: false }, 'PATCH');
  }
}
