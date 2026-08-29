import { activityDateKey, activityStreaks, activityWeekStreaks, mergeDailyActivity } from '@/domain/activity';
import type { DailyActivity, Movie } from '@/domain/models';

function watchedDay(value: string): string | null {
  return activityDateKey(value);
}

export function getMovieInsights(movies: Movie[]) {
  const dailyActivity = mergeDailyActivity(movies.flatMap<DailyActivity>((movie) => {
    const date = watchedDay(movie.watchedDate);
    return date ? [{ date, value: movie.runtimeMinutes * movie.timesWatched, count: movie.timesWatched }] : [];
  }));
  const days = dailyActivity.map((activity) => activity.date);
  const dayStreaks = activityStreaks(days);
  const weekStreaks = activityWeekStreaks(days);
  const totalWatches = movies.reduce((total, movie) => total + movie.timesWatched, 0);
  const totalMinutes = movies.reduce((total, movie) => total + (movie.runtimeMinutes * movie.timesWatched), 0);
  const rated = movies.filter((movie) => movie.starCount > 0);
  const genreCounts = new Map<string, number>();
  for (const movie of movies) for (const genre of movie.genres) genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
  const topGenre = [...genreCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? '—';
  return {
    totalFilms: movies.length,
    totalWatches,
    totalMinutes,
    ratedCount: rated.length,
    averageRating: rated.length ? rated.reduce((total, movie) => total + movie.starCount, 0) / rated.length : 0,
    rewatches: Math.max(0, totalWatches - movies.length),
    activeDays: dayStreaks.activeDays,
    currentStreak: dayStreaks.current,
    longestStreak: dayStreaks.longest,
    currentWeekStreak: weekStreaks.current,
    longestWeekStreak: weekStreaks.longest,
    topGenre,
    dailyActivity,
  };
}
