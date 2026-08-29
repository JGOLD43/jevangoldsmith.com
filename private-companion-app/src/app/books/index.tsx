import * as Linking from 'expo-linking';
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { memo, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookCover } from '@/components/book-cover';
import { Fonts, type AppColors } from '@/constants/theme';
import type { Movie } from '@/domain/models';
import { RATING_TIERS, ratingTier, type RatingTier } from '@/domain/rating-tier';
import { useTheme } from '@/hooks/use-theme';
import { FRENCH_SKILLS } from '@/learning/french-seed';
import type { SkillTreeSummary } from '@/learning/types';
import { loadPublicMovies } from '@/services/public-movies';
import { loadSiteCollection, type SiteItem } from '@/services/public-site';
import { useApp } from '@/state/app-context';
import { useBooks } from '@/state/books-context';
import { useLearning } from '@/state/learning-context';
import { formatReadingTime } from '@/storage/reading-analytics';
import { ensureCoreSkillTrees, listSkillTrees } from '@/storage/skill-tree-repository';

type MediaKind = 'books' | 'movies' | 'essays' | 'skills';
type LibraryMediaKind = Exclude<MediaKind, 'skills'>;
type LibraryItem = {
  id: string;
  kind: LibraryMediaKind;
  title: string;
  subtitle: string;
  coverUri: string | null;
  tags: string[];
  progress: number;
  rating: string;
  tier: RatingTier | null;
  isReading: boolean;
  visibility: 'private' | 'public' | null;
  excerpt: string;
};
type CollectionGroup = { key: string; name: string; items: LibraryItem[]; tier: RatingTier | null };

function compactCoverUri(uri: string | null): string | null {
  if (!uri) return null;
  return uri
    .replace(/-360\.jpg(?=\?|$)/i, '-240.jpg')
    .replace(/-0-1000-0-1500-crop(?=\.jpg(?:\?|$))/i, '-0-300-0-450-crop');
}

const MediaCard = memo(function MediaCard({ item, onPress }: { item: LibraryItem; onPress: (item: LibraryItem) => void }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable accessibilityLabel={`${item.title}, ${item.subtitle}${item.tier ? `, ${item.tier.label}` : ''}`} accessibilityRole="button" onPress={() => onPress(item)} style={({ pressed }) => [styles.mediaCard, pressed && styles.pressed]}>
      {item.kind === 'essays' ? (
        <View style={styles.essayPreview}>
          <View style={styles.essayPreviewTop}><SymbolView name={{ ios: 'doc.text.fill', android: 'article' }} size={22} tintColor={colors.accent} /><Text style={[styles.visibilityBadge, item.visibility === 'private' ? styles.privateBadge : styles.publicBadge]}>{item.visibility}</Text></View>
          <Text numberOfLines={4} style={styles.essayPreviewText}>{item.excerpt || 'A new essay waiting to take shape.'}</Text>
        </View>
      ) : <View style={styles.coverFrame}><BookCover title={item.title} author={item.subtitle} uri={item.coverUri} />{item.tier ? <View style={[styles.tierBadge, { backgroundColor: item.tier.color }]}><Text style={styles.tierBadgeText}>{item.tier.label}</Text></View> : null}</View>}
      <Text numberOfLines={2} style={styles.mediaTitle}>{item.title}</Text>
      <Text numberOfLines={1} style={styles.mediaSubtitle}>{[item.subtitle, item.rating].filter(Boolean).join(' · ')}</Text>
      {item.progress > 0 ? <View style={styles.progressTrack}><View style={[styles.progressBar, { width: `${item.progress * 100}%` }]} /></View> : null}
    </Pressable>
  );
});

const EssayDocumentCard = memo(function EssayDocumentCard({ item, onPress }: { item: LibraryItem; onPress: (item: LibraryItem) => void }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isEditable = item.id.startsWith('local:');
  const updated = new Date(item.subtitle);
  const updatedLabel = Number.isNaN(updated.getTime())
    ? item.subtitle
    : new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(updated);

  return (
    <Pressable
      accessibilityLabel={`${isEditable ? 'Edit' : 'Open'} ${item.title}`}
      accessibilityRole="button"
      onPress={() => onPress(item)}
      style={({ pressed }) => [styles.essayDocument, pressed && styles.pressed]}>
      <View style={styles.essayDocumentHeader}>
        <View style={styles.essayDocumentIcon}>
          <SymbolView name={{ ios: 'doc.text.fill', android: 'article' }} size={21} tintColor={colors.accent} />
        </View>
        <View style={styles.essayDocumentLabels}>
          <Text numberOfLines={1} style={styles.essayCollection}>{item.tags[0] || 'Unsorted'}</Text>
          <Text style={[styles.visibilityBadge, item.visibility === 'private' ? styles.privateBadge : styles.publicBadge]}>{item.visibility}</Text>
        </View>
      </View>

      <Text numberOfLines={2} style={styles.essayDocumentTitle}>{item.title}</Text>
      <Text numberOfLines={3} style={styles.essayDocumentExcerpt}>{item.excerpt || 'Open this document and start writing.'}</Text>

      <View style={styles.essayDocumentFooter}>
        <View style={styles.essayUpdated}>
          <SymbolView name={{ ios: 'calendar', android: 'calendar_today' }} size={14} tintColor={colors.textSecondary} />
          <Text style={styles.essayUpdatedText}>Updated {updatedLabel}</Text>
        </View>
        <View style={styles.essayDocumentAction}>
          <SymbolView name={{ ios: 'square.and.pencil', android: 'edit_note' }} size={17} tintColor={colors.accent} />
          <Text style={styles.essayDocumentActionText}>{isEditable ? 'Edit document' : 'Open to edit'}</Text>
        </View>
      </View>
    </Pressable>
  );
});

