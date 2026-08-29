import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { memo, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivityHeatmap } from '@/components/activity-heatmap';
import { Card, SectionHeading } from '@/components/ui';
import { Fonts, type AppColors } from '@/constants/theme';
import type { Movie } from '@/domain/models';
import { useTheme } from '@/hooks/use-theme';
import { getMovieInsights } from '@/services/movie-insights';
import { loadPublicMovies } from '@/services/public-movies';
import { useBooks } from '@/state/books-context';
import { formatReadingTime } from '@/storage/reading-analytics';

const InsightMetric = memo(function InsightMetric({ value, label }: { value: string; label: string }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
});

export default function InsightsScreen() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const watching = kind === 'movies';
  const router = useRouter();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { readingStats, refreshReadingStats } = useBooks();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(watching);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!watching) {
      void refreshReadingStats();
      return;
    }
    let active = true;
    void loadPublicMovies()
      .then((items) => { if (active) setMovies(items); })
      .catch((cause) => { if (active) setLoadError(cause instanceof Error ? cause.message : 'Could not load watching activity.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshReadingStats, watching]);

  const movieInsights = useMemo(() => getMovieInsights(movies), [movies]);
  const currentDays = watching ? movieInsights.currentStreak : readingStats.currentStreak;
  const longestDays = watching ? movieInsights.longestStreak : readingStats.longestStreak;
  const currentWeeks = watching ? movieInsights.currentWeekStreak : readingStats.currentWeekStreak;
  const longestWeeks = watching ? movieInsights.longestWeekStreak : readingStats.longestWeekStreak;
  const activity = watching ? movieInsights.dailyActivity : readingStats.dailyActivity;

  if (loading) return <SafeAreaView style={styles.safe}><ActivityIndicator color={colors.accent} style={styles.loader} /></SafeAreaView>;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Back to Library" accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
            <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back' }} size={26} tintColor={colors.text} />
          </Pressable>
          <Text style={styles.title}>{watching ? 'Watching Insights' : 'Reading Insights'}</Text>
        </View>

        {loadError ? <View style={styles.error}><Text style={styles.errorText}>{loadError}</Text></View> : null}

        <View style={styles.streakHero}>
          <View style={styles.flame}><SymbolView name={{ ios: 'flame.fill', android: 'local_fire_department' }} size={31} tintColor={colors.onAction} /></View>
          <Text style={styles.heroTitle}>{currentDays > 0 ? `You're on a ${currentDays}-day streak` : `Build your ${watching ? 'watching' : 'reading'} streak`}</Text>
          <Text style={styles.heroBody}>{longestDays > 0 ? `Your longest daily streak is ${longestDays} day${longestDays === 1 ? '' : 's'}. Keep it moving.` : `Activity will fill this page as you ${watching ? 'watch films' : 'read books'}.`}</Text>
        </View>

        <View style={styles.streakCards}>
          <View style={styles.streakCard}><Text style={styles.streakLabel}>Weeks in a row</Text><Text style={styles.streakValue}>{currentWeeks}</Text><Text style={styles.streakBest}>Best {longestWeeks}</Text></View>
          <View style={[styles.streakCard, styles.streakCardAccent]}><Text style={[styles.streakLabel, styles.onAccent]}>Days in a row</Text><Text style={[styles.streakValue, styles.onAccent]}>{currentDays}</Text><Text style={[styles.streakBest, styles.onAccent]}>Best {longestDays}</Text></View>
        </View>

        <SectionHeading title="Activity" detail="Last 52 weeks" />
        <Card>
          <ActivityHeatmap
            activity={activity}
            formatValue={watching
              ? (value, count) => `${count} watch${count === 1 ? '' : 'es'} · ${Math.round(value)} min`
              : (value, count) => `${formatReadingTime(value)} · ${count} session${count === 1 ? '' : 's'}`}
          />
          <Text style={styles.privacy}>{watching ? 'Based on the watched dates in your website movie feed.' : 'Calculated locally from encrypted reading sessions on this phone.'}</Text>
        </Card>

        <SectionHeading title={watching ? 'Watching totals' : 'Reading totals'} />
        <View style={styles.metrics}>
          {watching ? <>
            <InsightMetric value={String(movieInsights.totalFilms)} label="Films" />
            <InsightMetric value={String(movieInsights.totalWatches)} label="Total watches" />
            <InsightMetric value={formatReadingTime(movieInsights.totalMinutes * 60)} label="Watch time" />
            <InsightMetric value={String(movieInsights.activeDays)} label="Active days" />
            <InsightMetric value={movieInsights.averageRating ? movieInsights.averageRating.toFixed(1) : '—'} label="Average rating" />
            <InsightMetric value={String(movieInsights.rewatches)} label="Rewatches" />
            <InsightMetric value={String(movieInsights.ratedCount)} label="Rated films" />
            <InsightMetric value={movieInsights.topGenre} label="Top genre" />
          </> : <>
            <InsightMetric value={formatReadingTime(readingStats.totalSeconds)} label="Total time" />
            <InsightMetric value={formatReadingTime(readingStats.lastSevenDaysSeconds)} label="Last 7 days" />
            <InsightMetric value={String(readingStats.daysRead)} label="Days read" />
            <InsightMetric value={String(readingStats.sessionCount)} label="Sessions" />
            <InsightMetric value={String(readingStats.booksStarted)} label="Books started" />
            <InsightMetric value={String(readingStats.booksFinished)} label="Books finished" />
            <InsightMetric value={String(readingStats.highlightCount)} label="Highlights" />
            <InsightMetric value={formatReadingTime(readingStats.todaySeconds)} label="Today" />
          </>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    loader: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120, gap: 20, width: '100%', maxWidth: 760, alignSelf: 'center' },
    header: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10 },
    backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
    title: { color: colors.text, fontFamily: Fonts.bold, fontSize: 26, textTransform: 'uppercase', letterSpacing: 0.4 },
    streakHero: { alignItems: 'center', gap: 12, paddingVertical: 12 },
    flame: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.action },
    heroTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 23, textAlign: 'center' },
    heroBody: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 420 },
    streakCards: { flexDirection: 'row', gap: 8 },
    streakCard: { flex: 1, minHeight: 160, padding: 18, justifyContent: 'space-between', backgroundColor: colors.accentSoft },
    streakCardAccent: { backgroundColor: colors.action },
    streakLabel: { color: colors.text, fontFamily: Fonts.bold, fontSize: 16, lineHeight: 21 },
    streakValue: { color: colors.text, fontFamily: Fonts.serif, fontSize: 58, lineHeight: 66, textAlign: 'center' },
    streakBest: { color: colors.textSecondary, fontFamily: Fonts.semibold, fontSize: 11, textAlign: 'center', textTransform: 'uppercase' },
    onAccent: { color: colors.onAction },
    error: { padding: 12, backgroundColor: colors.dangerSoft, borderRadius: 10 },
    errorText: { color: colors.danger, fontFamily: Fonts.semibold, fontSize: 12, lineHeight: 17 },
    privacy: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 10, lineHeight: 15, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10 },
    metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    metric: { width: '47%', flexGrow: 1, minHeight: 92, justifyContent: 'space-between', backgroundColor: colors.backgroundElement, borderWidth: 1, borderColor: colors.line, padding: 14 },
    metricValue: { color: colors.text, fontFamily: Fonts.bold, fontSize: 24, lineHeight: 29 },
    metricLabel: { color: colors.textSecondary, fontFamily: Fonts.semibold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  });
}
