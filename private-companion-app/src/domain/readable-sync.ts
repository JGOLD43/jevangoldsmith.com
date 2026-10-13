import { bodyText } from "./studio-document.cjs";
export function readableSyncValue(value: unknown): string {
  if (value === undefined) return "Deleted";
  if (value === null || value === "") return "Empty";
  if (typeof value === "string") {
    if (value.startsWith("JGOLD-DOCUMENT-1\n")) return bodyText(value);
    if (/^[\[{]/.test(value)) {
      try {
        return readableSyncValue(JSON.parse(value));
      } catch {
        /* Normal text. */
      }
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(readableSyncValue).join("\n");
  if (typeof value === "object")
    return Object.entries(value)
      .map(
        ([key, field]) =>
          `${key.replaceAll("_", " ")}: ${readableSyncValue(field)}`,
      )
      .join("\n");
  return String(value);
}