const CollectionTile = memo(function CollectionTile({ group, mediaKind, onPress }: { group: CollectionGroup; mediaKind: LibraryMediaKind; onPress: (key: string) => void }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const covers = group.items.slice(0, 4);
  const noun = mediaKind;
  return (
    <Pressable accessibilityLabel={`${group.name}, ${group.items.length} ${noun}`} accessibilityRole="button" onPress={() => onPress(group.key)} style={({ pressed }) => [styles.collection, pressed && styles.pressed]}>
      <View style={styles.coverMosaic}>
        {group.tier ? <View style={[styles.collectionTierBadge, { backgroundColor: group.tier.color }]}><Text style={styles.collectionTierText}>{group.tier.label}</Text></View> : null}
        {[0, 1, 2, 3].map((index) => {
          const item = covers[index];
          return <View key={item?.id ?? `empty-${index}`} style={styles.miniCoverSlot}>{item ? mediaKind === 'essays' ? (
            <View style={styles.miniEssay}><SymbolView name={{ ios: 'doc.text.fill', android: 'article' }} size={17} tintColor={colors.accent} /><Text style={styles.miniEssayInitial}>{item.title.slice(0, 1).toUpperCase()}</Text><Text style={styles.miniEssayStatus}>{item.visibility === 'private' ? 'PRI' : 'PUB'}</Text></View>
          ) : <BookCover title={item.title} author={item.subtitle} uri={compactCoverUri(item.coverUri)} style={styles.miniCover} /> : null}</View>;
        })}
      </View>
      <View style={styles.collectionMeta}>
        <Text numberOfLines={2} style={[styles.collectionName, mediaKind === 'essays' && styles.essayCollectionName]}>{group.name}</Text>
        <Text style={styles.collectionCount}>{group.items.length}</Text>
      </View>
    </Pressable>
  );
});

const SkillTreeCard = memo(function SkillTreeCard({ title, description, nodeCount, reliableCount, readyCount, builtIn, onPress }: { title: string; description: string; nodeCount: number; reliableCount: number; readyCount: number; builtIn?: boolean; onPress: () => void }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const progress = nodeCount ? Math.round((reliableCount / nodeCount) * 100) : 0;
  return <Pressable accessibilityLabel={`Open ${title} skill tree`} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.skillTreeCard, pressed && styles.pressed]}>
    <View style={styles.skillTreeIcon}><SymbolView name={{ ios: 'point.3.connected.trianglepath.dotted', android: 'account_tree' }} size={25} tintColor={colors.accent} /></View>
    <View style={styles.skillTreeCopy}>
      <View style={styles.skillTreeTitleRow}><Text numberOfLines={1} style={styles.skillTreeTitle}>{title}</Text>{builtIn ? <Text style={styles.builtInBadge}>BUILT IN</Text> : null}</View>
      <Text numberOfLines={2} style={styles.skillTreeDescription}>{description}</Text>
      <View style={styles.skillTreeMeta}><Text style={styles.skillTreeMetaText}>{nodeCount} abilities</Text><Text style={styles.skillTreeMetaText}>{reliableCount} reliable</Text><Text style={styles.skillTreeMetaText}>{readyCount} ready</Text></View>
      <View style={styles.skillTreeTrack}><View style={[styles.skillTreeFill, { width: `${progress}%` }]} /></View>
    </View>
    <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right' }} size={18} tintColor={colors.textSecondary} />
  </Pressable>;
});

