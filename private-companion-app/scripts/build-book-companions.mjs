import { readFile, writeFile } from 'node:fs/promises';
const content = new URL('../content/book-companions/', import.meta.url);
const catalog = JSON.parse(await readFile(new URL('catalog.json', content), 'utf8'));
const essays = await Promise.all(catalog.map(async (entry) => {
  const markdown = await readFile(new URL(`${entry.id}.md`, content), 'utf8');
  const [titleBlock, ...blocks] = markdown.trim().split(/\n## /);
  const sections = blocks.map((block) => {
    const split = block.indexOf('\n');
    return { heading: block.slice(0, split).trim(), paragraphs: block.slice(split).trim().split(/\n\s*\n/) };
  });
  if (!titleBlock.startsWith('# ') || sections.length < 6) throw new Error(`Incomplete essay: ${entry.id}`);
  const wordCount = sections.flatMap(s => s.paragraphs).join(' ').split(/\s+/).length;
  return { ...entry, title: titleBlock.slice(2).trim(), wordCount, minutes: Math.ceil(wordCount / 190), sections };
}));
await writeFile(new URL('../src/constants/book-companions.json', import.meta.url), `${JSON.stringify(essays, null, 2)}\n`);
console.log(`Bundled ${essays.length} offline book companions.`);
