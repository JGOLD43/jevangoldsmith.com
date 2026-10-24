type Listener = {
  callback: (tables?: readonly string[]) => void;
  tables?: readonly string[];
};
const listeners = new Set<Listener>();
export function onSyncedData(
  callback: Listener["callback"],
  tables?: readonly string[],
) {
  const listener = { callback, tables };
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function notifySyncedData(tables?: readonly string[]) {
  if (tables && !tables.length) return;
  for (const listener of listeners)
    if (
      !tables ||
      !listener.tables ||
      listener.tables.some((table) => tables.includes(table))
    )
      listener.callback(tables);
}
