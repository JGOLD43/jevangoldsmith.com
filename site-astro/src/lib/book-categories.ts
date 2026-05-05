// Single source of truth for the books-page category routing. Used by:
// - books.astro to bucket the SSR'd cards into per-category sidebar lists
// - books.ts at runtime to resolve a category-key click to its display name
export const CATEGORY_MAP: Record<string, string> = {
  'Advertising and Copywriting': 'advertising',
  'Autobiographies': 'autobiographies',
  'Big Ideas': 'bigideas',
  'Learning': 'learning',
  'Mental Endurance': 'mentalendurance',
  'Out of the Box Thinking': 'outofthebox',
  'Patience and Clear Thinking': 'patience',
  'Persuasion': 'persuasion',
  'Psychology Books': 'psychology',
  'Science': 'science',
  'Storytelling': 'storytelling',
  'Strategy and War': 'strategy',
  'The Great Books': 'greatbooks',
  'Who Am I?': 'whoami'
};

export const CATEGORY_NAME_BY_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_MAP).map(([name, key]) => [key, name])
);
