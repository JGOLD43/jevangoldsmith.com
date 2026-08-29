import * as Crypto from 'expo-crypto';

import type {
  AiMessage,
  EssayDocument,
  EssayRevision,
  EssayRevisionReason,
  LifeItem,
  NewEssayDocument,
  NewLifeItem,
  NewRelationshipContact,
  NewPublicDraft,
  NewVaultItem,
  PublicDraft,
  RelationshipContact,
  RelationshipInteraction,
  VaultItem,
} from '@/domain/models';

import { getDatabase } from './database';
import { removePrivateAttachment } from './attachments';

type VaultRow = {
  id: string;
  kind: VaultItem['kind'];
  title: string;
  body: string;
  amount: number | null;
  attachment_uri: string | null;
  created_at: string;
  updated_at: string;
};

type DraftRow = {
  id: string;
  type: PublicDraft['type'];
  title: string;
  summary: string;
  body: string;
  source_id: string | null;
  operation: PublicDraft['operation'];
  now_location_label: string | null;
  now_location_lat: number | null;
  now_location_lng: number | null;
  now_location_zoom: number | null;
  status: PublicDraft['status'];
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  role: AiMessage['role'];
  content: string;
  created_at: string;
};

type LifeItemRow = {
  id: string;
  area: LifeItem['area'];
  title: string;
  note: string;
  progress: number;
  target_date: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type RelationshipContactRow = {
  id: string;
  name: string;
  company: string;
  role: string;
  email: string;
  phone: string;
  website: string;
  location: string;
  tags_json: string;
  notes: string;
  cadence_days: number;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  created_at: string;
  updated_at: string;
};

type RelationshipInteractionRow = {
  id: string;
  contact_id: string;
  summary: string;
  occurred_at: string;
  created_at: string;
};

type EssayDocumentRow = {
  id: string;
  source_id: string | null;
  title: string;
  summary: string;
  body: string;
  collection_name: string;
  visibility: EssayDocument['visibility'];
  created_at: string;
  updated_at: string;
};

type EssayRevisionRow = {
  id: string;
  essay_id: string;
  sequence: number;
  title: string;
  summary: string;
  body: string;
  character_count: number;
  change_size: number;
  reason: EssayRevisionReason;
  created_at: string;
};

function id(): string {
  return Crypto.randomUUID();
}

function mapVault(row: VaultRow): VaultItem {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    amount: row.amount,
    attachmentUri: row.attachment_uri,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDraft(row: DraftRow): PublicDraft {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    summary: row.summary,
    body: row.body,
    sourceId: row.source_id,
    operation: row.operation,
    nowLocation: row.now_location_label && row.now_location_lat !== null && row.now_location_lng !== null
      ? { label: row.now_location_label, lat: row.now_location_lat, lng: row.now_location_lng, zoom: row.now_location_zoom ?? 10 }
      : null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLifeItem(row: LifeItemRow): LifeItem {
  return {
    id: row.id,
    area: row.area,
    title: row.title,
    note: row.note,
    progress: row.progress,
    targetDate: row.target_date,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRelationshipContact(row: RelationshipContactRow): RelationshipContact {
  let tags: string[] = [];
  try {
    const parsed = JSON.parse(row.tags_json);
    if (Array.isArray(parsed)) tags = parsed.filter((tag): tag is string => typeof tag === 'string');
  } catch { /* Keep corrupted historical tags from blocking the private workspace. */ }
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    role: row.role,
    email: row.email,
    phone: row.phone,
    website: row.website,
    location: row.location,
    tags,
    notes: row.notes,
    cadenceDays: row.cadence_days,
    lastContactedAt: row.last_contacted_at,
    nextFollowUpAt: row.next_follow_up_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRelationshipInteraction(row: RelationshipInteractionRow): RelationshipInteraction {
  return { id: row.id, contactId: row.contact_id, summary: row.summary, occurredAt: row.occurred_at, createdAt: row.created_at };
}

function mapEssayDocument(row: EssayDocumentRow): EssayDocument {
  return {
    id: row.id,
    sourceId: row.source_id,
    title: row.title,
    summary: row.summary,
    body: row.body,
    collectionName: row.collection_name,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEssayRevision(row: EssayRevisionRow): EssayRevision {
  return {
    id: row.id,
    essayId: row.essay_id,
    sequence: row.sequence,
    title: row.title,
    summary: row.summary,
    body: row.body,
    characterCount: row.character_count,
    changeSize: row.change_size,
    reason: row.reason,
    createdAt: row.created_at,
  };
}

export async function listEssayDocuments(): Promise<EssayDocument[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<EssayDocumentRow>('SELECT * FROM essay_documents ORDER BY updated_at DESC');
  return rows.map(mapEssayDocument);
}

export async function addEssayDocument(input: NewEssayDocument): Promise<EssayDocument> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const essay: EssayDocument = {
    id: id(),
    sourceId: input.sourceId ?? null,
    title: input.title.trim() || 'Untitled essay',
    summary: input.summary.trim(),
    body: input.body,
    collectionName: input.collectionName.trim() || 'Unsorted',
    visibility: input.visibility,
    createdAt: now,
    updatedAt: now,
  };
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `INSERT INTO essay_documents
        (id, source_id, title, summary, body, collection_name, visibility, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      essay.id, essay.sourceId, essay.title, essay.summary, essay.body,
      essay.collectionName, essay.visibility, essay.createdAt, essay.updatedAt,
    );
    await database.runAsync(
      `INSERT INTO essay_revisions
        (id, essay_id, sequence, title, summary, body, character_count, change_size, reason, created_at)
        VALUES (?, ?, 1, ?, ?, ?, ?, ?, 'created', ?)`,
      id(), essay.id, essay.title, essay.summary, essay.body, essay.body.length, essay.body.length, now,
    );
  });
  return essay;
}

export async function saveEssayDocument(
  essayId: string,
  input: NewEssayDocument,
  reason: EssayRevisionReason = 'manual',
): Promise<EssayDocument> {
  const database = await getDatabase();
  const existing = await database.getFirstAsync<EssayDocumentRow>('SELECT * FROM essay_documents WHERE id = ?', essayId);
  if (!existing) throw new Error('This essay no longer exists.');
  const title = input.title.trim() || 'Untitled essay';
  const summary = input.summary.trim();
  const collectionName = input.collectionName.trim() || 'Unsorted';
  const unchanged = title === existing.title && summary === existing.summary && input.body === existing.body
    && collectionName === existing.collection_name && input.visibility === existing.visibility;
  if (unchanged) return mapEssayDocument(existing);
  const now = new Date().toISOString();
  const next: EssayDocument = {
    id: existing.id,
    sourceId: input.sourceId ?? existing.source_id,
    title,
    summary,
    body: input.body,
    collectionName,
    visibility: input.visibility,
    createdAt: existing.created_at,
    updatedAt: now,
  };
  await database.withTransactionAsync(async () => {
    const latest = await database.getFirstAsync<{ sequence: number }>(
      'SELECT sequence FROM essay_revisions WHERE essay_id=? ORDER BY sequence DESC LIMIT 1', essayId,
    );
    await database.runAsync(
      `UPDATE essay_documents SET source_id=?, title=?, summary=?, body=?, collection_name=?, visibility=?, updated_at=? WHERE id=?`,
      next.sourceId, next.title, next.summary, next.body, next.collectionName, next.visibility, next.updatedAt, essayId,
    );
    await database.runAsync(
      `INSERT INTO essay_revisions
        (id, essay_id, sequence, title, summary, body, character_count, change_size, reason, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id(), essayId, (latest?.sequence ?? 0) + 1, next.title, next.summary, next.body,
      next.body.length, next.body.length - existing.body.length, reason, now,
    );
  });
  return next;
}

export async function listEssayRevisions(essayId: string): Promise<EssayRevision[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<EssayRevisionRow>(
    'SELECT * FROM essay_revisions WHERE essay_id=? ORDER BY sequence DESC', essayId,
  );
  return rows.map(mapEssayRevision);
}

export async function removeEssayDocument(essayId: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM essay_documents WHERE id=?', essayId);
}

export async function listLifeItems(): Promise<LifeItem[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<LifeItemRow>(
    'SELECT * FROM life_items ORDER BY completed_at IS NOT NULL, updated_at DESC',
  );
  return rows.map(mapLifeItem);
}

export async function addLifeItem(input: NewLifeItem): Promise<LifeItem> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const progress = Math.max(0, Math.min(100, Math.round(input.progress)));
  const item: LifeItem = {
    id: id(),
    area: input.area,
    title: input.title.trim(),
    note: input.note.trim(),
    progress,
    targetDate: input.targetDate.trim(),
    completedAt: progress === 100 ? now : null,
    createdAt: now,
    updatedAt: now,
  };
  await database.runAsync(
    `INSERT INTO life_items
      (id, area, title, note, progress, target_date, completed_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    item.id, item.area, item.title, item.note, item.progress, item.targetDate,
    item.completedAt, item.createdAt, item.updatedAt,
  );
  return item;
}

export async function updateLifeItem(itemId: string, input: NewLifeItem): Promise<LifeItem> {
  const database = await getDatabase();
  const existing = await database.getFirstAsync<LifeItemRow>('SELECT * FROM life_items WHERE id = ?', itemId);
  if (!existing) throw new Error('This item no longer exists.');
  const now = new Date().toISOString();
  const progress = Math.max(0, Math.min(100, Math.round(input.progress)));
  const completedAt = progress === 100 ? existing.completed_at ?? now : null;
  await database.runAsync(
    'UPDATE life_items SET area=?, title=?, note=?, progress=?, target_date=?, completed_at=?, updated_at=? WHERE id=?',
    input.area, input.title.trim(), input.note.trim(), progress, input.targetDate.trim(), completedAt, now, itemId,
  );
  return mapLifeItem({
    ...existing,
    area: input.area,
    title: input.title.trim(),
    note: input.note.trim(),
    progress,
    target_date: input.targetDate.trim(),
    completed_at: completedAt,
    updated_at: now,
  });
}

export async function removeLifeItem(itemId: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM life_items WHERE id = ?', itemId);
}

export async function listRelationshipContacts(): Promise<RelationshipContact[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<RelationshipContactRow>(
    'SELECT * FROM relationship_contacts ORDER BY next_follow_up_at IS NULL, next_follow_up_at ASC, updated_at DESC',
  );
  return rows.map(mapRelationshipContact);
}

export async function addRelationshipContact(input: NewRelationshipContact): Promise<RelationshipContact> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const contact: RelationshipContact = {
    id: id(), name: input.name.trim(), company: input.company.trim(), role: input.role.trim(), email: input.email.trim(), phone: input.phone.trim(), website: input.website.trim(), location: input.location.trim(),
    tags: input.tags.map((tag) => tag.trim()).filter(Boolean), notes: input.notes.trim(),
    cadenceDays: Math.max(1, Math.min(3650, Math.round(input.cadenceDays || 30))),
    lastContactedAt: null, nextFollowUpAt: input.nextFollowUpAt || null, createdAt: now, updatedAt: now,
  };
  await database.runAsync(
    `INSERT INTO relationship_contacts
      (id, name, company, role, email, phone, website, location, tags_json, notes, cadence_days, last_contacted_at, next_follow_up_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    contact.id, contact.name, contact.company, contact.role, contact.email, contact.phone, contact.website, contact.location, JSON.stringify(contact.tags), contact.notes,
    contact.cadenceDays, contact.lastContactedAt, contact.nextFollowUpAt, contact.createdAt, contact.updatedAt,
  );
  return contact;
}

export async function updateRelationshipContact(contactId: string, input: NewRelationshipContact): Promise<RelationshipContact> {
  const database = await getDatabase();
  const existing = await database.getFirstAsync<RelationshipContactRow>('SELECT * FROM relationship_contacts WHERE id=?', contactId);
  if (!existing) throw new Error('This person no longer exists.');
  const now = new Date().toISOString();
  const tags = input.tags.map((tag) => tag.trim()).filter(Boolean);
  const cadenceDays = Math.max(1, Math.min(3650, Math.round(input.cadenceDays || 30)));
  const nextFollowUpAt = input.nextFollowUpAt || null;
  await database.runAsync(
    `UPDATE relationship_contacts SET name=?, company=?, role=?, email=?, phone=?, website=?, location=?, tags_json=?, notes=?, cadence_days=?, next_follow_up_at=?, updated_at=? WHERE id=?`,
    input.name.trim(), input.company.trim(), input.role.trim(), input.email.trim(), input.phone.trim(), input.website.trim(), input.location.trim(), JSON.stringify(tags), input.notes.trim(), cadenceDays, nextFollowUpAt, now, contactId,
  );
  return mapRelationshipContact({ ...existing, name: input.name.trim(), company: input.company.trim(), role: input.role.trim(), email: input.email.trim(), phone: input.phone.trim(), website: input.website.trim(), location: input.location.trim(), tags_json: JSON.stringify(tags), notes: input.notes.trim(), cadence_days: cadenceDays, next_follow_up_at: nextFollowUpAt, updated_at: now });
}

export async function removeRelationshipContact(contactId: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM relationship_contacts WHERE id=?', contactId);
}

export async function listRelationshipInteractions(contactId: string): Promise<RelationshipInteraction[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<RelationshipInteractionRow>('SELECT * FROM relationship_interactions WHERE contact_id=? ORDER BY occurred_at DESC', contactId);
  return rows.map(mapRelationshipInteraction);
}

export async function addRelationshipInteraction(contactId: string, summary: string, occurredAt = new Date().toISOString()): Promise<RelationshipInteraction> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const interaction: RelationshipInteraction = { id: id(), contactId, summary: summary.trim(), occurredAt, createdAt: now };
  const contact = await database.getFirstAsync<RelationshipContactRow>('SELECT * FROM relationship_contacts WHERE id=?', contactId);
  if (!contact) throw new Error('This person no longer exists.');
  const nextFollowUpAt = new Date(new Date(occurredAt).getTime() + contact.cadence_days * 86_400_000).toISOString();
  await database.withTransactionAsync(async () => {
    await database.runAsync('INSERT INTO relationship_interactions (id, contact_id, summary, occurred_at, created_at) VALUES (?, ?, ?, ?, ?)', interaction.id, interaction.contactId, interaction.summary, interaction.occurredAt, interaction.createdAt);
    await database.runAsync('UPDATE relationship_contacts SET last_contacted_at=?, next_follow_up_at=?, updated_at=? WHERE id=?', interaction.occurredAt, nextFollowUpAt, now, contactId);
  });
  return interaction;
}

export async function listVaultItems(): Promise<VaultItem[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<VaultRow>('SELECT * FROM vault_items ORDER BY updated_at DESC');
  return rows.map(mapVault);
}

export async function addVaultItem(input: NewVaultItem): Promise<VaultItem> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const item: VaultItem = {
    id: id(),
    kind: input.kind,
    title: input.title.trim(),
    body: input.body.trim(),
    amount: input.amount ?? null,
    attachmentUri: input.attachmentUri ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await database.runAsync(
    `INSERT INTO vault_items
      (id, kind, title, body, amount, attachment_uri, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    item.id,
    item.kind,
    item.title,
    item.body,
    item.amount,
    item.attachmentUri,
    item.createdAt,
    item.updatedAt,
  );
  return item;
}

export async function removeVaultItem(itemId: string): Promise<void> {
  const database = await getDatabase();
  const item = await database.getFirstAsync<{ attachment_uri: string | null }>(
    'SELECT attachment_uri FROM vault_items WHERE id = ?',
    itemId,
  );
  if (item?.attachment_uri) removePrivateAttachment(item.attachment_uri);
  await database.runAsync('DELETE FROM vault_items WHERE id = ?', itemId);
}

export async function listPublicDrafts(): Promise<PublicDraft[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<DraftRow>('SELECT * FROM public_drafts ORDER BY updated_at DESC');
  return rows.map(mapDraft);
}

export async function addPublicDraft(input: NewPublicDraft): Promise<PublicDraft> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const draft: PublicDraft = {
    id: id(),
    type: input.type,
    title: input.title.trim(),
    summary: input.summary.trim(),
    body: input.body.trim(),
    sourceId: input.sourceId ?? null,
    operation: input.operation ?? 'create',
    nowLocation: input.nowLocation ?? null,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
  await database.runAsync(
    `INSERT INTO public_drafts
      (id, type, title, summary, body, source_id, operation, now_location_label, now_location_lat, now_location_lng, now_location_zoom, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    draft.id,
    draft.type,
    draft.title,
    draft.summary,
    draft.body,
    draft.sourceId,
    draft.operation,
    draft.nowLocation?.label ?? null,
    draft.nowLocation?.lat ?? null,
    draft.nowLocation?.lng ?? null,
    draft.nowLocation?.zoom ?? null,
    draft.status,
    draft.createdAt,
    draft.updatedAt,
  );
  return draft;
}

export async function updatePublicDraft(
  draftId: string,
  input: Pick<PublicDraft, 'title' | 'summary' | 'body' | 'nowLocation'>,
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE public_drafts SET title = ?, summary = ?, body = ?, now_location_label = ?, now_location_lat = ?, now_location_lng = ?, now_location_zoom = ?, status = ?, updated_at = ? WHERE id = ?',
    input.title.trim(),
    input.summary.trim(),
    input.body.trim(),
    input.nowLocation?.label ?? null,
    input.nowLocation?.lat ?? null,
    input.nowLocation?.lng ?? null,
    input.nowLocation?.zoom ?? null,
    'draft',
    new Date().toISOString(),
    draftId,
  );
}

export async function updateDraftStatus(
  draftId: string,
  status: PublicDraft['status'],
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE public_drafts SET status = ?, updated_at = ? WHERE id = ?',
    status,
    new Date().toISOString(),
    draftId,
  );
}

export async function listAiMessages(): Promise<AiMessage[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<MessageRow>('SELECT * FROM ai_messages ORDER BY created_at ASC');
  return rows.map((row) => ({
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  }));
}

export async function addAiMessage(role: AiMessage['role'], content: string): Promise<AiMessage> {
  const database = await getDatabase();
  const message: AiMessage = {
    id: id(),
    role,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };
  await database.runAsync(
    'INSERT INTO ai_messages (id, role, content, created_at) VALUES (?, ?, ?, ?)',
    message.id,
    message.role,
    message.content,
    message.createdAt,
  );
  return message;
}

export async function clearAiMessages(): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM ai_messages');
}
