import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookCover } from '@/components/book-cover';
import { Button, Card, SectionHeading } from '@/components/ui';
import { Fonts, type AppColors } from '@/constants/theme';
import type { Movie } from '@/domain/models';
import { useTheme } from '@/hooks/use-theme';
import { loadPublicMovies } from '@/services/public-movies';

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void loadPublicMovies().then((movies) => {
      if (active) setMovie(movies.find((item) => item.id === id) ?? null);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (loading) return <SafeAreaView style={styles.safe}><ActivityIndicator color={colors.accent} style={styles.loader} /></SafeAreaView>;
  if (!movie) return <SafeAreaView style={styles.safe}><Text style={styles.empty}>Movie not found.</Text></SafeAreaView>;

  const runtime = movie.runtimeMinutes ? `${Math.floor(movie.runtimeMinutes / 60)}h ${movie.runtimeMinutes % 60}m` : '';
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}><Button label="Back" variant="quiet" onPress={() => router.back()} /><Text style={styles.label}>MOVIE LIBRARY</Text></View>
        {movie.backdropUri ? <Image source={movie.backdropUri} contentFit="cover" style={styles.backdrop} /> : null}
        <View style={styles.hero}>
          <BookCover title={movie.title} author={movie.year} uri={movie.posterUri} style={styles.poster} />
          <View style={styles.heroCopy}>
            <Text style={styles.title}>{movie.title}</Text>
            <Text style={styles.meta}>{[movie.year, runtime, movie.rating].filter(Boolean).join(' · ')}</Text>
            <Text style={styles.watched}>{movie.watchedDate ? `Watched ${movie.watchedDate}` : 'In your movie library'}{movie.timesWatched > 1 ? ` · ${movie.timesWatched}× total` : ''}</Text>
          </View>
        </View>
        <View style={styles.genres}>{movie.genres.map((genre) => <View key={genre} style={styles.genre}><Text style={styles.genreText}>{genre}</Text></View>)}</View>
        {movie.overview ? <><SectionHeading title="Synopsis" /><Text style={styles.body}>{movie.overview}</Text></> : null}
        {movie.review ? <Card><Text style={styles.cardLabel}>YOUR REVIEW</Text><Text style={styles.body}>{movie.review}</Text></Card> : null}
        <SectionHeading title="Website" />
        <Button label="Open website movie page" onPress={() => { void Linking.openURL(movie.websiteUrl); }} />
        {movie.letterboxdUrl ? <Button label="View on Letterboxd" variant="secondary" onPress={() => { void Linking.openURL(movie.letterboxdUrl); }} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    loader: { flex: 1 },
    content: { padding: 20, paddingBottom: 120, gap: 18, width: '100%', maxWidth: 760, alignSelf: 'center' },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    label: { color: colors.accent, fontFamily: Fonts.extraBold, fontSize: 10, letterSpacing: 1 },
    backdrop: { width: '100%', aspectRatio: 1.9, borderRadius: 12, borderCurve: 'continuous', backgroundColor: colors.backgroundSelected },
    hero: { flexDirection: 'row', gap: 18, alignItems: 'flex-start' },
    poster: { width: 132 },
    heroCopy: { flex: 1, gap: 9 },
    title: { color: colors.text, fontFamily: Fonts.bold, fontSize: 28, lineHeight: 34 },
    meta: { color: colors.accent, fontFamily: Fonts.bold, fontSize: 13, lineHeight: 19 },
    watched: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18 },
    genres: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    genre: { backgroundColor: colors.backgroundSelected, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
    genreText: { color: colors.textSecondary, fontFamily: Fonts.bold, fontSize: 11 },
    body: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 15, lineHeight: 24 },
    cardLabel: { color: colors.accent, fontFamily: Fonts.extraBold, fontSize: 10, letterSpacing: 0.8 },
    empty: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 15, padding: 30, textAlign: 'center' },
  });
}
