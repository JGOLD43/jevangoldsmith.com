import type { CardInput } from './flashcards';

export type StudySource = { id: string; bookId: string | null; label: string; text: string; note: string; group: string; collectionIds: string[]; createdAt: string };
// Suggestions are extractive, not generated facts. The reader chooses what matters.
export function answerSuggestions(text: string): string[] {
  const sentences = text.match(/[^.!?\n]+[.!?]?/g) ?? [text];
  const definition = text.match(/^(.{3,70}?)\s+(?:is|are|means|refers to)\s/i)?.[1]?.trim();
  const clauses = sentences.flatMap(sentence => sentence.split(/[,;:]|\b(?:because|therefore|rather than)\b/i)).map(s => s.trim().replace(/[.!?]+$/, '')).filter(s => s.length >= 4 && s.length <= 100 && (text.replace(s, '').match(/[\p{L}\p{N}]+/gu)?.length ?? 0) >= 2);
  const words = [...new Set(text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]{4,}/gu) ?? [])].sort((a, b) => b.length - a.length);
  return [...new Set([...(definition ? [definition] : []), ...clauses.slice(-3), ...words])].slice(0, 8);
}
export function makeReadingTest(source: StudySource, phrase: string, group = source.group): CardInput {
  const text = source.text.trim(), answer = phrase.trim();
  if (!answer || !text.includes(answer)) throw new Error('Choose an exact word or phrase from the passage to hide.');
  if ((text.split(answer).join('').match(/[\p{L}\p{N}]+/gu)?.length ?? 0) < 2) throw new Error('Leave some context visible. Hide one idea, not the whole passage.');
  if (text.length > 3500) throw new Error('Select a shorter passage (under 3,500 characters) for one focused test.');
  const masked = text.split(answer).join('[…]');
  return { deckName: group, front: `Complete the missing idea:\n\n${masked}`, back: answer, note: `${text}${source.note ? `\n\nYour note: ${source.note}` : ''}`, bookId: source.bookId, sourceLabel: source.label, sourceKey: `${source.id}|${answer}`, promptKind: 'recall', reverseEnabled: false, tags: ['reading', 'cloze'] };
}
export function sourceHasTest(sourceId: string, keys: (string | null | undefined)[]) { return keys.some(key => key?.startsWith(`${sourceId}|`)); }

export function questionFromPassage(source: StudySource, group = source.group): CardInput | null {
  const sentence = source.text.match(/[^.!?\n]+[.!?]?/g)?.map(s => s.trim()).find(s => /\s(?:is|are|means|because)\s/i.test(s));
  if (!sentence || sentence.length > 1000) return null;
  const cause = sentence.match(/^(.{8,180}?)\s+because\s+(.{8,})$/i);
  const definition = sentence.match(/^(.{3,70}?)\s+(is|are|means)\s+(.{8,})$/i);
  const question = cause ? `According to the passage, why is this true?\n\n${cause[1]}` : definition ? `What ${definition[2].toLocaleLowerCase() === 'are' ? 'are' : 'is'} ${definition[1]}?` : null;
  if (!question) return null;
  return { deckName: group, front: question, back: cause?.[2] ?? definition![3], note: `${source.text}${source.note ? `\n\nYour note: ${source.note}` : ''}`, bookId: source.bookId, sourceLabel: source.label, sourceKey: `${source.id}|question:${sentence}`, promptKind: cause ? 'explain' : 'recall', reverseEnabled: false, tags: ['reading'] };
}
