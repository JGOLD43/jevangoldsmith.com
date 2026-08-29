import type { Movie } from '@/domain/models';

const SITE_BASE_URL = 'https://jevangoldsmith.com';

type ApiMovie = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function number(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function highResolutionPoster(value: unknown): string | null {
  const url = text(value);
  if (!url) return null;
  return url.replace(/-0-600-0-900-crop(?=\.jpg(?:\?|$))/i, '-0-1000-0-1500-crop');
}

export function movieSlug(value: string): string {
  return value.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

export function normalizePublicMovie(raw: ApiMovie): Movie {
  const title = text(raw.title);
  const slug = movieSlug(title);
  const tmdbGenres = Array.isArray(raw.tmdbGenres) ? raw.tmdbGenres.filter((genre): genre is string => typeof genre === 'string' && Boolean(genre.trim())) : [];
  const genre = text(raw.genre) || 'Uncategorized';
  const genres = tmdbGenres.length ? tmdbGenres : [genre];
  return {
    id: slug,
    title,
    year: text(raw.year),
    watchedDate: text(raw.date),
    posterUri: highResolutionPoster(raw.poster),
    backdropUri: text(raw.backdrop) || null,
    genre,
    genres,
    rating: text(raw.rating),
    starCount: number(raw.starCount),
    timesWatched: Math.max(1, number(raw.timesWatched)),
    runtimeMinutes: number(raw.runtime),
    overview: text(raw.overview),
    review: text(raw.review),
    websiteUrl: `${SITE_BASE_URL}/movies/${slug}.html`,
    letterboxdUrl: text(raw.link),
  };
}

export async function loadPublicMovies(): Promise<Movie[]> {
  const response = await fetch(`${SITE_BASE_URL}/data/movies.json?fresh=${Date.now()}`, {
    headers: { 'Cache-Control': 'no-cache' },
  });
  if (!response.ok) throw new Error(`Could not load website movies (${response.status}).`);
  const payload = (await response.json()) as ApiMovie[];
  return (Array.isArray(payload) ? payload : []).map(normalizePublicMovie).filter((movie) => movie.title);
}
