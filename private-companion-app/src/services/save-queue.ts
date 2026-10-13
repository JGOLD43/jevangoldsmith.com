export type SaveState<T> = {
  value: T;
  revision: number;
  savedRevision: number;
  status: "saved" | "editing" | "saving" | "error";
  error: string;
  conflict: T | null;
};

// One queue per document. Acknowledging revision A never replaces a newer B.
export function createSaveQueue<T>(initial: T, save: (value: T) => Promise<T>, options: {
  equal?: (a: T, b: T) => boolean;
  rebase?: (draft: T, acknowledged: T) => T;
} = {}) {
  let state: SaveState<T> = {
    value: initial,
    revision: 0,
    savedRevision: 0,
    status: "saved",
    error: "",
    conflict: null,
  };
  let acknowledged = initial;
  let inFlight: T | null = null;
  let pending: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const emit = (patch: Partial<SaveState<T>>) => {
    state = { ...state, ...patch };
    for (const listener of listeners) listener();
  };
  const same = options.equal ?? ((a: T, b: T) => JSON.stringify(a) === JSON.stringify(b));
  const rebase = options.rebase ?? ((value: T) => value);
  const queue = {
    snapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    edit(value: T) {
      if (!same(value, state.value))
        emit({
          value,
          revision: state.revision + 1,
          status: "editing",
          error: "",
        });
    },
    touch() { emit({ revision: state.revision + 1, status: 'editing', error: '' }); },
    receive(value: T) {
      if (inFlight !== null && same(value, inFlight)) return;
      if (same(value, acknowledged) || same(value, state.value)) {
        acknowledged = value;
        const next = rebase(state.value, value);
        // Receiving the same state is a no-op. Initial records can be recreated
        // while a newly opened note is loading; notifying here causes a render loop.
        if (JSON.stringify(next) !== JSON.stringify(state.value)) emit({ value: next });
        return;
      }
      if (state.revision !== state.savedRevision || pending) {
        emit({ conflict: value });
        return;
      }
      acknowledged = value;
      emit({ value, conflict: null });
    },
    resolve(useIncoming: boolean) {
      const incoming = state.conflict;
      if (incoming === null) return;
      // A save already in flight may have replaced the remote value. Persist
      // either explicit choice so the displayed choice always matches disk.
      emit({
        value: useIncoming ? incoming : rebase(state.value, incoming),
        conflict: null,
        revision: state.revision + 1,
        status: "editing",
        error: "",
      });
    },
    assertDiscardable(reviewed: SaveState<T>) {
      if (pending || state !== reviewed)
        throw new Error("The draft changed or is still saving. Review the current draft before continuing.");
    },
    discard(reviewed: SaveState<T>, value: T) {
      queue.assertDiscardable(reviewed);
      // An explicit discard acknowledges abandoning this working draft. It
      // never writes to, restores or deletes the underlying record.
      const revision = state.revision + 1;
      acknowledged = value;
      emit({ value, revision, savedRevision: revision, status: "saved", error: "", conflict: null });
    },
    flush(): Promise<void> {
      if (pending) return pending;
      pending = (async () => {
        while (true) {
          if (state.conflict !== null)
            throw new Error(
              "Choose which version to keep before saving. Your local draft is still here.",
            );
          if (state.savedRevision >= state.revision) break;
          const { revision, value } = state;
          emit({ status: "saving", error: "" });
          inFlight = value;
          const stored = await save(value);
          acknowledged = stored;
          inFlight = null;
          emit({
            ...(!state.conflict ? { value: state.revision === revision ? stored : rebase(state.value, stored) } : {}),
            savedRevision: revision,
            status: state.revision === revision ? "saved" : "editing",
          });
        }
      })()
        .catch((error) => {
          emit({
            status: "error",
            error:
              error instanceof Error
                ? error.message
                : "Could not save. Please retry.",
          });
          throw error;
        })
        .finally(() => {
          pending = null;
          inFlight = null;
        });
      return pending;
    },
  };
  return queue;
}

const participants = new Map<
  string,
  { flush: () => Promise<void>; dirty: () => boolean }
>();
const listeners = new Set<() => void>();
let status = "Saved on this phone";
export function refreshSaveStatus() {
  const next =
    mutations.size || [...participants.values()].some((item) => item.dirty())
      ? "Changes waiting to save"
      : "Saved on this phone";
  if (next !== status) {
    status = next;
    for (const listener of listeners) listener();
  }
}
export function registerSaveParticipant(
  id: string,
  participant: { flush: () => Promise<void>; dirty: () => boolean },
) {
  participants.set(id, participant);
  refreshSaveStatus();
  return () => {
    if (!participant.dirty() && participants.get(id) === participant)
      participants.delete(id);
    refreshSaveStatus();
  };
}
export async function flushPendingSaves() {
  do {
    while (mutations.size) await Promise.all([...mutations]);
    // A participant may change while a different one is saving. Recheck all
    // revisions before acknowledging a native close or a navigation.
    for (const item of participants.values()) await item.flush();
  } while (
    mutations.size ||
    [...participants.values()].some((item) => item.dirty())
  );
  refreshSaveStatus();
}
export const saveStatus = () => status;
export const subscribeSaveStatus = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const mutations = new Set<Promise<unknown>>();
export function trackPendingSave<T>(task: Promise<T>): Promise<T> {
  mutations.add(task);
  refreshSaveStatus();
  const done = () => {
    mutations.delete(task);
    refreshSaveStatus();
  };
  void task.then(done, done);
  return task;
}
