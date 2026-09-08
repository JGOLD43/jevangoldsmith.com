export type CompanionEssay = {
  id: string;
  title: string;
  author: string;
  titles: string[];
  authors: string[];
  wordCount: number;
  minutes: number;
  sections: { heading: string; paragraphs: string[] }[];
};

function normalize(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/ø/g, 'o').replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Explicit title AND author aliases prevent short titles from matching other works. */
export function findBookCompanion(essays: readonly CompanionEssay[], book: { title: string; author: string }): CompanionEssay | undefined {
  const title = normalize(book.title);
  const author = normalize(book.author);
  return essays.find(essay => essay.titles.some(alias => normalize(alias) === title)
    && essay.authors.some(alias => normalize(alias) === author));
}
