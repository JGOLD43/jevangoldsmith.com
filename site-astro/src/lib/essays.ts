import source from '../../../data/essays.json';

export interface Essay {
  id: string; title: string; subtitle?: string | null; author?: string;
  date: string; category?: string; status: string; visibility?: string;
  content: string; updatedAt?: string;
}
const introductions: Record<string, { description: string; reason: string }> = {
  'feed-my-addiction': { description: 'On attention, endless scrolling, and choosing what we give our minds to.', reason: 'Begin here if you have been thinking about your relationship with your phone.' },
  'hot-spas': { description: 'An analogy for the difference between a comfortable culture and an energising one.', reason: 'For an interest in how people work together and the culture leaders create.' },
  'beginning-end': { description: 'A reflection on endings, new starts, and what we carry from one into the next.', reason: 'For a moment when a project, a job, or a chapter of life is changing.' }
};
export function isPublishedEssay(essay: Essay): boolean {
  return essay.status === 'published' && essay.visibility !== 'private';
}
export function essayUrl(id: string): string { return `/essays/${encodeURIComponent(id)}.html`; }
export function plainText(html: string): string { return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }
export function essayDescription(essay: Essay): string {
  return introductions[essay.id]?.description || essay.subtitle || plainText(essay.content).slice(0, 160);
}
export function essayReason(essay: Essay): string { return introductions[essay.id]?.reason || essayDescription(essay); }
export function readingMinutes(essay: Essay): number { return Math.max(1, Math.ceil(plainText(essay.content).split(/\s+/).length / 220)); }
export function essayDate(date: string): string {
  return new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
export const publishedEssays = (source.essays as Essay[]).filter(isPublishedEssay).sort((a, b) => b.date.localeCompare(a.date));
const selectedIds = ['feed-my-addiction', 'hot-spas', 'beginning-end'];
export const selectedEssays = selectedIds.map((id) => publishedEssays.find((essay) => essay.id === id)).filter((essay): essay is Essay => !!essay);
export function relatedEssays(essay: Essay): Essay[] {
  return publishedEssays.filter((item) => item.id !== essay.id).sort((a, b) => Number(b.category === essay.category) - Number(a.category === essay.category)).slice(0, 2);
}
