import { useCallback, useEffect, useState } from "react";
import {
  listKnowledgePreferences,
  type KnowledgePreference,
} from "@/storage/knowledge-preferences";
import { onSyncedData } from "@/services/device-sync-events";
export function useKnowledgePreferences<T>(prefix: string) {
  const [items, setItems] = useState<KnowledgePreference<T>[]>([]),
    [error, setError] = useState("");
  const reload = useCallback(
    () =>
      listKnowledgePreferences<T>(prefix)
        .then((value) => {
          setItems(value);
          setError("");
        })
        .catch((e) => setError(e.message)),
    [prefix],
  );
  useEffect(() => {
    void reload();
    return onSyncedData(() => {
      void reload();
    }, ["knowledge_preferences"]);
  }, [reload]);
  return { items, error, reload };
}
