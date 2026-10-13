import { assertFoodCaptureImport } from "@/domain/food-capture-sync";
import { writePrivateFile } from "@/storage/file-io";
import {
  AESEncryptionKey,
  AESSealedData,
  aesDecryptAsync,
  aesEncryptAsync,
  digest,
  CryptoDigestAlgorithm,
  getRandomBytesAsync,
} from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Directory, File, Paths } from "expo-file-system";
import type { SQLiteDatabase } from "expo-sqlite";
import { getDatabase } from "@/storage/database";
import { getOrCreateVaultKey } from "@/storage/keys";
import { withVaultTransaction } from "@/storage/vault-transaction";
import { getPublishingCredentials } from "@/storage/publishing-credentials";
import {
  canonical,
  mergeSnapshots,
  same,
  rowKey,
  SYNC_TABLES,
  validateSnapshot,
  upgradeDocumentSnapshot,
  type SyncSnapshot,
  type SyncRow,
  type SyncResolutions,
  type SyncConflict,
} from "@/domain/device-sync";
import { SyncGithub, SyncRace } from "./device-sync-github";
import { notifySyncedData } from "./device-sync-events";
import { mergeInitialSnapshots } from "@/domain/device-sync-join";

const CONFIG_KEY = "jgold.private-device-sync.v1";
const OPTIONS = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
type Config = {
  vaultId: string;
  key: string;
  joining: boolean;
  lastSyncedAt?: string;
};
type RawSnapshot = SyncSnapshot;
export type DeviceSyncStatus = {
  enabled: boolean;
  running: boolean;
  lastSyncedAt: string | null;
  error: string | null;
  conflicts: SyncConflict[];
  phase?: string;
};
let status: DeviceSyncStatus = {
  enabled: false,
  running: false,
  lastSyncedAt: null,
  error: null,
  conflicts: [],
};
const listeners = new Set<() => void>();
let running: Promise<void> | null = null;
let generation = 0;
export function pauseDeviceSync() {
  generation++;
}
const rememberedFiles = new Map<string, { hash: string; size: number }>();
const TOKEN =
  /jgold-sync:\/\/file\/([a-f0-9]{64})\/(book|vault|media)\/([A-Za-z0-9._%-]+)/g;