export default function BooksScreen() {
  const router = useRouter();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { essays } = useApp();
  const { books, collections, collectionIdsByBook, readingStats, loading, syncing, error, syncWebsite, importBook, importKindle, refresh, dismissError } = useBooks();
  const { dashboard: learningDashboard } = useLearning();
  const [mediaKind, setMediaKind] = useState<MediaKind>('books');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [moviesLoaded, setMoviesLoaded] = useState(false);
  const [moviesLoading, setMoviesLoading] = useState(false);
  const [movieError, setMovieError] = useState<string | null>(null);
  const [publicEssays, setPublicEssays] = useState<SiteItem[]>([]);
  const [essaysLoaded, setEssaysLoaded] = useState(false);
  const [essaysLoading, setEssaysLoading] = useState(false);
  const [essayError, setEssayError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [ascending, setAscending] = useState(true);
  const [importing, setImporting] = useState(false);
  const [skillTrees, setSkillTrees] = useState<SkillTreeSummary[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [groupMode, setGroupMode] = useState<'collections' | 'tiers'>('collections');

  const reloadMovies = useCallback(async () => {
    setMoviesLoading(true);
    setMovieError(null);
    try {
      setMovies(await loadPublicMovies());
    } catch (cause) {
      setMovieError(cause instanceof Error ? cause.message : 'Could not load website movies.');
    } finally {
      setMoviesLoaded(true);
      setMoviesLoading(false);
    }
  }, []);

  const reloadEssays = useCallback(async () => {
    setEssaysLoading(true);
    setEssayError(null);
    try {
      setPublicEssays(await loadSiteCollection('essay'));
    } catch (cause) {
      setEssayError(cause instanceof Error ? cause.message : 'Could not load website essays.');
    } finally {
      setEssaysLoaded(true);
      setEssaysLoading(false);
    }
  }, []);

  const reloadSkillTrees = useCallback(async () => {
    setSkillsLoading(true);
    try { await ensureCoreSkillTrees(); setSkillTrees(await listSkillTrees()); } finally { setSkillsLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => {
    if (mediaKind === 'books' && !loading) void syncWebsite();
    if (mediaKind === 'movies') void reloadMovies();
    if (mediaKind === 'essays') void reloadEssays();
    if (mediaKind === 'skills') void reloadSkillTrees();
  }, [loading, mediaKind, reloadEssays, reloadMovies, reloadSkillTrees, syncWebsite]));

  const collectionNames = useMemo(() => new Map(collections.map((collection) => [collection.id, collection.name])), [collections]);
  const bookItems = useMemo<LibraryItem[]>(() => books.map((book) => ({
    id: book.id,
    kind: 'books',
    title: book.title,
    subtitle: book.author || 'Unknown author',
    coverUri: book.coverUri,
    tags: [...new Set([
      ...(collectionIdsByBook[book.id] ?? []).map((id) => collectionNames.get(id)).filter((name): name is string => Boolean(name)),
      book.category.trim() || 'Unsorted',
    ])],
    progress: book.progress,
    rating: book.rating ? `${book.rating}/5` : '',
    tier: ratingTier(book.rating),
    isReading: book.readingStatus === 'reading',
    visibility: null,
    excerpt: book.summary,
  })), [books, collectionIdsByBook, collectionNames]);

  const movieItems = useMemo<LibraryItem[]>(() => movies.map((movie) => ({
    id: movie.id,
    kind: 'movies',
    title: movie.title,
    subtitle: movie.year || 'Year not set',
    coverUri: movie.posterUri,
    tags: movie.genres.length ? movie.genres : [movie.genre || 'Unsorted'],
    progress: 0,
    rating: movie.rating,
    tier: ratingTier(movie.starCount),
    isReading: false,
    visibility: null,
    excerpt: movie.overview,
  })), [movies]);

  const essayItems = useMemo<LibraryItem[]>(() => [
    ...essays.map((essay) => ({
      id: `local:${essay.id}`,
      kind: 'essays' as const,
      title: essay.title,
      subtitle: essay.updatedAt.slice(0, 10),
      coverUri: null,
      tags: [essay.collectionName.trim() || 'Unsorted'],
      progress: 0,
      rating: '',
      tier: null,
      isReading: false,
      visibility: essay.visibility,
      excerpt: essay.summary || essay.body,
    })),
    ...publicEssays.filter((essay) => !essays.some((local) => local.sourceId === essay.id)).map((essay) => ({
      id: `public:${essay.id}`,
      kind: 'essays' as const,
      title: essay.title,
      subtitle: (essay.updatedAt || essay.date).slice(0, 10),
      coverUri: essay.image,
      tags: [essay.category || 'Unsorted'],
      progress: 0,
      rating: '',
      tier: null,
      isReading: false,
      visibility: 'public' as const,
      excerpt: essay.summary || essay.body,
    })),
  ], [essays, publicEssays]);

  const allGroups = useMemo<CollectionGroup[]>(() => {
    const items = mediaKind === 'books' ? bookItems : mediaKind === 'movies' ? movieItems : mediaKind === 'essays' ? essayItems : [];
    if (groupMode === 'tiers' && (mediaKind === 'books' || mediaKind === 'movies')) {
      return RATING_TIERS.map((tier) => ({ key: `${mediaKind}:tier-${tier.key}`, name: `${tier.label} · ${tier.detail}`, items: items.filter((item) => item.tier?.key === tier.key), tier }))
        .filter((group) => group.items.length > 0);
    }
    const grouped = new Map<string, LibraryItem[]>();
    for (const item of items) {
      for (const tag of item.tags) grouped.set(tag, [...(grouped.get(tag) ?? []), item]);
    }
    const groups = [...grouped.entries()].map(([name, groupItems]) => ({ key: `${mediaKind}:${name.toLowerCase()}`, name, items: groupItems, tier: null }));
    if (mediaKind === 'books') {
      const reading = items.filter((item) => item.isReading);
      if (reading.length) groups.push({ key: 'books:currently-reading', name: 'Currently Reading', items: reading, tier: null });
    }
    return groups.sort((left, right) => ascending ? left.name.localeCompare(right.name) : right.name.localeCompare(left.name));
  }, [ascending, bookItems, essayItems, groupMode, mediaKind, movieItems]);

  const visibleGroups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return allGroups;
    return allGroups.map((group) => ({
      ...group,
      items: group.name.toLowerCase().includes(needle) ? group.items : group.items.filter((item) => `${item.title} ${item.subtitle}`.toLowerCase().includes(needle)),
    })).filter((group) => group.items.length > 0);
  }, [allGroups, query]);

  const activeGroup = selectedCollection ? allGroups.find((group) => group.key === selectedCollection) ?? null : null;
  const visibleItems = useMemo(() => {
    if (!activeGroup) return [];
    const needle = query.trim().toLowerCase();
    const matched = needle ? activeGroup.items.filter((item) => `${item.title} ${item.subtitle}`.toLowerCase().includes(needle)) : activeGroup.items;
    return [...matched].sort((left, right) => ascending ? left.title.localeCompare(right.title) : right.title.localeCompare(left.title));
  }, [activeGroup, ascending, query]);

  const movieStats = useMemo(() => {
    const watches = movies.reduce((total, movie) => total + movie.timesWatched, 0);
    const minutes = movies.reduce((total, movie) => total + (movie.runtimeMinutes * movie.timesWatched), 0);
    return { watches, hours: Math.round(minutes / 60), rated: movies.filter((movie) => movie.starCount > 0).length, rewatches: Math.max(0, watches - movies.length) };
  }, [movies]);

  const essayStats = useMemo(() => ({
    total: essayItems.length,
    privateCount: essayItems.filter((item) => item.visibility === 'private').length,
    publicCount: essayItems.filter((item) => item.visibility === 'public').length,
    collections: new Set(essayItems.flatMap((item) => item.tags)).size,
  }), [essayItems]);

  const filteredSkillTrees = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const trees = needle ? skillTrees.filter((tree) => `${tree.title} ${tree.description}`.toLowerCase().includes(needle)) : skillTrees;
    return [...trees].sort((left, right) => ascending ? left.title.localeCompare(right.title) : right.title.localeCompare(left.title));
  }, [ascending, query, skillTrees]);

  const skillStats = useMemo(() => ({
    trees: skillTrees.length + 1,
    abilities: skillTrees.reduce((sum, tree) => sum + tree.nodeCount, FRENCH_SKILLS.length),
    reliable: skillTrees.reduce((sum, tree) => sum + tree.reliableCount, learningDashboard?.reliableSkills ?? 0),
    ready: skillTrees.reduce((sum, tree) => sum + tree.readyCount, learningDashboard?.dueReviews ?? 0),
  }), [learningDashboard, skillTrees]);

  const chooseMedia = useCallback((next: MediaKind) => {
    setMediaKind(next);
    setSelectedCollection(null);
    setQuery('');
    setGroupMode('collections');
  }, []);

  const chooseGroupMode = useCallback((next: 'collections' | 'tiers') => {
    setGroupMode(next);
    setSelectedCollection(null);
    setQuery('');
  }, []);

  const openItem = useCallback((item: LibraryItem) => {
    if (item.kind === 'books') router.push(`/books/${item.id}`);
    else if (item.kind === 'movies') router.push(`/movies/${item.id}`);
    else router.push(`/essays/${encodeURIComponent(item.id)}`);
  }, [router]);

  const primaryAction = async () => {
    if (mediaKind === 'movies') {
      await Linking.openURL('https://letterboxd.com/contentwatch/');
      return;
    }
    if (mediaKind === 'essays') {
      router.push({ pathname: '/essays/new', params: { collection: activeGroup?.name ?? '' } });
      return;
    }
    if (mediaKind === 'skills') {
      router.push({ pathname: '/skills/[id]', params: { id: 'new' } });
      return;
    }
    setImporting(true);
    try {
      const book = await importBook();
      if (book) router.push(`/books/${book.id}`);
    } catch (cause) {
      Alert.alert('Import failed', cause instanceof Error ? cause.message : 'Please try another file.');
    } finally {
      setImporting(false);
    }
  };

  const importKindleHistory = async () => {
    setImporting(true);
    try {
      const result = await importKindle();
      if (result) Alert.alert('Kindle history imported', `${result.booksAdded} books added · ${result.booksMatched} matched · ${result.booksRepaired} repaired · ${result.highlightsAdded} highlights added · ${result.collectionsAdded} collection links added`);
    } catch (cause) {
      Alert.alert('Kindle import failed', cause instanceof Error ? cause.message : 'Please try another Kindle notebook HTML or JGOLD library file.');
    } finally {
      setImporting(false);
    }
  };

  const activeError = mediaKind === 'books' ? error : mediaKind === 'movies' ? movieError : mediaKind === 'essays' ? essayError : null;
  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={styles.titleCopy}>
          {activeGroup ? <Pressable accessibilityRole="button" onPress={() => { setSelectedCollection(null); setQuery(''); }}><Text style={styles.back}>‹ {groupMode === 'tiers' ? 'Tiers' : 'Collections'}</Text></Pressable> : null}
          <Text numberOfLines={1} style={styles.title}>{activeGroup?.name ?? 'Library'}</Text>
        </View>
        <Pressable accessibilityLabel={mediaKind === 'books' ? 'Import a book' : mediaKind === 'movies' ? 'Add a movie on Letterboxd' : mediaKind === 'skills' ? 'Create a skill tree' : `Create an essay${activeGroup ? ` in ${activeGroup.name}` : ''}`} accessibilityRole="button" disabled={importing} onPress={() => { void primaryAction(); }} style={styles.headerButton}>
          {importing ? <ActivityIndicator color={colors.text} /> : <Text style={styles.plus}>+</Text>}
        </Pressable>
        <Pressable accessibilityLabel={ascending ? 'Sort descending' : 'Sort ascending'} accessibilityRole="button" onPress={() => setAscending((value) => !value)} style={styles.headerButton}>
          <SymbolView name={{ ios: 'arrow.up.arrow.down', android: 'swap_vert' }} size={27} tintColor={colors.text} />
        </Pressable>
      </View>

      <View accessibilityRole="tablist" style={styles.mediaSwitch}>
        {(['books', 'movies', 'essays', 'skills'] as const).map((kind) => {
          const selected = mediaKind === kind;
          const icon = kind === 'books' ? { ios: 'books.vertical.fill', android: 'library_books' } as const : kind === 'movies' ? { ios: 'film.fill', android: 'movie' } as const : kind === 'essays' ? { ios: 'doc.text.fill', android: 'article' } as const : { ios: 'point.3.connected.trianglepath.dotted', android: 'account_tree' } as const;
          return (
            <Pressable key={kind} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => chooseMedia(kind)} style={[styles.mediaSwitchButton, selected && styles.mediaSwitchButtonSelected]}>
              <SymbolView name={icon} size={17} tintColor={selected ? colors.onAction : colors.textSecondary} />
              <Text style={[styles.mediaSwitchText, selected && styles.mediaSwitchTextSelected]}>{kind === 'books' ? 'Books' : kind === 'movies' ? 'Movies' : kind === 'essays' ? 'Essays' : 'Skills'}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.searchShell}>
        <SymbolView name={{ ios: 'magnifyingglass', android: 'search' }} size={23} tintColor={colors.textSecondary} />
        <TextInput value={query} onChangeText={setQuery} placeholder={activeGroup ? `Search ${activeGroup.name}` : `Search ${mediaKind}`} placeholderTextColor={colors.textSecondary} style={styles.search} />
      </View>

      {!activeGroup && (mediaKind === 'books' || mediaKind === 'movies') ? (
        <><Pressable
          accessibilityLabel={`Open ${mediaKind === 'books' ? 'reading' : 'watching'} insights`}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/insights', params: { kind: mediaKind } })}
          style={({ pressed }) => [styles.insightsPanel, pressed && styles.pressed]}>
          <View style={styles.insights}>
            {mediaKind === 'books' ? <>
              <View style={styles.insight}><Text style={styles.insightValue}>{formatReadingTime(readingStats.todaySeconds)}</Text><Text style={styles.insightLabel}>Today</Text></View>
              <View style={styles.insight}><Text style={styles.insightValue}>{readingStats.currentStreak}d</Text><Text style={styles.insightLabel}>Streak</Text></View>
              <View style={styles.insight}><Text style={styles.insightValue}>{formatReadingTime(readingStats.lastSevenDaysSeconds)}</Text><Text style={styles.insightLabel}>7 days</Text></View>
              <View style={styles.insight}><Text style={styles.insightValue}>{readingStats.highlightCount}</Text><Text style={styles.insightLabel}>Highlights</Text></View>
            </> : <>
              <View style={styles.insight}><Text style={styles.insightValue}>{movieStats.watches}</Text><Text style={styles.insightLabel}>Watched</Text></View>
              <View style={styles.insight}><Text style={styles.insightValue}>{movieStats.rated}</Text><Text style={styles.insightLabel}>Rated</Text></View>
              <View style={styles.insight}><Text style={styles.insightValue}>{movieStats.hours}h</Text><Text style={styles.insightLabel}>Watch time</Text></View>
              <View style={styles.insight}><Text style={styles.insightValue}>{movieStats.rewatches}</Text><Text style={styles.insightLabel}>Rewatches</Text></View>
            </>}
          </View>
          <View style={styles.insightsLink}>
            <Text style={styles.insightsLinkText}>{mediaKind === 'books' ? 'Reading insights' : 'Watching insights'}</Text>
            <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right' }} size={16} tintColor={colors.accent} />
          </View>
        </Pressable><View accessibilityRole="tablist" style={styles.groupSwitch}>
          {(['collections', 'tiers'] as const).map((mode) => <Pressable key={mode} accessibilityRole="tab" accessibilityState={{ selected: groupMode === mode }} onPress={() => chooseGroupMode(mode)} style={[styles.groupSwitchButton, groupMode === mode && styles.groupSwitchButtonSelected]}><SymbolView name={mode === 'collections' ? { ios: 'square.grid.2x2', android: 'grid_view' } : { ios: 'list.number', android: 'format_list_numbered' }} size={16} tintColor={groupMode === mode ? colors.onAction : colors.textSecondary} /><Text style={[styles.groupSwitchText, groupMode === mode && styles.groupSwitchTextSelected]}>{mode === 'collections' ? 'Collections' : 'Tiers'}</Text></Pressable>)}
        </View><Pressable accessibilityLabel="Import Kindle books and highlights" accessibilityRole="button" disabled={importing} onPress={() => { void importKindleHistory(); }} style={({ pressed }) => [styles.kindleImport, pressed && styles.pressed]}><SymbolView name={{ ios: 'highlighter', android: 'ink_highlighter' }} size={18} tintColor={colors.accent} /><View style={styles.kindleImportCopy}><Text style={styles.kindleImportTitle}>Import Kindle history</Text><Text style={styles.kindleImportDetail}>Choose a full JGOLD library file or one Kindle notebook HTML export.</Text></View><SymbolView name={{ ios: 'chevron.right', android: 'chevron_right' }} size={16} tintColor={colors.textSecondary} /></Pressable></>
      ) : !activeGroup && mediaKind === 'essays' ? (
        <View style={styles.insightsPanel}>
          <View style={styles.insights}>
            <View style={styles.insight}><Text style={styles.insightValue}>{essayStats.total}</Text><Text style={styles.insightLabel}>Essays</Text></View>
            <View style={styles.insight}><Text style={styles.insightValue}>{essayStats.privateCount}</Text><Text style={styles.insightLabel}>Private</Text></View>
            <View style={styles.insight}><Text style={styles.insightValue}>{essayStats.publicCount}</Text><Text style={styles.insightLabel}>Public</Text></View>
            <View style={styles.insight}><Text style={styles.insightValue}>{essayStats.collections}</Text><Text style={styles.insightLabel}>Collections</Text></View>
          </View>
          <Text style={styles.essayHistoryNote}>Every local edit is timestamped in its writing history.</Text>
        </View>
      ) : !activeGroup && mediaKind === 'skills' ? (
        <View style={styles.insightsPanel}><View style={styles.insights}>
          <View style={styles.insight}><Text style={styles.insightValue}>{skillStats.trees}</Text><Text style={styles.insightLabel}>Trees</Text></View><View style={styles.insight}><Text style={styles.insightValue}>{skillStats.abilities}</Text><Text style={styles.insightLabel}>Abilities</Text></View><View style={styles.insight}><Text style={styles.insightValue}>{skillStats.reliable}</Text><Text style={styles.insightLabel}>Reliable</Text></View><View style={styles.insight}><Text style={styles.insightValue}>{skillStats.ready}</Text><Text style={styles.insightLabel}>Ready</Text></View>
        </View><Text style={styles.essayHistoryNote}>Build from prerequisites, then practise until each ability is dependable.</Text></View>
      ) : null}
      {activeError ? <Pressable onPress={mediaKind === 'books' ? dismissError : mediaKind === 'movies' ? () => setMovieError(null) : () => setEssayError(null)} style={styles.error}><Text style={styles.errorText}>{activeError} · Tap to dismiss</Text></Pressable> : null}
    </View>
  );

  const refreshing = mediaKind === 'books' ? syncing : mediaKind === 'movies' ? moviesLoading : mediaKind === 'essays' ? essaysLoading : skillsLoading;
  const refreshControl = <RefreshControl refreshing={refreshing} onRefresh={mediaKind === 'books' ? async () => { await refresh(); await syncWebsite(); } : mediaKind === 'movies' ? reloadMovies : mediaKind === 'essays' ? reloadEssays : reloadSkillTrees} tintColor={colors.accent} />;
  const screenLoading = mediaKind === 'books' ? loading : mediaKind === 'movies' ? moviesLoading && !moviesLoaded : mediaKind === 'essays' ? essaysLoading && !essaysLoaded : skillsLoading && skillTrees.length === 0;
  const emptyMessage = mediaKind === 'books' ? 'Your book collections will appear here. Tap + to import a DRM-free EPUB or PDF.' : mediaKind === 'movies' ? 'No movie collections match this view. Pull down to refresh the website movie library.' : 'Your public website collections and private essay collections will appear here. Tap + to begin writing.';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      {screenLoading ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : mediaKind === 'skills' ? (
        <FlatList key="skills" data={filteredSkillTrees} keyExtractor={(item) => item.id} renderItem={({ item }) => <SkillTreeCard title={item.title} description={item.description || 'A custom progression from foundations to confident practice.'} nodeCount={item.nodeCount} reliableCount={item.reliableCount} readyCount={item.readyCount} onPress={() => router.push({ pathname: '/skills/[id]', params: { id: item.id } })} />} ListHeaderComponent={<>{header}<SkillTreeCard builtIn title="French conversation" description="Speak sooner through real-world phrases, retrieval and milestone practice." nodeCount={FRENCH_SKILLS.length} reliableCount={learningDashboard?.reliableSkills ?? 0} readyCount={learningDashboard?.dueReviews ?? 0} onPress={() => router.push('/learning')} /></>} ListEmptyComponent={<View style={styles.skillEmpty}><Text style={styles.skillEmptyTitle}>Build your first skill tree</Text><Text style={styles.skillEmptyCopy}>Tap + to map foundations, prerequisites and advanced abilities.</Text></View>} contentContainerStyle={styles.content} refreshControl={refreshControl} />
      ) : activeGroup ? (
        <FlatList key={`${mediaKind}-items`} data={visibleItems} keyExtractor={(item) => `${item.kind}:${item.id}`} numColumns={mediaKind === 'essays' ? 1 : 2} columnWrapperStyle={mediaKind === 'essays' ? undefined : styles.itemColumns} renderItem={({ item }) => item.kind === 'essays' ? <EssayDocumentCard item={item} onPress={openItem} /> : <MediaCard item={item} onPress={openItem} />} ListHeaderComponent={header} ListEmptyComponent={<Text style={styles.empty}>Nothing matches this search.</Text>} contentContainerStyle={styles.content} refreshControl={refreshControl} />
      ) : (
        <FlatList key={`${mediaKind}-collections`} data={visibleGroups} keyExtractor={(item) => item.key} numColumns={3} columnWrapperStyle={styles.collectionColumns} renderItem={({ item }) => <CollectionTile group={item} mediaKind={mediaKind} onPress={setSelectedCollection} />} ListHeaderComponent={header} ListEmptyComponent={<Text style={styles.empty}>{emptyMessage}</Text>} contentContainerStyle={styles.content} refreshControl={refreshControl} />
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    loader: { flex: 1 },
    content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 120, width: '100%', maxWidth: 760, alignSelf: 'center' },
    header: { gap: 15, marginBottom: 25 },
    titleRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 3 },
    titleCopy: { flex: 1, minWidth: 0 },
    title: { color: colors.text, fontFamily: Fonts.bold, fontSize: 31, lineHeight: 38 },
    back: { color: colors.accent, fontFamily: Fonts.bold, fontSize: 13, lineHeight: 19, marginBottom: 1 },
    headerButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
    plus: { color: colors.text, fontFamily: Fonts.sans, fontSize: 42, lineHeight: 44, fontWeight: '300' },
    mediaSwitch: { flexDirection: 'row', padding: 4, gap: 4, borderRadius: 14, borderCurve: 'continuous', backgroundColor: colors.backgroundSelected },
    mediaSwitchButton: { flex: 1, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 11, borderCurve: 'continuous' },
    mediaSwitchButtonSelected: { backgroundColor: colors.action },
    mediaSwitchText: { color: colors.textSecondary, fontFamily: Fonts.bold, fontSize: 14 },
    mediaSwitchTextSelected: { color: colors.onAction },
    searchShell: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 24, borderCurve: 'continuous', borderWidth: 1.5, borderColor: colors.textSecondary, backgroundColor: colors.backgroundElement, paddingHorizontal: 15 },
    search: { flex: 1, height: '100%', color: colors.text, fontFamily: Fonts.sans, fontSize: 16, paddingVertical: 0 },
    insightsPanel: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line, paddingTop: 11, paddingBottom: 8 },
    insights: { flexDirection: 'row' },
    insight: { flex: 1, alignItems: 'center', gap: 2 },
    insightValue: { color: colors.text, fontFamily: Fonts.bold, fontSize: 14 },
    insightLabel: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 },
    insightsLink: { minHeight: 28, marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
    insightsLinkText: { color: colors.accent, fontFamily: Fonts.bold, fontSize: 11 },
    groupSwitch: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 13, borderCurve: 'continuous', backgroundColor: colors.backgroundSelected },
    groupSwitchButton: { flex: 1, minHeight: 39, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 10, borderCurve: 'continuous' },
    groupSwitchButtonSelected: { backgroundColor: colors.action },
    groupSwitchText: { color: colors.textSecondary, fontFamily: Fonts.bold, fontSize: 12 },
    groupSwitchTextSelected: { color: colors.onAction },
    kindleImport: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 14, borderCurve: 'continuous', backgroundColor: colors.backgroundElement },
    kindleImportCopy: { flex: 1, minWidth: 0 },
    kindleImportTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 13 },
    kindleImportDetail: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 10, lineHeight: 14, marginTop: 2 },
    essayHistoryNote: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 9 },
    error: { backgroundColor: colors.dangerSoft, borderRadius: 8, borderCurve: 'continuous', padding: 12 },
    errorText: { color: colors.danger, fontFamily: Fonts.semibold, fontSize: 12 },
    collectionColumns: { gap: 13, marginBottom: 16 },
    collection: { flex: 1, maxWidth: '31.5%', minWidth: 0, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.backgroundElement, padding: 7, minHeight: 184 },
    coverMosaic: { height: 126, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignContent: 'space-between', overflow: 'hidden' },
    collectionTierBadge: { position: 'absolute', zIndex: 2, top: 5, right: 5, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7, borderCurve: 'continuous' },
    collectionTierText: { color: '#111111', fontFamily: Fonts.extraBold, fontSize: 8, letterSpacing: 0.25 },
    miniCoverSlot: { width: '47%', height: 60, backgroundColor: colors.backgroundSelected, overflow: 'hidden' },
    miniCover: { width: '100%', height: '100%', aspectRatio: undefined, borderRadius: 0 },
    miniEssay: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 1, backgroundColor: colors.accentSoft },
    miniEssayInitial: { color: colors.text, fontFamily: Fonts.bold, fontSize: 13 },
    miniEssayStatus: { color: colors.textSecondary, fontFamily: Fonts.extraBold, fontSize: 6, letterSpacing: 0.4 },
    collectionMeta: { minHeight: 44, flexDirection: 'row', alignItems: 'flex-end', gap: 4, paddingTop: 7 },
    collectionName: { flex: 1, color: colors.text, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 17 },
    essayCollectionName: { fontFamily: Fonts.semibold, fontSize: 11, lineHeight: 15 },
    collectionCount: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 12 },
    itemColumns: { gap: 15 },
    mediaCard: { flex: 1, minWidth: 0, marginBottom: 24, gap: 5 },
    coverFrame: { position: 'relative' },
    tierBadge: { position: 'absolute', zIndex: 2, top: 9, right: 9, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderCurve: 'continuous', boxShadow: '0 2px 7px rgba(0, 0, 0, 0.22)' },
    tierBadgeText: { color: '#111111', fontFamily: Fonts.extraBold, fontSize: 10, letterSpacing: 0.15 },
    essayPreview: { aspectRatio: 0.72, justifyContent: 'space-between', padding: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.backgroundElement },
    essayPreviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 7 },
    essayPreviewText: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 19 },
    visibilityBadge: { overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, fontFamily: Fonts.extraBold, fontSize: 8, letterSpacing: 0.5, textTransform: 'uppercase' },
    privateBadge: { color: colors.accent, backgroundColor: colors.accentSoft },
    publicBadge: { color: colors.success, backgroundColor: colors.backgroundSelected },
    pressed: { opacity: 0.68, transform: [{ scale: 0.985 }] },
    mediaTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 15, lineHeight: 19, marginTop: 3 },
    mediaSubtitle: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 12 },
    essayDocument: { width: '100%', marginBottom: 14, padding: 18, gap: 11, borderWidth: 1, borderColor: colors.line, borderRadius: 18, borderCurve: 'continuous', backgroundColor: colors.backgroundElement },
    essayDocumentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    essayDocumentIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderCurve: 'continuous', backgroundColor: colors.accentSoft },
    essayDocumentLabels: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
    essayCollection: { flexShrink: 1, color: colors.textSecondary, fontFamily: Fonts.semibold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
    essayDocumentTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 20, lineHeight: 26 },
    essayDocumentExcerpt: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21 },
    essayDocumentFooter: { minHeight: 35, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 2, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line },
    essayUpdated: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
    essayUpdatedText: { flexShrink: 1, color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 10 },
    essayDocumentAction: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    essayDocumentActionText: { color: colors.accent, fontFamily: Fonts.bold, fontSize: 11 },
    progressTrack: { height: 3, backgroundColor: colors.line, borderRadius: 2, overflow: 'hidden', marginTop: 2 },
    progressBar: { height: 3, backgroundColor: colors.accent },
    skillTreeCard: { width: '100%', minHeight: 126, flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 13, padding: 16, borderWidth: 1, borderColor: colors.line, borderRadius: 20, borderCurve: 'continuous', backgroundColor: colors.backgroundElement },
    skillTreeIcon: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 15, borderCurve: 'continuous', backgroundColor: colors.accentSoft },
    skillTreeCopy: { flex: 1, minWidth: 0 },
    skillTreeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    skillTreeTitle: { flexShrink: 1, color: colors.text, fontFamily: Fonts.bold, fontSize: 17 },
    builtInBadge: { overflow: 'hidden', color: colors.accent, backgroundColor: colors.accentSoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, fontFamily: Fonts.extraBold, fontSize: 7, letterSpacing: 0.5 },
    skillTreeDescription: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 11, lineHeight: 16, marginTop: 4 },
    skillTreeMeta: { flexDirection: 'row', gap: 10, marginTop: 8 },
    skillTreeMetaText: { color: colors.textSecondary, fontFamily: Fonts.semibold, fontSize: 9 },
    skillTreeTrack: { height: 3, overflow: 'hidden', borderRadius: 2, backgroundColor: colors.line, marginTop: 9 },
    skillTreeFill: { height: 3, backgroundColor: colors.accent },
    skillEmpty: { alignItems: 'center', padding: 28 },
    skillEmptyTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 17 },
    skillEmptyCopy: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 5 },
    empty: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22, padding: 30, textAlign: 'center' },
  });
}
