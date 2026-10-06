export const PRIVATE_INBOX = 'https://api.github.com/repos/JGOLD43/jgold-publishing-inbox';
const MAX_BYTES = 20 * 1024 * 1024;
type Row = Record<string, unknown>;
export type PrivateBook = { id: string; title: string; author: string; progress: number; updatedAt: string; highlights: { id: string; text: string; note: string; locator: string }[] };

export function parseConnectionCode(code: string) {
  const match = /^JG1\.([a-f0-9]{32})\.([a-f0-9]{64})$/i.exec(code.trim());
  if (!match) throw new Error('Paste the complete connection code from Phone & Mac sync in the app’s Settings.');
  return { vaultId: match[1].toLowerCase(), key: match[2].toLowerCase() };
}
export async function decryptSyncSnapshot(bytes: Uint8Array<ArrayBuffer>, keyHex: string) {
  if (!/^[a-f0-9]{64}$/.test(keyHex) || bytes.length < 28 || bytes.length > MAX_BYTES + 28) throw new Error('The encrypted sync data is invalid or too large.');
  const key = await crypto.subtle.importKey('raw', Uint8Array.from(keyHex.match(/../g)!, value => parseInt(value, 16)), 'AES-GCM', false, ['decrypt']);
  let plain: ArrayBuffer;
  try { plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12), tagLength: 128 }, key, bytes.slice(12)); }
  catch { throw new Error('This connection code cannot unlock the synced data. Check the code in the app.'); }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(plain)) as unknown;
}
export function privateLibraryFromSnapshot(value: unknown, vaultId: string): PrivateBook[] {
  const snapshot = value as { version?: unknown; vaultId?: unknown; tables?: Record<string, { rows?: Row[] }> };
  if (!snapshot || snapshot.version !== 1 || snapshot.vaultId !== vaultId) throw new Error('The sync data belongs to a different connection.');
  const books = snapshot.tables?.books?.rows, annotations = snapshot.tables?.book_annotations?.rows;
  if (!Array.isArray(books) || !Array.isArray(annotations) || books.length > 20000 || annotations.length > 100000) throw new Error('The synced library is invalid or too large.');
  const text = (value: unknown) => typeof value === 'string' ? value : '';
  const highlights = new Map<string, PrivateBook['highlights']>();
  const ids = new Set<string>();
  for (const row of annotations) {
    if (!row || typeof row.id !== 'string' || typeof row.book_id !== 'string' || ids.has(row.id)) throw new Error('The synced highlights are invalid.');
    ids.add(row.id);
    if (row.kind !== 'highlight' && row.kind !== 'note') continue;
    const list = highlights.get(row.book_id) ?? [];
    list.push({ id: row.id, text: text(row.selected_text), note: text(row.note), locator: text(row.locator) });
    highlights.set(row.book_id, list);
  }
  ids.clear();
  return books.map(row => {
    if (!row || typeof row.id !== 'string' || typeof row.title !== 'string' || ids.has(row.id)) throw new Error('The synced books are invalid.');
    ids.add(row.id);
    return { id: row.id, title: row.title, author: text(row.author), updatedAt: text(row.updated_at), progress: typeof row.progress === 'number' && Number.isFinite(row.progress) ? Math.max(0, Math.min(1, row.progress)) : 0, highlights: highlights.get(row.id) ?? [] };
  }).sort((a, b) => a.title.localeCompare(b.title));
}
export async function loadPrivateLibrary(token: string, code: string, signal?: AbortSignal): Promise<PrivateBook[]> {
  const connection = parseConnectionCode(code);
  if (!/^(github_pat_|gh[pus]_)[A-Za-z0-9_]+$/.test(token)) throw new Error('Enter a GitHub token with Contents: read access to your private publishing inbox.');
  async function request(path: string) {
    const response = await fetch(PRIVATE_INBOX + path, { headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }, cache: 'no-store', credentials: 'omit', redirect: 'error', signal });
    if (!response.ok) throw new Error([401, 403, 404].includes(response.status) ? 'GitHub could not open the private inbox. Check token access and tap Sync now in the app.' : `GitHub is unavailable (${response.status}). Try Refresh again.`);
    return response.json();
  }
  const repository = await request('');
  if (repository.private !== true || repository.full_name?.toLowerCase() !== 'jgold43/jgold-publishing-inbox') throw new Error('This connection requires your private publishing inbox.');
  const ref = await request('/git/ref/heads/jgold-device-sync-v1');
  const commitSha = ref.object?.sha;
  if (!/^[a-f0-9]{40}$/.test(commitSha)) throw new Error('The sync history is invalid.');
  const commit = await request(`/git/commits/${commitSha}`);
  if (!/^[a-f0-9]{40}$/.test(commit.tree?.sha)) throw new Error('The sync history is invalid.');
  const tree = await request(`/git/trees/${commit.tree.sha}?recursive=1`);
  if (tree.truncated || !Array.isArray(tree.tree)) throw new Error('The sync index is incomplete.');
  const entry = tree.tree.find((item: { path?: string; type?: string }) => item.type === 'blob' && item.path === `sync/${connection.vaultId}/state.enc`);
  if (!entry || !/^[a-f0-9]{40}$/.test(entry.sha)) throw new Error('No synced data for this code yet. Tap Sync now on your phone or Mac first.');
  const blob = await request(`/git/blobs/${entry.sha}`);
  if (blob.encoding !== 'base64' || typeof blob.content !== 'string' || blob.content.length > 30000000 || blob.size > MAX_BYTES + 28) throw new Error('The encrypted sync data is invalid or too large.');
  const bytes = Uint8Array.from(atob(blob.content.replace(/\s/g, '')), char => char.charCodeAt(0));
  return privateLibraryFromSnapshot(await decryptSyncSnapshot(bytes, connection.key), connection.vaultId);
}
