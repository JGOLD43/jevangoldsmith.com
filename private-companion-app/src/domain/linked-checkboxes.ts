import { readDocument, writeDocument } from "./studio-document.cjs";
import type { KnowledgeBlock, RichNode } from "./knowledge-document";
export function linkedCheckboxes(body: string) {
  const values = new Map<string, boolean>();
  const visit = (node: RichNode) => {
    if (node.type === "taskItem" && typeof node.attrs?.taskId === "string")
      values.set(node.attrs.taskId, Boolean(node.attrs.checked));
    node.content?.forEach(visit);
  };
  for (const block of (readDocument(body)?.blocks ?? []) as KnowledgeBlock[])
    if (block.rich) visit(block.rich);
  return values;
}
export function updateCheckboxes(
  body: string,
  tasks: Map<string, boolean>,
  now: string,
): string {
  const document = readDocument(body);
  if (!document) return body;
  let changed = false;
  for (const block of document.blocks as KnowledgeBlock[]) {
    let blockChanged = false;
    const visit = (node: RichNode) => {
      const id = node.attrs?.taskId;
      if (
        node.type === "taskItem" &&
        typeof id === "string" &&
        tasks.has(id) &&
        Boolean(node.attrs?.checked) !== tasks.get(id)
      ) {
        node.attrs = { ...node.attrs, checked: tasks.get(id) };
        changed = true;
        blockChanged = true;
      }
      node.content?.forEach(visit);
    };
    if (block.rich) visit(block.rich);
    if (blockChanged) block.updatedAt = now;
  }
  return changed ? writeDocument(document) : body;
}
