import { defineCollection } from 'astro:content';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'astro/zod';

// Read the project-root data/*.json directly so legacy build and Astro stay
// on a single source of truth. No copy, no sync, no drift.
const DATA_DIR = resolve(import.meta.dirname, '../../data');

// Many JSON fields use null for empty values. Standardize on
// optional-or-nullable so schemas survive pre-existing data quirks.
const nstr = () => z.string().nullable().optional();
const nnum = () => z.number().nullable().optional();
const nbool = () => z.boolean().nullable().optional();

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// Loader factory. Reads a JSON file, optionally unwraps a key (people.json
// has shape { people: [...] }), assigns each item a stable id, and returns it.
//
// id resolution order:
//   1. opts.idFrom (if set)
//   2. item.id
//   3. slugify(item.title || item.name) — disambiguated with idDisambiguator
//      (e.g. author for books) when present
//   4. file name + index fallback
function jsonArrayLoader(file: string, opts: {
  key?: string;
  idFrom?: string;
  idDisambiguator?: string;
} = {}) {
  return () => {
    const raw = JSON.parse(readFileSync(resolve(DATA_DIR, file), 'utf8'));
    const arr: Record<string, unknown>[] = opts.key ? raw[opts.key] : raw;
    if (!Array.isArray(arr)) {
      throw new Error(`Expected array from ${file}${opts.key ? `["${opts.key}"]` : ''}, got ${typeof arr}`);
    }
    const used = new Set<string>();
    return arr.map((item, i) => {
      let id: string | undefined;
      const fromField = opts.idFrom ? item[opts.idFrom] : item.id;
      if (fromField !== undefined && fromField !== null && fromField !== '') {
        id = String(fromField);
      } else {
        const title = (item.title || item.name) as string | undefined;
        if (title) {
          let candidate = slugify(title);
          if (opts.idDisambiguator && item[opts.idDisambiguator]) {
            candidate = `${candidate}-${slugify(String(item[opts.idDisambiguator]))}`;
          }
          if (used.has(candidate)) candidate = `${candidate}-${i}`;
          id = candidate;
        } else {
          id = `${file.replace(/\.json$/, '')}-${i}`;
        }
      }
      used.add(id);
      return { ...item, id };
    });
  };
}

const bookSchema = z.looseObject({
  id: z.string(),
  title: z.string(),
  author: z.string(),
  isbn: nstr(),
  year: z.union([z.string(), z.number()]).nullable().optional(),
  rating: z.number(),
  reReads: nnum(),
  category: nstr(),
  coverImage: nstr(),
  shortDescription: nstr(),
  review: nstr(),
  read: nbool()
});
export type Book = z.infer<typeof bookSchema>;

const movieSchema = z.looseObject({
  id: z.string(),
  title: z.string(),
  date: nstr(),
  link: nstr(),
  rating: nstr(),
  starCount: nnum(),
  year: z.union([z.string(), z.number()]).nullable().optional(),
  poster: nstr(),
  genre: nstr(),
  timesWatched: nnum(),
  tmdbId: nnum(),
  runtime: nnum(),
  tmdbGenres: z.array(z.string()).nullable().optional(),
  overview: nstr(),
  backdrop: nstr()
});
export type Movie = z.infer<typeof movieSchema>;

const personSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  title: nstr(),
  lesson: nstr(),
  category: nstr(),
  image: nstr(),
  srcset: nstr(),
  searchText: nstr()
});
export type Person = z.infer<typeof personSchema>;

const essaySchema = z.looseObject({
  id: z.string(),
  title: z.string(),
  subtitle: nstr(),
  author: nstr(),
  date: nstr(),
  category: nstr(),
  status: nstr(),
  content: z.string()
});
export type Essay = z.infer<typeof essaySchema>;

const podcastSchema = z.looseObject({
  id: z.string(),
  title: z.string(),
  host: nstr(),
  description: nstr(),
  category: nstr(),
  badge: nstr(),
  image: nstr(),
  searchText: nstr()
});
export type Podcast = z.infer<typeof podcastSchema>;

