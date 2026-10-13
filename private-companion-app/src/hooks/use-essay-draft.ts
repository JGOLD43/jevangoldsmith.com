import { useEffect, useRef, useSyncExternalStore } from "react";
import { randomUUID } from "expo-crypto";
import type {
  EssayDocument,
  NewEssayDocument,
  EssayRevisionReason,
} from "@/domain/models";
import { bodyText } from "@/domain/studio-document.cjs";
import {
  createSaveQueue,
  refreshSaveStatus,
  registerSaveParticipant,
  type SaveState,
} from "@/services/save-queue";

const fields = (essay: NewEssayDocument): NewEssayDocument => ({
  title: essay.title,
  summary: essay.summary,
  body: essay.body,
  collectionName: essay.collectionName,
  visibility: essay.visibility,
  metadata: essay.metadata ?? {},
  expectedUpdatedAt: (essay as EssayDocument).updatedAt ?? essay.expectedUpdatedAt,
  ...(essay.sourceId ? { sourceId: essay.sourceId } : {}),
});
type Save = (
  id: string | null,
  value: NewEssayDocument,
  reason: EssayRevisionReason,
) => Promise<EssayDocument | null>;
type Record = {
  queue: ReturnType<typeof createSaveQueue<NewEssayDocument>>;
  id: string | null;
  saved: EssayDocument | null;
  save: Save;
  reason: EssayRevisionReason;
  subscribers: number;
  recoveryIds: Map<string, string>;
  recoveryPending: boolean;
};
const drafts = new Map<string, Record>();

export function useEssayDraft(
  key: string,
  initial: NewEssayDocument,
  localId: string | null,
  save: Save,
  enabled: boolean,
) {
  let record = drafts.get(key);
  if (!record) {
    const created: Record = {
      id: localId,
      subscribers: 0,
      recoveryIds: new Map(),
      recoveryPending: false,
      saved: null,
      save,
      reason: "autosave",
      queue: null!,
    };
    created.queue = createSaveQueue(fields(initial), async (input) => {
      const value = { ...input };
      if (!created.id && !value.title.trim())
        value.title =
          bodyText(value.body).trim().split("\n")[0].slice(0, 80) || "Untitled";
      const saved = await created.save(created.id, value, created.reason);
      if (!saved)
        throw new Error(
          "Your writing could not be saved. Keep this draft open and retry.",
        );
      created.id = saved.id;
      created.saved = saved;
      return fields(saved);
    }, {
      equal: (a, b) => {
        const { expectedUpdatedAt: _a, ...left } = a;
        const { expectedUpdatedAt: _b, ...right } = b;
        return JSON.stringify(left) === JSON.stringify(right);
      },
      rebase: (value, acknowledged) => ({ ...value, expectedUpdatedAt: acknowledged.expectedUpdatedAt }),
    });
    drafts.set(key, created);
    record = created;
  }
  record.save = save;
  const draft = record;
  const state = useSyncExternalStore(
    draft.queue.subscribe,
    draft.queue.snapshot,
    draft.queue.snapshot,
  );
  const initialRef = useRef(initial);
  initialRef.current = initial;
  useEffect(() => {
    if (localId) draft.queue.receive(fields(initialRef.current));
  }, [draft, initial, localId]);
  useEffect(() => {
    if (!enabled) return;
    draft.subscribers++;
    const unregister = registerSaveParticipant("essay:" + key, {
      flush: () => draft.queue.flush(),
      dirty: () => {
        const s = draft.queue.snapshot();
        return s.revision !== s.savedRevision || s.conflict !== null;
      },
    });
    const unsubscribe = draft.queue.subscribe(refreshSaveStatus);
    return () => {
      draft.subscribers--;
      void draft.queue
        .flush()
        .catch(() => undefined)
        .finally(() => {
          unsubscribe();
          unregister();
          const current = draft.queue.snapshot();
          if (
            !draft.subscribers &&
            current.revision === current.savedRevision &&
            current.conflict === null &&
            drafts.get(key) === draft
          )
            drafts.delete(key);
        });
    };
  }, [draft, enabled, key]);
  useEffect(() => {
    if (!enabled || state.status !== "editing" || state.conflict) return;
    const timer = setTimeout(() => {
      void draft.queue.flush().catch(() => undefined);
    }, 700);
    return () => clearTimeout(timer);
  }, [draft, enabled, state.revision, state.status, state.conflict]);
  const change = <K extends keyof NewEssayDocument>(
    name: K,
    value: NewEssayDocument[K],
  ) => draft.queue.edit({ ...draft.queue.snapshot().value, [name]: value });
  const persist = async (reason: EssayRevisionReason) => {
    draft.reason = reason;
    const value = draft.queue.snapshot().value;
    if (!draft.id && (value.title.trim() || value.body.trim())) draft.queue.touch();
    await draft.queue.flush();
    return draft.saved;
  };
  const discardWorkingSnapshot = (reviewed: SaveState<NewEssayDocument>) => {
    draft.queue.discard(reviewed, fields({ title: "", summary: "", body: "", collectionName: "Unsorted", visibility: "private" }));
    draft.saved = null;
    refreshSaveStatus();
  };
  const discard = (reviewed: SaveState<NewEssayDocument>) => {
    if (draft.recoveryPending) throw new Error("A private copy is still saving. Wait for its result before discarding this draft.");
    discardWorkingSnapshot(reviewed);
  };
  const recoverRemoved = async (reviewed: SaveState<NewEssayDocument>, recover: (
    removedId: string, copyId: string, value: NewEssayDocument,
  ) => Promise<EssayDocument>) => {
    if (draft.recoveryPending) throw new Error("A private copy is still saving. Wait before retrying.");
    draft.queue.assertDiscardable(reviewed);
    if (!draft.id)
      throw new Error("The draft changed. Review the current writing before saving a copy.");
    const { title, summary, body, collectionName } = reviewed.value;
    const signature = JSON.stringify({ title, summary, body, collectionName });
    let copyId = draft.recoveryIds.get(signature);
    if (!copyId) {
      copyId = randomUUID();
      draft.recoveryIds.set(signature, copyId);
    }
    // Retain this identity through failed acknowledgements and retries. The
    // repository checks an already committed copy instead of inserting twice.
    draft.recoveryPending = true;
    try {
      const copied = await recover(draft.id, copyId, reviewed.value);
      try { discardWorkingSnapshot(reviewed); }
      catch { throw new Error("A private copy was saved, but your retained draft changed or is still saving. Review the current writing before retrying; the same writing reuses its existing copy."); }
      return copied;
    } finally { draft.recoveryPending = false; }
  };
  return { state, change, persist, discard, recoverRemoved, queue: draft.queue, savedId: draft.id };
}