const MAX_SNAPSHOT = 20 * 1024 * 1024;
const hex = (bytes: Uint8Array | ArrayBuffer) =>
  Array.from(
    bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes,
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
function emit(change: Partial<DeviceSyncStatus>) {
  status = { ...status, ...change };
  listeners.forEach((listener) => listener());
}
export const deviceSyncStatus = () => status;
export function subscribeDeviceSync(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
async function config(): Promise<Config | null> {
  const raw = await SecureStore.getItemAsync(CONFIG_KEY, OPTIONS);
  if (!raw) return null;
  const value = JSON.parse(raw) as Config;
  if (
    !/^[a-f0-9]{32}$/.test(value.vaultId) ||
    !/^[a-f0-9]{64}$/.test(value.key)
  )
    throw new Error("The saved device connection is invalid.");
  return value;
}
export async function loadDeviceSyncStatus() {
  const value = await config();
  emit({ enabled: !!value, lastSyncedAt: value?.lastSyncedAt ?? null });
  return status;
}
export async function pairingCode(): Promise<string | null> {
  const value = await config();
  return value ? `JG1.${value.vaultId}.${value.key}` : null;
}
export async function startDeviceSync(): Promise<string> {
  if (running) throw new Error("Wait for the current sync to finish.");
  const existing = await config();
  if (existing) return (await pairingCode())!;
  const value: Config = {
    vaultId: hex(await getRandomBytesAsync(16)),
    key: hex(await getRandomBytesAsync(32)),
    joining: false,
  };
  await SecureStore.setItemAsync(CONFIG_KEY, JSON.stringify(value), OPTIONS);
  generation++;
  emit({ enabled: true, error: null });
  await syncDevices();
  return (await pairingCode())!;
}
export async function joinDeviceSync(
  code: string,
  expectedSnapshot?: string,
): Promise<void> {
  if (running) throw new Error("Wait for the current sync to finish.");
  if (await config())
    throw new Error("Disconnect this device before joining another vault.");
  const match = /^JG1\.([a-f0-9]{32})\.([a-f0-9]{64})$/i.exec(code.trim());
  if (!match)
    throw new Error("Paste the complete connection code from your phone.");
  if (
    expectedSnapshot &&
    (await previewDeviceSync(code)).snapshot !== expectedSnapshot
  )
    throw new Error(
      "Your phone changed since the preview. Preview the connection again.",
    );
  const value: Config = {
    vaultId: match[1].toLowerCase(),
    key: match[2].toLowerCase(),
    joining: true,
  };
  await SecureStore.setItemAsync(CONFIG_KEY, JSON.stringify(value), OPTIONS);
  generation++;
  emit({ enabled: true, error: null });
  await syncDevices();
}
export async function disconnectDeviceSync(): Promise<void> {
  if (running)
    throw new Error(
      "Wait for the current sync to finish before disconnecting.",
    );
  generation++;
  await SecureStore.deleteItemAsync(CONFIG_KEY, OPTIONS);
  const db = await getDatabase();
  await prepare(db);
  await db.runAsync("DELETE FROM device_sync_state WHERE id = 1");
  emit({ enabled: false, error: null, conflicts: [], lastSyncedAt: null });
}
async function prepare(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS action_board (id INTEGER PRIMARY KEY CHECK(id = 1), value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS year_plans (year INTEGER PRIMARY KEY NOT NULL, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS life_calendar_settings (id INTEGER PRIMARY KEY CHECK(id = 1), value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS device_sync_state (id INTEGER PRIMARY KEY CHECK(id = 1), value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS device_sync_backups (id TEXT PRIMARY KEY NOT NULL, created_at TEXT NOT NULL, reason TEXT NOT NULL, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS device_contact_pending (contact_id TEXT PRIMARY KEY NOT NULL);
  `);
}
async function capture(
  db: SQLiteDatabase,
  vaultId: string,
): Promise<RawSnapshot> {
  const snapshot: SyncSnapshot = { version: 1, vaultId, tables: {}, files: {} };
  for (const name of SYNC_TABLES) {
    const schema = await db.getAllAsync<{ name: string; pk: number }>(
      `PRAGMA table_info(${name})`,
    );
    const columns = schema
      .map((c) => c.name)
      .filter(
        (c) => !(name === "relationship_contacts" && c === "device_contact_id"),
      )
      .sort();
    const primaryKey = schema
      .filter((c) => c.pk)
      .sort((a, b) => a.pk - b.pk)
      .map((c) => c.name);
    const rows = await db.getAllAsync<SyncRow>(
      `SELECT ${columns.map((c) => `"${c}"`).join(",")} FROM "${name}"`,
    );
    rows.sort((a, b) =>
      rowKey({ primaryKey }, a).localeCompare(rowKey({ primaryKey }, b)),
    );
    snapshot.tables[name] = { columns, primaryKey, rows };
  }
  return snapshot;
}
async function encrypted(
  bytes: Uint8Array<ArrayBuffer>,
  key: AESEncryptionKey,
): Promise<Uint8Array<ArrayBuffer>> {
  return (await (
    await aesEncryptAsync(bytes, key)
  ).combined()) as Uint8Array<ArrayBuffer>;
}
async function decrypted(
  bytes: Uint8Array<ArrayBuffer>,
  key: AESEncryptionKey,
): Promise<Uint8Array<ArrayBuffer>> {
  return (await aesDecryptAsync(
    AESSealedData.fromCombined(bytes),
    key,
  )) as Uint8Array<ArrayBuffer>;
}
function assertPrivateUri(uri: string) {
  const root = Paths.document.uri.replace(/\/?$/, "/");
  if (
    !uri.startsWith(root) ||
    decodeURIComponent(uri.slice(root.length))
      .split("/")
      .some((part) => part === ".." || part === ".")
  )
    throw new Error("A private file is unavailable for syncing.");
}
async function mapFileReferences(
  table: string,
  column: string,
  value: string,
  replace: (uri: string) => Promise<string>,
): Promise<string> {
  const fileColumns: Record<string, string[]> = {
    books: ["encrypted_file_uri", "cover_uri"],
    vault_items: ["attachment_uri"],
    relationship_contacts: ["image_uri"],
  };
  if (fileColumns[table]?.includes(column)) return replace(value);
  if (
    ["public_drafts", "essay_documents", "essay_revisions"].includes(table) &&
    column === "body" &&
    value.startsWith("JGOLD-DOCUMENT-1\n")
  ) {
    const document = JSON.parse(value.slice("JGOLD-DOCUMENT-1\n".length));
    if (!Array.isArray(document.blocks))
      throw new Error("A Studio document is invalid.");
    const mapRich = async (node: { type?: string; attrs?: { src?: string }; content?: unknown[] }) => {
      if (['image', 'video'].includes(node.type ?? '') && typeof node.attrs?.src === 'string') node.attrs.src = await replace(node.attrs.src);
      for (const child of node.content ?? []) if (child && typeof child === 'object') await mapRich(child);
    };
    for (const block of document.blocks) {
      if (['image', 'video'].includes(block.type) && typeof block.src === 'string') block.src = await replace(block.src);
      if (block.rich) await mapRich(block.rich);
    }
    return "JGOLD-DOCUMENT-1\n" + JSON.stringify(document);
  }
  // A path typed into a note is text, never a request to read that file.
  return value;
}
async function portable(
  raw: RawSnapshot,
  remote: SyncSnapshot | null,
  github: SyncGithub,
  syncKey: AESEncryptionKey,
  localKey: AESEncryptionKey,
  entries: Record<string, string>,
): Promise<SyncSnapshot> {
  const snapshot: SyncSnapshot = JSON.parse(JSON.stringify(raw));
  snapshot.files = { ...remote?.files };
  async function transfer(uri: string): Promise<string> {
    assertPrivateUri(uri);
    const kind = uri.includes("/private-books/")
      ? "book"
      : uri.includes("/private-vault/")
        ? "vault"
        : "media";
    const source = new File(uri);
    if (!source.exists)
      throw new Error(
        "A saved file is missing. Restore it before syncing; no records have been replaced.",
      );
    const remembered = rememberedFiles.get(uri);
    let bytes: Uint8Array<ArrayBuffer> | undefined;
    let hash = remembered?.hash;
    let size = remembered?.size;
    if (!hash || !snapshot.files[hash]) {
      const stored = await source.bytes();
      bytes = kind === "media" ? stored : await decrypted(stored, localKey);
      if (bytes.length > 200 * 1024 * 1024)
        throw new Error("A file exceeds the 200 MB sync limit.");
      hash = hex(await digest(CryptoDigestAlgorithm.SHA256, bytes));
      size = bytes.length;
      rememberedFiles.set(uri, { hash, size });
    }
    if (!snapshot.files[hash!]) {
      const chunks: string[] = [];
      for (let offset = 0; offset < bytes!.length; offset += 4 * 1024 * 1024) {
        const sha = await github.blob(
          await encrypted(
            bytes!.slice(offset, offset + 4 * 1024 * 1024),
            syncKey,
          ),
        );
        chunks.push(sha);
        entries[
          `sync/${raw.vaultId}/files/${hash}/${String(chunks.length - 1).padStart(3, "0")}`
        ] = sha;
      }
      snapshot.files[hash!] = { hash: hash!, size: size!, chunks };
    }
    const name =
      encodeURIComponent(source.name.replace(/[^A-Za-z0-9._-]/g, "_")) ||
      "file";
    return `jgold-sync://file/${hash}/${kind}/${name}`;
  }
  const replacements = new Map<string, string>();
  for (const name of SYNC_TABLES)
    for (const row of snapshot.tables[name].rows) {
      if (name === "books" && !row.encrypted_file_uri && row.file_hash) {
        const previous = remote?.tables.books.rows.find(
          (book) => book.id === row.id && book.file_hash === row.file_hash,
        );
        if (previous?.encrypted_file_uri)
          row.encrypted_file_uri = previous.encrypted_file_uri;
      }
      if (name === "life_calendar_settings") {
        const value = JSON.parse(String(row.value));
        delete value.calendarIds;
        delete value.writeCalendarId;
        delete value.links;
        row.value = canonical(value);
      }
      for (const [column, value] of Object.entries(row)) {
        if (typeof value !== "string") continue;
        // Native address-book photos belong to the device provider, outside our
        // encrypted app storage. Never copy or send arbitrary device paths.
        if (
          name === "relationship_contacts" &&
          column === "image_uri" &&
          value &&
          !/^https:\/\//.test(value) &&
          !value.startsWith(Paths.document.uri.replace(/\/?$/, "/"))
        ) {
          row[column] = "";
          continue;
        }
        row[column] = await mapFileReferences(
          name,
          column,
          value,
          async (uri) => {
            if (!/^(file:\/\/\/|jgold:\/\/files\/)/.test(uri)) return uri;
            if (!replacements.has(uri))
              replacements.set(uri, await transfer(uri));
            return replacements.get(uri)!;
          },
        );
      }
    }
  return snapshot;
}
async function materialize(
  snapshot: SyncSnapshot,
  local: RawSnapshot,
  github: SyncGithub,
  syncKey: AESEncryptionKey,
  localKey: AESEncryptionKey,
  preserveUnloaded = true,
  mediaPolicy?: { onDemand: boolean; requested: Set<string> },
): Promise<RawSnapshot> {
  const raw: RawSnapshot = JSON.parse(JSON.stringify(snapshot));
  const replacements = new Map<string, string>();
  for (const name of SYNC_TABLES)
    for (const row of raw.tables[name].rows)
      for (const [column, value] of Object.entries(row)) {
        if (typeof value !== "string") continue;
        const previous =
          name === "books" && column === "encrypted_file_uri"
            ? local.tables.books.rows.find(
                (book) =>
                  book.id === row.id && book.file_hash === row.file_hash,
              )
            : undefined;
        if (
          preserveUnloaded &&
          previous &&
          !previous.encrypted_file_uri &&
          row.file_hash
        ) {
          row[column] = null;
          continue;
        }
        row[column] = await mapFileReferences(
          name,
          column,
          value,
          async (uri) => {
            const match = [...uri.matchAll(TOKEN)][0];
            if (!match || match[0] !== uri) {
              if (/^(file:|jgold:)/.test(uri))
                throw new Error("A synced file reference is not portable.");
              return uri;
            }
            if (replacements.has(match[0])) return replacements.get(match[0])!;
            const [, hash, kind, filename] = match;
            const record = snapshot.files[hash];
            if (!record)
              throw new Error(
                "A synced file is missing from the encrypted index.",
              );
            const directory = new Directory(
              Paths.document,
              kind === "book"
                ? "private-books"
                : kind === "vault"
                  ? "private-vault"
                  : "studio-media",
            );
            directory.create({ idempotent: true, intermediates: true });
            const extension =
              filename
                .split(".")
                .pop()
                ?.replace(/[^A-Za-z0-9]/g, "")
                .slice(0, 12) || "bin";
            const file = new File(
              directory,
              `${hash}.${kind === "book" ? "book" : kind === "vault" ? "vault" : extension}`,
            );
            if (!file.exists && kind === 'media' && mediaPolicy?.onDemand && !mediaPolicy.requested.has(hash)) return uri;
            if (!file.exists) {
              const parts: Uint8Array<ArrayBuffer>[] = [];
              let length = 0;
              for (const sha of record.chunks) {
                const bytes = await decrypted(await github.read(sha), syncKey);
                length += bytes.length;
                if (length > record.size)
                  throw new Error("Synced file exceeds its declared size.");
                parts.push(bytes);
              }
              const bytes = new Uint8Array(length);
              let offset = 0;
              for (const part of parts) {
                bytes.set(part, offset);
                offset += part.length;
              }
              if (
                length !== record.size ||
                hex(await digest(CryptoDigestAlgorithm.SHA256, bytes)) !== hash
              )
                throw new Error("A synced file failed its integrity check.");
              const contents =
                kind === "media" ? bytes : await encrypted(bytes, localKey);
              const temporary = new File(
                directory,
                `${hash}-${hex(await getRandomBytesAsync(8))}.partial`,
              );
              const temporaryUri = temporary.uri;
              try {
                await writePrivateFile(temporary, contents);
                if (!file.exists) temporary.move(file);
              } finally {
                const leftover = new File(temporaryUri);
                if (leftover.exists) leftover.delete();
              }
            }
            rememberedFiles.set(file.uri, { hash, size: record.size });
            replacements.set(match[0], file.uri);
            return file.uri;
          },
        );
      }
  for (const row of raw.tables.life_calendar_settings.rows) {
    const current = local.tables.life_calendar_settings.rows.find(
      (r) => r.id === row.id,
    );
    const device = current ? JSON.parse(String(current.value)) : {};
    row.value = JSON.stringify({
      ...JSON.parse(String(row.value)),
      calendarIds: device.calendarIds ?? [],
      writeCalendarId: device.writeCalendarId ?? "",
      links: device.links ?? {},
    });
  }
  for (const row of raw.tables.relationship_contacts.rows) {
    const current = local.tables.relationship_contacts.rows.find(
      (r) => r.id === row.id,
    );
    if (
      !row.image_uri &&
      current?.image_uri &&
      !String(current.image_uri).startsWith(
        Paths.document.uri.replace(/\/?$/, "/"),
      )
    )
      row.image_uri = current.image_uri;
  }
  return raw;
}
async function apply(
  db: SQLiteDatabase,
  before: RawSnapshot,
  after: RawSnapshot,
) {
  assertFoodCaptureImport(before, after);
  await db.execAsync("PRAGMA defer_foreign_keys = ON");
  for (const name of [...SYNC_TABLES].reverse()) {
    const table = after.tables[name];
    const keys = new Set(table.rows.map((row) => rowKey(table, row)));
    for (const row of before.tables[name].rows)
      if (!keys.has(rowKey(table, row)))
        await db.runAsync(
          `DELETE FROM "${name}" WHERE ${table.primaryKey.map((key) => `"${key}" = ?`).join(" AND ")}`,
          ...table.primaryKey.map((key) => row[key]),
        );
  }
  for (const name of SYNC_TABLES) {
    const table = after.tables[name];
    const previous = new Map(
      before.tables[name].rows.map((row) => [rowKey(table, row), row]),
    );
    const updates = table.columns.filter((c) => !table.primaryKey.includes(c));
    for (const row of table.rows) {
      if (same(previous.get(rowKey(table, row)), row)) continue;
      await db.runAsync(
        `INSERT INTO "${name}" (${table.columns.map((c) => `"${c}"`).join(",")}) VALUES (${table.columns.map(() => "?").join(",")}) ON CONFLICT (${table.primaryKey.map((c) => `"${c}"`).join(",")}) ${updates.length ? "DO UPDATE SET " + updates.map((c) => `"${c}" = excluded."${c}"`).join(",") : "DO NOTHING"}`,
        ...table.columns.map((c) => row[c]),
      );
      if (name === "relationship_contacts")
        await db.runAsync(
          "INSERT OR IGNORE INTO device_contact_pending (contact_id) VALUES (?)",
          row.id,
        );
    }
  }
  const problems = await db.getAllAsync("PRAGMA foreign_key_check");
  if (problems.length)
    throw new Error(
      "These changes contain a linked-record conflict. Sync stopped and kept your local data intact.",
    );
  if (!same((await capture(db, after.vaultId)).tables, after.tables))
    throw new Error(
      "Linked records changed during sync. Your original data has been retained.",
    );
}

export function syncDevices(resolutions: SyncResolutions = {}): Promise<void> {
  if (running) return running;
  running = performSync(resolutions).finally(() => {
    running = null;
    emit({ running: false, phase: undefined });
  });
  return running;
}
async function performSync(resolutions: SyncResolutions) {
  const expected = generation;
  const settings = await config();
  if (!settings) return;
  const checkActive = () => {
    if (generation !== expected)
      throw new Error("Device sync was disconnected.");
  };
  checkActive();
  emit({
    enabled: true,
    running: true,
    error: null,
    conflicts: [],
    phase: "Checking the other device",
  });
  try {
    const credentials = await getPublishingCredentials();
    if (!credentials)
      throw new Error("Sign in with GitHub in Settings, then sync again.");
    const github = new SyncGithub(credentials.token, checkActive);
    const syncKey = (await AESEncryptionKey.import(
      settings.key,
      "hex",
    )) as AESEncryptionKey;
    const localKey = (await AESEncryptionKey.import(
      await getOrCreateVaultKey(),
      "hex",
    )) as AESEncryptionKey;
    await prepare(await getDatabase());
    for (let attempt = 0; attempt < 4; attempt++) {
      checkActive();
      const head = await github.head(!settings.joining);
      const statePath = `sync/${settings.vaultId}/state.enc`;
      const remoteSha = head?.entries.get(statePath);
      let remote: SyncSnapshot | null = null;
      if (remoteSha) {
        const bytes = await decrypted(await github.read(remoteSha), syncKey);
        if (bytes.length > MAX_SNAPSHOT)
          throw new Error("The encrypted sync snapshot is too large.");
        remote = upgradeDocumentSnapshot(JSON.parse(new TextDecoder().decode(bytes)));
        validateSnapshot(remote, settings.vaultId);
      }
      if (settings.joining && !remote)
        throw new Error(
          "First tap Sync now on your phone, then connect this Mac using that phone’s code.",
        );
      if (!head) throw new Error("Private sync storage is unavailable.");
      const captured = await withVaultTransaction(async (db) => ({
        raw: await capture(db, settings.vaultId),
        base: await db.getFirstAsync<{ value: string }>(
          "SELECT value FROM device_sync_state WHERE id = 1",
        ),
      }));
      validateSnapshot(captured.raw, settings.vaultId);
      if (remote) {
        remote = upgradeDocumentSnapshot(remote, captured.raw);
        validateSnapshot(remote, settings.vaultId, captured.raw);
      }
      const entries: Record<string, string> = {};
      // Pairing preserves both devices. Upload encrypted local files before
      // merging, just as for subsequent syncs; the backup remains recoverable.
      const local = await portable(
            captured.raw,
            remote,
            github,
            syncKey,
            localKey,
            entries,
          );
      let merged = remote!;
      if (settings.joining) {
        const result = mergeInitialSnapshots(local, remote!, resolutions);
        if (result.conflicts.length) {
          emit({ conflicts: result.conflicts });
          throw new Error("Both devices have different versions of the same information. Review the choices below; your existing data has been kept.");
        }
        merged = result.snapshot;
      }
      if (!settings.joining) {
        if (!remote) {
          if (captured.base)
            throw new Error(
              "The remote sync history is missing. Reconnect explicitly before recreating it.",
            );
          merged = local!;
        } else {
          if (!captured.base)
            throw new Error(
              "This device has no matching sync history. Disconnect and connect using the existing phone’s code.",
            );
          const base = upgradeDocumentSnapshot(JSON.parse(captured.base.value) as SyncSnapshot, local!);
          validateSnapshot(base, settings.vaultId, local!);
          const result = mergeSnapshots(base, local!, remote, resolutions);
          if (result.conflicts.length) {
            emit({ conflicts: result.conflicts });
            throw new Error(
              "The same information changed on both devices. Review the versions below; neither version has been discarded.",
            );
          }
          merged = result.snapshot;
        }
      }
      // Validate capture transitions before importing any synced attachment.
      assertFoodCaptureImport(captured.raw, merged);
      const mediaPolicy = await mediaDownloadPreference();
      emit({ phase: mediaPolicy.onDemand ? 'Syncing text and requested attachments' : 'Downloading and verifying files' });
      const materialized = await materialize(
        merged,
        captured.raw,
        github,
        syncKey,
        localKey,
        !settings.joining,
        { onDemand: mediaPolicy.onDemand, requested: new Set(mediaPolicy.requested) },
      );
      checkActive();
      assertFoodCaptureImport(captured.raw, materialized);
      const changedTables = SYNC_TABLES.filter(
        (name) => !same(captured.raw.tables[name], materialized.tables[name]),
      );
      try {
        emit({ phase: "Saving verified changes" });
        await withVaultTransaction(async (db) => {
          const latest = await capture(db, settings.vaultId);
          if (!same(latest.tables, captured.raw.tables))
            throw new SyncRace("A local edit arrived during sync.");
          const changed = !same(latest.tables, materialized.tables);
          if (changed) {
            await backup(
              db,
              latest,
              settings.joining
                ? "Before connecting this device"
                : "Before merged device changes",
            );
            await apply(db, latest, materialized);
          }
          if (remote)
            await db.runAsync(
              "INSERT INTO device_sync_state (id, value) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET value = excluded.value WHERE value != excluded.value",
              JSON.stringify(remote),
            );
        });
        if (settings.joining) {
          settings.joining = false;
          await SecureStore.setItemAsync(
            CONFIG_KEY,
            JSON.stringify(settings),
            OPTIONS,
          );
        }
        if (changedTables.length) notifySyncedData(changedTables);
        if (!remote || !same(remote.tables, merged.tables)) {
          const bytes = new TextEncoder().encode(JSON.stringify(merged));
          if (bytes.length > MAX_SNAPSHOT)
            throw new Error(
              "The sync snapshot is too large; your local changes are saved.",
            );
          entries[statePath] = await github.blob(
            await encrypted(bytes, syncKey),
          );
          checkActive();
          await github.commit(head, entries);
          await (
            await getDatabase()
          ).runAsync(
            "INSERT INTO device_sync_state (id, value) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET value = excluded.value WHERE value != excluded.value",
            JSON.stringify(merged),
          );
        }
        settings.lastSyncedAt = new Date().toISOString();
        await SecureStore.setItemAsync(
          CONFIG_KEY,
          JSON.stringify(settings),
          OPTIONS,
        );
        emit({
          lastSyncedAt: settings.lastSyncedAt,
          error: null,
          conflicts: [],
          phase: "Up to date",
        });
        return;
      } catch (error) {
        if (error instanceof SyncRace && attempt < 3) continue;
        throw error;
      }
    }
  } catch (error) {
    emit({
      error:
        error instanceof Error
          ? error.message
          : "Sync paused. Your local data is safe.",
    });
    throw error;
  }
}

export type SnapshotSummary = {
  books: number;
  writing: number;
  people: number;
  cards: number;
  plans: number;
};
function summarize(snapshot: SyncSnapshot): SnapshotSummary {
  return {
    books: snapshot.tables.books.rows.length,
    writing: snapshot.tables.essay_documents.rows.length,
    people: snapshot.tables.relationship_contacts.rows.length,
    cards: snapshot.tables.learning_cards.rows.length,
    plans: snapshot.tables.life_items.rows.length,
  };
}
export async function previewDeviceSync(code: string) {
  const match = /^JG1\.([a-f0-9]{32})\.([a-f0-9]{64})$/i.exec(code.trim());
  if (!match)
    throw new Error("Paste the complete connection code from your phone.");
  const credentials = await getPublishingCredentials();
  if (!credentials) throw new Error("Sign in with GitHub first.");
  const github = new SyncGithub(credentials.token, () => {});
  const head = await github.head(false),
    sha = head?.entries.get(`sync/${match[1].toLowerCase()}/state.enc`);
  if (!sha)
    throw new Error("Tap Sync now on your phone before previewing its data.");
  const key = (await AESEncryptionKey.import(
    match[2].toLowerCase(),
    "hex",
  )) as AESEncryptionKey;
  const bytes = await decrypted(await github.read(sha), key);
  if (bytes.length > MAX_SNAPSHOT)
    throw new Error("The sync snapshot is too large.");
  const remote: SyncSnapshot = upgradeDocumentSnapshot(JSON.parse(new TextDecoder().decode(bytes)));
  await prepare(await getDatabase());
  const local = await withVaultTransaction((db) =>
    capture(db, match[1].toLowerCase()),
  );
  validateSnapshot(upgradeDocumentSnapshot(remote, local), match[1].toLowerCase(), local);
  return {
    snapshot: sha,
    incoming: summarize(remote),
    current: summarize(local),
  };
}

type BackupRow = {
  id: string;
  created_at: string;
  reason: string;
  value: string;
};
const ARCHIVE = "JGOLD-BACKUP-FILE:";
async function backup(
  db: SQLiteDatabase,
  snapshot: RawSnapshot,
  reason: string,
) {
  await db.runAsync(
    "INSERT INTO device_sync_backups (id, created_at, reason, value) VALUES (?, ?, ?, ?)",
    hex(await getRandomBytesAsync(16)),
    new Date().toISOString(),
    reason,
    JSON.stringify(snapshot),
  );
  // Keep the newest ten snapshots in SQLite. Older snapshots remain recoverable
  // in separately encrypted files, so each small save no longer rewrites them.
  const older = await db.getAllAsync<BackupRow>(
    "SELECT * FROM device_sync_backups ORDER BY created_at DESC, id DESC LIMIT -1 OFFSET 10",
  );
  const pending = older.filter((row) => !row.value.startsWith(ARCHIVE));
  if (!pending.length) return;
  const directory = new Directory(Paths.document, "sync-recovery");
  directory.create({ idempotent: true, intermediates: true });
  const key = (await AESEncryptionKey.import(
    await getOrCreateVaultKey(),
    "hex",
  )) as AESEncryptionKey;
  for (const row of pending) {
    const file = new File(directory, row.id + ".backup");
    await writePrivateFile(
      file,
      await encrypted(new TextEncoder().encode(row.value), key),
    );
    await db.runAsync(
      "UPDATE device_sync_backups SET value=? WHERE id=?",
      ARCHIVE + file.uri,
      row.id,
    );
  }
}
export async function listDeviceSyncBackups() {
  const db = await getDatabase();
  await prepare(db);
  return db.getAllAsync<Omit<BackupRow, "value">>(
    "SELECT id, created_at, reason FROM device_sync_backups ORDER BY created_at DESC, id DESC",
  );
}
async function readBackup(id: string): Promise<RawSnapshot> {
  const row = await (
    await getDatabase()
  ).getFirstAsync<BackupRow>(
    "SELECT * FROM device_sync_backups WHERE id=?",
    id,
  );
  if (!row) throw new Error("This recovery point is unavailable.");
  let text = row.value;
  if (text.startsWith(ARCHIVE)) {
    const uri = text.slice(ARCHIVE.length);
    assertPrivateUri(uri);
    const key = (await AESEncryptionKey.import(
      await getOrCreateVaultKey(),
      "hex",
    )) as AESEncryptionKey;
    text = new TextDecoder().decode(
      await decrypted(await new File(uri).bytes(), key),
    );
  }
  const value = upgradeDocumentSnapshot(JSON.parse(text));
  validateSnapshot(value, value.vaultId);
  return value;
}
export async function previewDeviceSyncBackup(id: string) {
  const value = await readBackup(id);
  return {
    ...summarize(value),
    createdAt: (await (
      await getDatabase()
    ).getFirstAsync<{ created_at: string }>(
      "SELECT created_at FROM device_sync_backups WHERE id=?",
      id,
    ))!.created_at,
  };
}
export async function restoreDeviceSyncBackup(id: string) {
  if (running || (await config()))
    throw new Error(
      "Disconnect this device before restoring. Your other device will stay unchanged.",
    );
  const value = await readBackup(id);
  const captured = await withVaultTransaction(db => capture(db, value.vaultId));
  const compatible = upgradeDocumentSnapshot(value, captured);
  validateSnapshot(compatible, value.vaultId, captured);
  assertFoodCaptureImport(captured, compatible, true);
  // Missing unloaded books retain their metadata and can be downloaded again.
  // Other missing attachments stop restoration instead of silently losing data.
  for (const name of SYNC_TABLES)
    for (const row of compatible.tables[name].rows)
      for (const [column, field] of Object.entries(row)) {
        if (typeof field !== "string") continue;
        row[column] = await mapFileReferences(
          name,
          column,
          field,
          async (uri) => {
            if (!/^(file:|jgold:)/.test(uri)) return uri;
            assertPrivateUri(uri);
            if (!new File(uri).exists) {
              if (name === "books" && column === "encrypted_file_uri")
                return "";
              throw new Error(
                "A backup attachment is missing. Your current workspace has not changed.",
              );
            }
            return uri;
          },
        );
      }
  await withVaultTransaction(async (db) => {
    const current = await capture(db, value.vaultId);
    if (!same(current.tables, captured.tables))
      throw new SyncRace("A local edit arrived while preparing recovery. Your current data has been retained.");
    assertFoodCaptureImport(current, compatible, true);
    await backup(db, current, "Before restoring a recovery point");
    await apply(db, current, compatible);
    await db.runAsync("DELETE FROM device_sync_state WHERE id=1");
  });
  notifySyncedData([...SYNC_TABLES]);
}
export async function deleteDeviceSyncBackup(id: string) {
  if (running) throw new Error("Wait for syncing to finish.");
  const db = await getDatabase();
  const row = await db.getFirstAsync<BackupRow>(
    "SELECT * FROM device_sync_backups WHERE id=?",
    id,
  );
  await db.runAsync("DELETE FROM device_sync_backups WHERE id=?", id);
  if (row?.value.startsWith(ARCHIVE)) {
    const uri = row.value.slice(ARCHIVE.length);
    assertPrivateUri(uri);
    const file = new File(uri);
    if (file.exists) file.delete();
  }
}

export async function mediaDownloadPreference(): Promise<{ onDemand: boolean; requested: string[] }> {
  const row = await (await getDatabase()).getFirstAsync<{ value: string }>("SELECT value FROM local_preferences WHERE id='sync.media-policy.v1'");
  if (!row) return { onDemand: false, requested: [] };
  const value = JSON.parse(row.value);
  return { onDemand: value.onDemand === true, requested: Array.isArray(value.requested) ? value.requested.filter((h: unknown) => typeof h === 'string' && /^[a-f0-9]{64}$/.test(h)) : [] };
}
export async function setMediaDownloadPreference(onDemand: boolean, requested?: string[]) {
  const before = await mediaDownloadPreference();
  await (await getDatabase()).runAsync("INSERT INTO local_preferences(id,value) VALUES('sync.media-policy.v1',?) ON CONFLICT(id) DO UPDATE SET value=excluded.value", JSON.stringify({ onDemand, requested: requested ?? before.requested }));
}
export async function downloadDocumentMedia(id: string) {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ body: string }>('SELECT body FROM essay_documents WHERE id=? UNION ALL SELECT body FROM essay_revisions WHERE essay_id=?', id, id);
  const hashes = new Set<string>();
  for (const row of rows) for (const match of row.body.matchAll(TOKEN)) if (match[2] === 'media') hashes.add(match[1]);
  const preference = await mediaDownloadPreference();
  await setMediaDownloadPreference(preference.onDemand, [...new Set([...preference.requested, ...hashes])]);
  if (!(await config())) throw new Error('Connect Phone & Mac sync in Settings to download these attachments.');
  // An earlier background sync may have read the old policy. Wait for it, then
  // run with the newly requested hashes so this action always downloads them.
  if (running) await running;
  await syncDevices();
}
