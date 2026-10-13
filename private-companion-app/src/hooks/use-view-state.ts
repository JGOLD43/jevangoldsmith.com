import {
  useEffect,
  useState,
  useSyncExternalStore,
  type SetStateAction,
} from "react";
import {
  readLocalPreference,
  writeLocalPreference,
} from "@/storage/local-preferences";
import {
  createSaveQueue,
  refreshSaveStatus,
  registerSaveParticipant,
} from "@/services/save-queue";

type Store = {
  queue: ReturnType<typeof createSaveQueue<any>>;
  loaded: boolean;
  loading?: Promise<void>;
};
const stores = new Map<string, Store>();
export function useViewState<T>(
  key: string,
  fallback: T | (() => T),
): [T, (next: SetStateAction<T>) => void, boolean] {
  let store = stores.get(key);
  if (!store) {
    const initial =
      typeof fallback === "function" ? (fallback as () => T)() : fallback;
    store = {
      queue: createSaveQueue(initial, async (value) => {
        await writeLocalPreference("view:" + key, value);
        return value;
      }),
      loaded: false,
    };
    stores.set(key, store);
  }
  const target = store;
  const [, setVersion] = useState(0);
  const value = useSyncExternalStore(
    target.queue.subscribe,
    target.queue.snapshot,
    target.queue.snapshot,
  );
  useEffect(() => {
    let active = true;
    if (!target.loading)
      target.loading = readLocalPreference(
        "view:" + key,
        target.queue.snapshot().value,
      )
        .then((stored) => {
          if (!target.queue.snapshot().revision) target.queue.receive(stored);
        })
        .catch(() => undefined)
        .then(() => {
          target.loaded = true;
        });
    void target.loading.then(() => {
      if (active) setVersion((version) => version + 1);
    });
    const unregister = registerSaveParticipant("view:" + key, {
      flush: target.queue.flush,
      dirty: () =>
        target.queue.snapshot().revision !==
        target.queue.snapshot().savedRevision,
    });
    const unsubscribe = target.queue.subscribe(refreshSaveStatus);
    return () => {
      active = false;
      void target.queue
        .flush()
        .catch(() => undefined)
        .finally(() => {
          unsubscribe();
          unregister();
        });
    };
  }, [key, target]);
  useEffect(() => {
    if (value.status !== "editing") return;
    const timer = setTimeout(() => {
      void target.queue.flush().catch(() => undefined);
    }, 600);
    return () => clearTimeout(timer);
  }, [target, value.revision, value.status]);
  return [
    value.value as T,
    (next) =>
      target.queue.edit(
        typeof next === "function"
          ? (next as (value: T) => T)(target.queue.snapshot().value)
          : next,
      ),
    target.loaded,
  ];
}

export function useViewFields<T extends object>(key: string, fallback: T) {
  const [value, setValue, ready] = useViewState(key, fallback);
  function set<K extends keyof T>(field: K, next: SetStateAction<T[K]>) {
    setValue((old) => ({
      ...old,
      [field]:
        typeof next === "function"
          ? (next as (current: T[K]) => T[K])(old[field])
          : next,
    }));
  }
  return { value, set, ready };
}
