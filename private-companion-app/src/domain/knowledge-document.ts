import {
  readDocument,
  writeDocument,
  type StudioBlock,
} from "./studio-document.cjs";

export type RichNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: RichNode[];
};
export type KnowledgeBlock = StudioBlock & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  rich?: RichNode;
  width?: number;
};
export const plainNode = (text: string): RichNode => ({
  type: "paragraph",
  ...(text ? { content: [{ type: "text", text }] } : {}),
});
export function nodeText(node: RichNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  if (node.type === "noteEmbed")
    return String(node.attrs?.label ?? "Linked note");
  if (node.type === "inlineMath" || node.type === "blockMath")
    return String(node.attrs?.latex ?? "");
  return (node.content ?? [])
    .map(nodeText)
    .join(
      [
        "doc",
        "bulletList",
        "orderedList",
        "taskList",
        "table",
        "tableRow",
      ].includes(node.type)
        ? "\n"
        : "",
    );
}
export function toRichDocument(body: string): RichNode {
  const saved = readDocument(body);
  if (!saved)
    return { type: "doc", content: body.split(/\n\n+/).map(plainNode) };
  return {
    type: "doc",
    content: saved.blocks.map((original) => {
      const block = original as KnowledgeBlock;
      let node: RichNode;
      if (block.type === "text")
        node = block.rich
          ? structuredClone(block.rich)
          : block.style === "heading"
            ? { ...plainNode(block.text), type: "heading", attrs: { level: 2 } }
            : block.style === "quote"
              ? { type: "blockquote", content: [plainNode(block.text)] }
              : plainNode(block.text);
      else if (block.type === "image")
        node = {
          type: "image",
          attrs: {
            src: block.src.startsWith("/")
              ? "https://jevangoldsmith.com" + block.src
              : block.src,
            alt: block.caption,
            title: block.caption,
            width: block.width ?? null,
          },
        };
      else
        node = {
          type: "video",
          attrs: { src: block.src, caption: block.caption },
        };
      node.attrs = { ...node.attrs, blockId: block.id ?? null };
      return node;
    }),
  };
}
export function fromRichDocument(
  root: RichNode,
  previous: string,
  now: string,
  newId: () => string,
): string {
  const previousBlocks = (readDocument(previous)?.blocks ??
    []) as KnowledgeBlock[];
  const byId = new Map(
    previousBlocks.filter((b) => b.id).map((b) => [b.id, b]),
  );
  const currentById = new Map(
    (root.content ?? [])
      .filter((node) => typeof node.attrs?.blockId === "string")
      .map((node) => [node.attrs!.blockId, node]),
  );
  const used = new Set<string>();
  const blocks: KnowledgeBlock[] = (root.content ?? []).map(
    (original, index) => {
      const node = structuredClone(original);
      let id =
        typeof node.attrs?.blockId === "string"
          ? node.attrs.blockId
          : previousBlocks[index]?.id;
      if (!id || used.has(id)) id = newId();
      used.add(id);
      node.attrs = { ...node.attrs, blockId: id };
      const prior = byId.get(id);
      const legacy =
        !prior &&
        ((previousBlocks[index] && !previousBlocks[index].id) ||
          (!readDocument(previous) && previous.trim()));
      const text = nodeText(node).trim();
      const splitFromEarlierContent =
        !prior &&
        text &&
        previousBlocks.some((block) => {
          if (block.type !== "text" || !block.id || !block.text.includes(text))
            return false;
          const remaining = currentById.get(block.id);
          return remaining && nodeText(remaining) !== block.text;
        });
      // A legacy or split passage has no reliable first-added date. Keep that
      // uncertainty on subsequent edits instead of inventing a fresh origin.
      const origin = prior
        ? prior.createdAt
          ? { createdAt: prior.createdAt }
          : {}
        : legacy || splitFromEarlierContent
          ? {}
          : { createdAt: now };
      const base = { id, ...origin, updatedAt: now };
      let block: KnowledgeBlock;
      if (node.type === "image")
        block = {
          ...base,
          type: "image",
          src: String(node.attrs.src ?? ""),
          caption: String(node.attrs.alt ?? ""),
          ...(node.attrs.width ? { width: Number(node.attrs.width) } : {}),
        };
      else if (node.type === "video")
        block = {
          ...base,
          type: "video",
          src: String(node.attrs.src ?? ""),
          caption: String(node.attrs.caption ?? ""),
        };
      else
        block = {
          ...base,
          type: "text",
          text: nodeText(node),
          font: "sans",
          style:
            node.type === "heading"
              ? "heading"
              : node.type === "blockquote"
                ? "quote"
                : "paragraph",
          rich: node,
        };
      const content = (value: KnowledgeBlock) => {
        const { id, createdAt, updatedAt, ...rest } = value;
        return JSON.stringify(rest);
      };
      if (prior && content(prior) === content(block))
        block.updatedAt = prior.updatedAt;
      return block;
    },
  );
  return writeDocument({ version: 1, blocks });
}
export function blockHistory(body: string, id: string) {
  return (readDocument(body)?.blocks as KnowledgeBlock[] | undefined)?.find(
    (block) => block.id === id,
  );
}
export function markdownNode(node: RichNode): string {
  if (node.type === "text") {
    let value = node.text ?? "";
    for (const mark of node.marks ?? []) {
      if (mark.type === "bold") value = `**${value}**`;
      else if (mark.type === "italic") value = `*${value}*`;
      else if (mark.type === "strike") value = `~~${value}~~`;
      else if (mark.type === "code") value = "`" + value + "`";
      else if (mark.type === "highlight") value = `==${value}==`;
      else if (mark.type === "link")
        value = `[${value}](${String(mark.attrs?.href ?? "")})`;
    }
    return value;
  }
  const children = node.content ?? [];
  const inline = () => children.map(markdownNode).join("");
  switch (node.type) {
    case "doc":
      return children.map(markdownNode).join("\n\n");
    case "heading":
      return "#".repeat(Number(node.attrs?.level) || 2) + " " + inline();
    case "hardBreak":
      return "\n";
    case "bulletList":
      return children
        .map((child) => "- " + markdownNode(child).replaceAll("\n", "\n  "))
        .join("\n");
    case "orderedList":
      return children
        .map(
          (child, i) =>
            `${i + 1}. ` + markdownNode(child).replaceAll("\n", "\n   "),
        )
        .join("\n");
    case "taskList":
      return children
        .map(
          (child) =>
            `- [${child.attrs?.checked ? "x" : " "}] ${markdownNode(child)}`,
        )
        .join("\n");
    case "blockquote":
      return children
        .map(markdownNode)
        .join("\n")
        .split("\n")
        .map((line) => "> " + line)
        .join("\n");
    case "codeBlock":
      return (
        "```" +
        String(node.attrs?.language ?? "") +
        "\n" +
        nodeText(node) +
        "\n```"
      );
    case "image":
      return `![${String(node.attrs?.alt ?? "").replaceAll("]", "\\]")}](${String(node.attrs?.src ?? "")})`;
    case "video":
      return `[Video: ${node.attrs?.caption || "attachment"}](${node.attrs?.src || ""})`;
    case "noteEmbed":
      return `[${node.attrs?.label || "Linked note"}](jgold://item/note/${node.attrs?.targetId || ""})`;
    case "horizontalRule":
      return "---";
    case "inlineMath":
      return `$${node.attrs?.latex ?? ""}$`;
    case "blockMath":
      return `$$\n${node.attrs?.latex ?? ""}\n$$`;
    case "table":
      return children
        .map(
          (row, i) =>
            "| " +
            (row.content ?? []).map(markdownNode).join(" | ") +
            " |" +
            (i === 0
              ? "\n| " + (row.content ?? []).map(() => "---").join(" | ") + " |"
              : ""),
        )
        .join("\n");
    case "details":
      return children.map(markdownNode).join("\n\n");
    default:
      return inline();
  }
}
export function documentMarkdown(body: string): string {
  return readDocument(body) ? markdownNode(toRichDocument(body)) : body;
}

// Public Studio's existing contract deliberately contains no editor identities,
// private comments or rich-node attributes. Its preview uses this same copy.
export function publicDocument(body: string) {
  const document = readDocument(body);
  if (!document) return null;
  return {
    version: 1 as const,
    blocks: document.blocks.map((block) =>
      block.type === "text"
        ? {
            type: "text" as const,
            text: block.text,
            font: block.font,
            style: block.style,
          }
        : { type: block.type, src: block.src, caption: block.caption },
    ),
  };
}