const adventureSchema = z.looseObject({
  id: z.string(),
  title: z.string(),
  subtitle: nstr(),
  location: nstr(),
  region: nstr(),
  startDate: nstr(),
  endDate: nstr(),
  duration: nstr(),
  heroImage: nstr(),
  shortDescription: nstr(),
  content: nstr(),
  highlights: z.array(z.string()).nullable().optional()
});
export type Adventure = z.infer<typeof adventureSchema>;

const peopleProfileSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  title: nstr(),
  thesis: nstr(),
  bio: nstr(),
  image: nstr(),
  srcset: nstr(),
  timeline: z.array(z.object({
    year: nstr(),
    title: nstr(),
    note: nstr()
  })).nullable().optional(),
  bookTitles: z.array(z.string()).nullable().optional(),
  resources: z.array(z.object({
    type: nstr(),
    title: nstr(),
    url: nstr(),
    note: nstr()
  })).nullable().optional()
});
export type PeopleProfile = z.infer<typeof peopleProfileSchema>;

const peopleMergedSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  title: nstr(),
  lesson: nstr(),
  category: nstr(),
  image: nstr(),
  srcset: nstr(),
  searchText: nstr(),
  sourceType: nstr(),
  bio: nstr(),
  thesis: nstr(),
  profileHref: nstr(),
  books: z.array(z.looseObject({
    title: z.string(),
    label: z.string(),
    author: nstr(),
    coverImage: nstr(),
    href: nstr()
  })).nullable().optional(),
  movies: z.array(z.looseObject({
    title: z.string(),
    label: z.string(),
    year: z.union([z.string(), z.number()]).nullable().optional(),
    coverImage: nstr(),
    href: nstr()
  })).nullable().optional()
});
export type PeopleMerged = z.infer<typeof peopleMergedSchema>;

const books = defineCollection({
  loader: jsonArrayLoader('books.json', { idFrom: 'isbn', idDisambiguator: 'author' }),
  schema: bookSchema
});

const movies = defineCollection({
  loader: jsonArrayLoader('movies.json', { idFrom: 'tmdbId' }),
  schema: movieSchema
});

const people = defineCollection({
  loader: jsonArrayLoader('people.json', { key: 'people' }),
  schema: personSchema
});

const essays = defineCollection({
  loader: jsonArrayLoader('essays.json', { key: 'essays' }),
  schema: essaySchema
});

const podcasts = defineCollection({
  loader: jsonArrayLoader('podcasts.json', { key: 'podcasts' }),
  schema: podcastSchema
});

const adventures = defineCollection({
  loader: jsonArrayLoader('adventures.json', { key: 'adventures' }),
  schema: adventureSchema
});

const challenges = defineCollection({
  loader: jsonArrayLoader('challenges.json', { key: 'challenges' }),
  schema: z.looseObject({ id: z.string() })
});

const projects = defineCollection({
  loader: jsonArrayLoader('projects.json', { key: 'projects' }),
  schema: z.looseObject({ id: z.string() })
});

const topics = defineCollection({
  loader: jsonArrayLoader('topics.json', { key: 'topics' }),
  schema: z.looseObject({
    id: z.string(),
    label: nstr(),
    description: nstr()
  })
});

const peopleProfiles = defineCollection({
  loader: jsonArrayLoader('people.profiles.json', { key: 'profiles' }),
  schema: peopleProfileSchema
});

// build-time-merged people (people.json + books + movies + profiles).
// Source file is generated by scripts/merge-people.js. people.astro
// SSRs all 98 cards from this collection so the runtime no longer fetches
// books.generated.json + movies.json + profiles.json.
const peopleMerged = defineCollection({
  loader: jsonArrayLoader('people.merged.generated.json', { key: 'people' }),
  schema: peopleMergedSchema
});

export const collections = { books, movies, people, essays, podcasts, adventures, challenges, projects, topics, peopleProfiles, peopleMerged };
