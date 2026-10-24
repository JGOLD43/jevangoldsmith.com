import { bodyText, readDocument } from "./studio-document.cjs";
import type { EssayDocument, EssayRevision } from "./models";

export type DocumentKind =
  | "note"
  | "writing"
  | "jokes"
  | "memes"
  | "sayings"
  | "daily"
  | "clip";
export type DocumentMetadata = {
  kind?: DocumentKind;
  tags?: string[];
  aliases?: string[];
  author?: string;
  sourceUrl?: string;
  status?: "idea" | "draft" | "review" | "finished";
  favourite?: boolean;
  dailyDate?: string;
  privateComment?: string;
  latitude?: number;
  longitude?: number;
  place?: string;
  capturedAt?: string;
  mergedFrom?: string[];
  mergedIntoId?: string;
};
export type TextChange = { type: "same" | "added" | "removed"; text: string };

export function readMetadata(
  value: string | null | undefined,
): DocumentMetadata {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

export function normaliseMetadata(
  value: DocumentMetadata = {},
): DocumentMetadata {
  const clean = { ...value };
  for (const key of ["tags", "aliases"] as const) {
    if (clean[key])
      clean[key] = [
        ...new Set(clean[key]!.map((s) => s.trim()).filter(Boolean)),
      ].sort((a, b) => a.localeCompare(b));
  }
  return Object.fromEntries(
    Object.entries(clean)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b)),
  ) as DocumentMetadata;
}

// Bounded word diff: common edges keep long documents cheap; very large edits
// become one honest replacement rather than allocating an unbounded LCS matrix.
export function diffText(before: string, after: string): TextChange[] {
  if (before === after) return before ? [{ type: "same", text: before }] : [];
  const a = before.match(/\s+|[^\s]+/g) ?? [],
    b = after.match(/\s+|[^\s]+/g) ?? [];
  let start = 0,
    end = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  while (
    end < a.length - start &&
    end < b.length - start &&
    a[a.length - 1 - end] === b[b.length - 1 - end]
  )
    end++;
  const left = a.slice(start, a.length - end),
    right = b.slice(start, b.length - end);
  const result: TextChange[] = [];
  const push = (type: TextChange["type"], text: string) => {
    if (!text) return;
    const last = result[result.length - 1];
    if (last?.type === type) last.text += text;
    else result.push({ type, text });
  };
  push("same", a.slice(0, start).join(""));
  if (left.length * right.length > 250_000) {
    push("removed", left.join(""));
    push("added", right.join(""));
  } else {
    const width = right.length + 1;
    const matrix = new Uint32Array((left.length + 1) * width);
    for (let i = left.length - 1; i >= 0; i--)
      for (let j = right.length - 1; j >= 0; j--)
        matrix[i * width + j] =
          left[i] === right[j]
            ? matrix[(i + 1) * width + j + 1] + 1
            : Math.max(matrix[(i + 1) * width + j], matrix[i * width + j + 1]);
    let i = 0,
      j = 0;
    while (i < left.length || j < right.length) {
      if (i < left.length && j < right.length && left[i] === right[j]) {
        push("same", left[i++]);
        j++;
      } else if (
        i < left.length &&
        (j === right.length ||
          matrix[(i + 1) * width + j] >= matrix[i * width + j + 1])
      )
        push("removed", left[i++]);
      else push("added", right[j++]);
    }
  }
  push("same", end ? a.slice(a.length - end).join("") : "");
  return result;
}

type HistoryContent = Pick<
  EssayDocument,
  | "title"
  | "summary"
  | "body"
  | "collectionName"
  | "visibility"
  | "sourceId"
  | "metadata"
  | "deletedAt"
>;
export function describeDocumentChange(
  before: HistoryContent | null,
  after: HistoryContent,
): string {
  if (!before) return "Document created";
  if (!before.deletedAt && after.deletedAt) return "Moved to Trash";
  if (before.deletedAt && !after.deletedAt) return "Restored from Trash";
  const changes: string[] = [];
  if (before.title !== after.title) changes.push("Renamed");
  if (before.summary !== after.summary) changes.push("Updated summary");
  if (before.body !== after.body) {
    const diff = diffText(bodyText(before.body), bodyText(after.body));
    const words = (type: TextChange["type"]) =>
      diff
        .filter((p) => p.type === type)
        .reduce((n, p) => n + (p.text.match(/\S+/g)?.length ?? 0), 0);
    const added = words("added"),
      removed = words("removed");
    if (added) changes.push(`Added ${added} ${added === 1 ? "word" : "words"}`);
    if (removed)
      changes.push(`removed ${removed} ${removed === 1 ? "word" : "words"}`);
    const media = (body: string) =>
      JSON.stringify(
        readDocument(body)?.blocks.filter((b) => b.type !== "text") ?? [],
      );
    if (media(before.body) !== media(after.body)) changes.push("Updated media");
    if (!added && !removed && media(before.body) === media(after.body))
      changes.push("Updated formatting");
  }
  if (before.collectionName !== after.collectionName)
    changes.push("Moved collection");
  if (before.visibility !== after.visibility)
    changes.push("Changed visibility");
  if (before.sourceId !== after.sourceId) changes.push("Updated source");
  if (
    JSON.stringify(normaliseMetadata(before.metadata)) !==
    JSON.stringify(normaliseMetadata(after.metadata))
  )
    changes.push("Updated properties");
  return changes.join(" · ") || "Version saved";
}

export function groupRevisionSessions<
  T extends Pick<EssayRevision, "id" | "createdAt" | "deviceId">,
>(revisions: T[], gapMinutes = 20): T[][] {
  const groups: T[][] = [];
  for (const revision of revisions) {
    const group = groups[groups.length - 1],
      previous = group?.[group.length - 1];
    if (
      previous &&
      previous.deviceId === revision.deviceId &&
      Math.abs(
        Date.parse(previous.createdAt) - Date.parse(revision.createdAt),
      ) <=
        gapMinutes * 60_000
    )
      group.push(revision);
    else groups.push([revision]);
  }
  return groups;
}
