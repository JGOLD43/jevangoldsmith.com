import type { NowLocation, PublicBookFields, PublicDraft, VaultItem } from './models';

export type PublicAiContext = {
  source: 'general' | 'public-draft';
  title?: string;
  content: string;
};

type ContentPublishManifestBase = {
  version: 1;
  id: string;
  title: string;
  summary: string;
  body: string;
  sourceId: string | null;
  operation: PublicDraft['operation'];
};

export type ContentPublishManifest = ContentPublishManifestBase & (
  | { type: Exclude<PublicDraft['type'], 'now'> }
  | { type: 'now'; nowLocation: NowLocation }
);

export type BookPublishManifest = {
  version: 1;
  id: string;
  type: 'book';
  sourceId: string | null;
  operation: 'create' | 'update';
  book: PublicBookFields;
};

export type PublishManifest = ContentPublishManifest | BookPublishManifest;

export function createPublicDraftFromVault(item: VaultItem): Omit<PublicDraft, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    type: item.kind === 'photo' ? 'adventure' : 'essay',
    title: item.title,
    summary: '',
    body: item.kind === 'finance' ? '' : item.body,
    sourceId: null,
    operation: 'create',
    nowLocation: null,
    status: 'draft',
  };
}

export function createAiContext(prompt: string, draft?: PublicDraft): PublicAiContext {
  if (!draft) {
    return { source: 'general', content: prompt.trim() };
  }
  return {
    source: 'public-draft',
    title: draft.title,
    content: `${prompt.trim()}\n\nPublic draft:\n${draft.title}\n${draft.summary}\n${draft.body}`.trim(),
  };
}

export function createPublishManifest(draft: PublicDraft): PublishManifest {
  const common: ContentPublishManifestBase = {
    version: 1,
    id: draft.id,
    title: draft.title.trim(),
    summary: draft.summary.trim(),
    body: draft.body.trim(),
    sourceId: draft.sourceId,
    operation: draft.operation,
  };
  if (draft.type === 'now') {
    if (!draft.nowLocation) throw new Error('Choose a location before publishing this Now update.');
    return { version: 1, id: common.id, type: 'now', title: common.title, summary: common.summary, body: common.body, sourceId: common.sourceId, operation: common.operation, nowLocation: draft.nowLocation };
  }
  return { version: 1, id: common.id, type: draft.type, title: common.title, summary: common.summary, body: common.body, sourceId: common.sourceId, operation: common.operation };
}

export function canPublish(draft: PublicDraft): boolean {
  return draft.title.trim().length > 0 && draft.body.trim().length > 0 && (draft.type !== 'now' || Boolean(draft.nowLocation));
}

export function createBookPublishManifest(id: string, sourceId: string | null, book: PublicBookFields): BookPublishManifest {
  return {
    version: 1,
    id,
    type: 'book',
    sourceId,
    operation: sourceId ? 'update' : 'create',
    book: {
      title: book.title.trim(),
      author: book.author.trim(),
      isbn: book.isbn.trim(),
      year: book.year.trim(),
      rating: Math.max(0, Math.min(5, book.rating)),
      reReads: Math.max(0, book.reReads),
      category: book.category.trim(),
      summary: book.summary.trim(),
      review: book.review.trim(),
      read: book.read,
    },
  };
}
