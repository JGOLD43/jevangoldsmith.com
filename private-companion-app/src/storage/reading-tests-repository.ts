import type { StudySource } from '@/learning/reading-tests';
import { getDatabase } from './database';

export async function listStudySources(): Promise<{ sources: StudySource[]; collections: { id: string; name: string }[] }> {
  const database = await getDatabase();
  const [annotations, collections, members] = await Promise.all([
    database.getAllAsync<{ id: string; book_id: string; title: string; author: string; selected_text: string; note: string; locator: string; created_at: string }>(`SELECT a.*, b.title, b.author FROM book_annotations a JOIN books b ON b.id=a.book_id WHERE a.kind IN ('highlight','note') AND (trim(a.selected_text)<>'' OR trim(a.note)<>'') ORDER BY a.created_at DESC`),
    database.getAllAsync<{ id: string; name: string }>('SELECT id,name FROM book_collections ORDER BY name'),
    database.getAllAsync<{ book_id: string; collection_id: string }>('SELECT book_id,collection_id FROM book_collection_members'),
  ]);
  return { collections, sources: annotations.map(a => ({ id: `annotation:${a.id}`, bookId: a.book_id, label: `${a.title}${a.author ? ` — ${a.author}` : ''}${a.locator ? ` · ${a.locator}` : ''}`, text: a.selected_text.trim() || a.note.trim(), note: a.selected_text.trim() ? a.note : '', group: a.title, collectionIds: members.filter(m => m.book_id === a.book_id).map(m => m.collection_id), createdAt: a.created_at })) };
}
