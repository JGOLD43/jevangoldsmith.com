export interface RuntimeMovieStatsMovie {
  title?: string;
  year?: string | number;
  runtime?: string | number;
  genre?: string;
  starCount?: string | number;
  timesWatched?: string | number;
  poster?: string;
}

export interface MovieStatsByGenre {
  genre: string;
  avg: number;
  count: number;
}

export interface ComputedMovieStats {
  totalFilms: number;
  totalWatches: number;
  totalMinutes: number;
  totalHours: number;
  avgRuntime: number;
  longest: RuntimeMovieStatsMovie | null;
  shortest: RuntimeMovieStatsMovie | null;
  hoursByGenre: Record<string, number>;
  filmsByDecade: Record<string, number>;
  filmsByRating: Record<number, number>;
  avgRatingByGenre: MovieStatsByGenre[];
  mostRewatched: RuntimeMovieStatsMovie[];
  enrichedCount: number;
}

function decadeFor(year: unknown): string | null {
  const y = Number(year);
  if (!y) return null;
  return `${Math.floor(y / 10) * 10}s`;
}

function safeRating(movie: RuntimeMovieStatsMovie): number | null {
  const n = Number(movie.starCount);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function watchCount(movie: RuntimeMovieStatsMovie): number {
  const n = Number(movie.timesWatched);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function fmtRuntime(minutes: unknown): string {
  const m = Number(minutes) || 0;
  if (m <= 0) return '-';
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `${rem}m`;
  if (rem === 0) return `${h}h`;
  return `${h}h ${rem}m`;
}

export function fmtHours(minutes: number): string {
  const h = minutes / 60;
  if (h >= 100) return `${Math.round(h)} hr`;
  return `${h.toFixed(1)} hr`;
}

export function computeMovieStats(movies: RuntimeMovieStatsMovie[]): ComputedMovieStats {
  const list = Array.isArray(movies) ? movies : [];
  const filmsWithRuntime = list.filter((movie) => Number(movie.runtime) > 0);
  const totalFilms = list.length;
  const totalWatches = list.reduce((acc, movie) => acc + watchCount(movie), 0);
  const totalMinutes = list.reduce(
    (acc, movie) => acc + Number(movie.runtime || 0) * watchCount(movie),
    0
  );
  const avgRuntime = filmsWithRuntime.length
    ? Math.round(filmsWithRuntime.reduce((acc, movie) => acc + Number(movie.runtime), 0) / filmsWithRuntime.length)
    : 0;

  let longest: RuntimeMovieStatsMovie | null = null;
  let shortest: RuntimeMovieStatsMovie | null = null;
  for (const movie of filmsWithRuntime) {
    if (!longest || Number(movie.runtime) > Number(longest.runtime)) longest = movie;
    if (!shortest || Number(movie.runtime) < Number(shortest.runtime)) shortest = movie;
  }

  const hoursByGenre: Record<string, number> = {};
  const filmsByDecade: Record<string, number> = {};
  const filmsByRating: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const ratingTotals: Record<string, { sum: number; count: number }> = {};

  for (const movie of list) {
    const minutes = Number(movie.runtime || 0) * watchCount(movie);
    const genre = movie.genre || 'Uncategorized';
    if (minutes > 0) hoursByGenre[genre] = (hoursByGenre[genre] || 0) + minutes;

    const decade = decadeFor(movie.year);
    if (decade) filmsByDecade[decade] = (filmsByDecade[decade] || 0) + 1;

    const rating = safeRating(movie);
    if (rating != null) {
      filmsByRating[rating] = (filmsByRating[rating] || 0) + 1;
      ratingTotals[genre] ||= { sum: 0, count: 0 };
      ratingTotals[genre].sum += rating;
      ratingTotals[genre].count += 1;
    }
  }

  return {
    totalFilms,
    totalWatches,
    totalMinutes,
    totalHours: Math.round(totalMinutes / 60),
    avgRuntime,
    longest,
    shortest,
    hoursByGenre,
    filmsByDecade,
    filmsByRating,
    avgRatingByGenre: Object.entries(ratingTotals)
      .map(([genre, { sum, count }]) => ({ genre, avg: sum / count, count }))
      .sort((a, b) => b.avg - a.avg),
    mostRewatched: list
      .filter((movie) => watchCount(movie) > 1)
      .sort((a, b) => watchCount(b) - watchCount(a))
      .slice(0, 5),
    enrichedCount: filmsWithRuntime.length
  };
}
