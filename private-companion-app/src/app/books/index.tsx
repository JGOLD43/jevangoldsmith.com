import { bodyText } from '@/domain/studio-document.cjs';
import * as Linking from 'expo-linking';
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { memo, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookCover } from '@/components/book-cover';
import { Fonts, type AppColors } from '@/constants/theme';
import type { Movie } from '@/domain/models';
import { RATING_TIERS, ratingTier, type RatingTier } from '@/domain/rating-tier';
import { useLibraryTheme as useTheme } from '@/hooks/use-library-theme';
import { FRENCH_SKILLS } from '@/learning/french-seed';
import type { SkillTreeSummary } from '@/learning/types';
import { loadPublicMovies } from '@/services/public-movies';
import { loadSiteCollection, type SiteItem } from '@/services/public-site';
import { useApp } from '@/state/app-context';
import { useBooks } from '@/state/books-context';
import { useLearning } from '@/state/learning-context';
import { formatReadingTime } from '@/storage/reading-analytics';
import { MARKETING_TREE_ORDER } from '@/learning/marketing-curricula';
import { PRIORITY_CURRICULA } from '@/learning/priority-curricula';
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
  const covers = group.items.slice(0, 3);
  const noun = group.items.length === 1 ? mediaKind.slice(0, -1) : mediaKind;
  return (
    <Pressable accessibilityLabel={`${group.name}, ${group.items.length} ${noun}`} accessibilityRole="button" onPress={() => onPress(group.key)} style={({ pressed }) => [styles.collection, pressed && styles.pressed]}>
      <View style={styles.coverMosaic}>
        {group.tier ? <View style={[styles.collectionTierBadge, { backgroundColor: group.tier.color }]}><Text style={styles.collectionTierText}>{group.tier.label}</Text></View> : null}
        {covers.map((item, index) => {
          return <View key={item.id} style={[styles.miniCoverSlot, covers.length === 1 ? styles.coverSolo : index === 0 ? styles.coverLeft : index === 1 ? styles.coverCentre : styles.coverRight]}>{item ? mediaKind === 'essays' ? (
            <View style={styles.miniEssay}><SymbolView name={{ ios: 'doc.text.fill', android: 'article' }} size={17} tintColor={colors.accent} /><Text style={styles.miniEssayInitial}>{item.title.slice(0, 1).toUpperCase()}</Text><Text style={styles.miniEssayStatus}>{item.visibility === 'private' ? 'PRI' : 'PUB'}</Text></View>
          ) : <BookCover title={item.title} author={item.subtitle} uri={compactCoverUri(item.coverUri)} compact style={styles.miniCover} /> : null}</View>;
        })}
      </View>
      <View style={styles.collectionMeta}>
        <Text numberOfLines={2} style={[styles.collectionName, mediaKind === 'essays' && styles.essayCollectionName]}>{group.name}</Text>
        <Text style={styles.collectionCount}>{group.items.length} {noun}</Text>
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
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [skillTrees, setSkillTrees] = useState<SkillTreeSummary[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skillError, setSkillError] = useState<string | null>(null);
  const [skillGroup, setSkillGroup] = useState<'all' | 'marketing'>('all');
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
    setSkillError(null);
    try { await ensureCoreSkillTrees(); setSkillTrees(await listSkillTrees()); }
    catch (cause) { setSkillError(cause instanceof Error ? cause.message : 'Could not load skill curricula.'); }
    finally { setSkillsLoading(false); }
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
      excerpt: essay.summary || bodyText(essay.body),
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
      excerpt: essay.summary || bodyText(essay.body),
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

  const filteredSkillTrees = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const groupedTrees = skillGroup === 'marketing' ? skillTrees.filter(tree => MARKETING_TREE_ORDER.includes(tree.title)) : skillTrees;
    const trees = needle ? groupedTrees.filter((tree) => `${tree.title} ${tree.description}`.toLowerCase().includes(needle)) : groupedTrees;
    if (skillGroup === 'marketing') return [...trees].sort((left, right) => MARKETING_TREE_ORDER.indexOf(left.title) - MARKETING_TREE_ORDER.indexOf(right.title));
    return [...trees].sort((left, right) => Number(PRIORITY_CURRICULA.some(seed => seed.title === right.title)) - Number(PRIORITY_CURRICULA.some(seed => seed.title === left.title)) || (ascending ? left.title.localeCompare(right.title) : right.title.localeCompare(left.title)));
  }, [ascending, query, skillTrees, skillGroup]);

  const chooseMedia = useCallback((next: MediaKind) => {
    setMediaKind(next);
    setSkillGroup('all');
    setSelectedCollection(null);
    setQuery('');
    setGroupMode('collections');
  }, []);

  useFocusEffect(useCallback(() => {
    if (!selectedCollection) return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelectedCollection(null); setQuery(''); return true;
    });
    return () => back.remove();
  }, [selectedCollection]));

  const chooseGroupMode = useCallback((next: 'collections' | 'tiers') => {
    setGroupMode(next);
    setSelectedCollection(null);
    setQuery('');
  }, []);

  const openCollection = useCallback((key: string) => {
    setSelectedCollection(key);
    const group = allGroups.find(item => item.key === key);
    if (group?.name.toLowerCase().includes(query.trim().toLowerCase())) setQuery('');
  }, [allGroups, query]);

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

  const activeError = mediaKind === 'books' ? error : mediaKind === 'movies' ? movieError : mediaKind === 'essays' ? essayError : skillError;
  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={styles.titleCopy}>
          {activeGroup ? <Pressable accessibilityRole="button" hitSlop={8} onPress={() => { setSelectedCollection(null); setQuery(''); }}><Text style={styles.back}>‹ {groupMode === 'tiers' ? 'Tiers' : 'Collections'}</Text></Pressable> : null}
          <Text numberOfLines={2} style={styles.title}>{activeGroup?.name ?? 'Library'}</Text>
        </View>
        <Pressable accessibilityLabel={mediaKind === 'books' ? 'Add to Library' : mediaKind === 'movies' ? 'Add a movie on Letterboxd' : mediaKind === 'skills' ? 'Create a skill tree' : 'Create an essay'} accessibilityRole="button" disabled={importing} onPress={() => { if (mediaKind === 'books') setAddMenuOpen(true); else void primaryAction(); }} style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
          {importing ? <ActivityIndicator color={colors.accent} /> : <Text style={styles.plus}>+</Text>}
        </Pressable>
      </View>

      <View accessibilityRole="tablist" style={styles.mediaSwitch}>
        {(['books', 'movies', 'essays', 'skills'] as const).map(kind => <Pressable key={kind} accessibilityRole="tab" accessibilityState={{ selected: mediaKind === kind }} onPress={() => chooseMedia(kind)} style={[styles.mediaSwitchButton, mediaKind === kind && styles.mediaSwitchButtonSelected]}><Text style={[styles.mediaSwitchText, mediaKind === kind && styles.mediaSwitchTextSelected]}>{kind[0].toUpperCase() + kind.slice(1)}</Text></Pressable>)}
      </View>

      <View style={styles.searchShell}>
        <SymbolView name={{ ios: 'magnifyingglass', android: 'search' }} size={19} tintColor={colors.textSecondary} />
        <TextInput accessibilityLabel={activeGroup ? `Search ${activeGroup.name}` : `Search ${mediaKind}`} value={query} onChangeText={setQuery} autoCorrect={false} returnKeyType="search" placeholder={activeGroup ? 'Search this collection' : `Search ${mediaKind}`} placeholderTextColor={colors.textSecondary} style={styles.search} />
        {query ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8} onPress={() => setQuery('')} style={styles.clearSearch}><Text style={styles.clearSearchText}>×</Text></Pressable> : null}
      </View>

      {!activeGroup && (mediaKind === 'books' || mediaKind === 'movies') ? <Pressable accessibilityLabel={`Open ${mediaKind === 'books' ? 'reading' : 'watching'} insights`} accessibilityRole="button" onPress={() => router.push({ pathname: '/insights', params: { kind: mediaKind } })} style={({ pressed }) => [styles.readingSummary, pressed && styles.pressed]}>
        <Text style={styles.summaryText}>{mediaKind === 'books' ? <><Text style={styles.summaryValue}>{formatReadingTime(readingStats.todaySeconds)}</Text> today<Text>   ·   </Text><Text style={styles.summaryValue}>{formatReadingTime(readingStats.lastSevenDaysSeconds)}</Text> last 7 days</> : <><Text style={styles.summaryValue}>{movieStats.watches}</Text> watched<Text>   ·   </Text><Text style={styles.summaryValue}>{movieStats.rated}</Text> rated</>}</Text>
        <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right' }} size={16} tintColor={colors.textSecondary} />
      </Pressable> : null}

      {mediaKind === 'skills' ? <View style={styles.skillFilters}>{(['all', 'marketing'] as const).map(group => <Pressable key={group} accessibilityRole="button" accessibilityState={{ selected: skillGroup === group }} onPress={() => setSkillGroup(group)} style={[styles.skillFilter, skillGroup === group && styles.skillFilterSelected]}><Text style={[styles.toolbarText, skillGroup === group && { color: colors.accent }]}>{group === 'all' ? 'All skills' : 'Marketing'}</Text></Pressable>)}</View> : null}
      <View style={styles.browseToolbar}>
        <Text style={styles.sectionTitle}>{activeGroup ? `${visibleItems.length} ${visibleItems.length === 1 ? mediaKind.slice(0, -1) : mediaKind}` : mediaKind === 'skills' ? 'Skill trees' : groupMode === 'tiers' ? 'By rating' : 'Collections'}</Text>
        {!activeGroup && (mediaKind === 'books' || mediaKind === 'movies') ? <Pressable accessibilityRole="button" accessibilityLabel={groupMode === 'collections' ? 'Browse by rating tiers' : 'Browse collections'} onPress={() => chooseGroupMode(groupMode === 'collections' ? 'tiers' : 'collections')} style={styles.toolbarButton}><Text style={styles.toolbarText}>{groupMode === 'collections' ? 'By rating' : 'Collections'}</Text></Pressable> : null}
        {(groupMode !== 'tiers' || activeGroup) && !(mediaKind === 'skills' && skillGroup === 'marketing') ? <Pressable accessibilityLabel={ascending ? 'Sort descending' : 'Sort ascending'} accessibilityRole="button" onPress={() => setAscending(value => !value)} style={styles.toolbarButton}><Text style={styles.toolbarText}>{ascending ? 'A–Z' : 'Z–A'}</Text><SymbolView name={{ ios: 'arrow.up.arrow.down', android: 'swap_vert' }} size={15} tintColor={colors.textSecondary} /></Pressable> : null}
      </View>
      {activeError ? <Pressable onPress={mediaKind === 'skills' ? () => { void reloadSkillTrees(); } : mediaKind === 'books' ? dismissError : mediaKind === 'movies' ? () => setMovieError(null) : () => setEssayError(null)} style={styles.error}><Text style={styles.errorText}>{activeError} · {mediaKind === 'skills' ? 'Tap to retry' : 'Tap to dismiss'}</Text></Pressable> : null}
    </View>
  );

  const refreshing = mediaKind === 'books' ? syncing : mediaKind === 'movies' ? moviesLoading : mediaKind === 'essays' ? essaysLoading : skillsLoading;
  const refreshControl = <RefreshControl refreshing={refreshing} onRefresh={mediaKind === 'books' ? async () => { await refresh(); await syncWebsite(); } : mediaKind === 'movies' ? reloadMovies : mediaKind === 'essays' ? reloadEssays : reloadSkillTrees} tintColor={colors.accent} />;
  const screenLoading = mediaKind === 'books' ? loading : mediaKind === 'movies' ? moviesLoading && !moviesLoaded : mediaKind === 'essays' ? essaysLoading && !essaysLoaded : skillsLoading && skillTrees.length === 0;
  const emptyMessage = mediaKind === 'books' ? 'Your book collections will appear here. Tap + to import a DRM-free EPUB or PDF.' : mediaKind === 'movies' ? 'No movie collections match this view. Pull down to refresh the website movie library.' : 'Your public website collections and private essay collections will appear here. Tap + to begin writing.';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      {mediaKind === 'skills' ? (
        <FlatList key="skills" data={filteredSkillTrees} keyExtractor={(item) => item.id} renderItem={({ item }) => <SkillTreeCard title={item.title} description={item.description || 'A custom progression from foundations to confident practice.'} nodeCount={item.nodeCount} reliableCount={item.reliableCount} readyCount={item.readyCount} onPress={() => router.push({ pathname: '/skills/[id]', params: { id: item.id } })} />} ListHeaderComponent={<>{header}</>} ListFooterComponent={skillGroup === 'all' && (!query.trim() || 'French conversation'.toLowerCase().includes(query.trim().toLowerCase())) ? <SkillTreeCard builtIn title="French conversation" description="Speak sooner through real-world phrases, retrieval and milestone practice." nodeCount={FRENCH_SKILLS.length} reliableCount={learningDashboard?.reliableSkills ?? 0} readyCount={learningDashboard?.dueReviews ?? 0} onPress={() => router.push('/learning/tree')} /> : null} ListEmptyComponent={<View style={styles.skillEmpty}><Text style={styles.skillEmptyTitle}>{skillError ? "Curricula could not load" : query.trim() ? "No matching skill trees" : "Preparing your curricula"}</Text><Text style={styles.skillEmptyCopy}>{skillError ? "Tap the error above to retry. Your saved progress has not been removed." : query.trim() ? "Clear the search to see all curricula." : "Pull down to retry loading your built-in skill trees."}</Text></View>} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} refreshControl={refreshControl} />
      ) : activeGroup ? (
        <FlatList key={`${mediaKind}-items`} data={visibleItems} keyExtractor={(item) => `${item.kind}:${item.id}`} numColumns={mediaKind === 'essays' ? 1 : 2} columnWrapperStyle={mediaKind === 'essays' ? undefined : styles.itemColumns} renderItem={({ item }) => item.kind === 'essays' ? <EssayDocumentCard item={item} onPress={openItem} /> : <MediaCard item={item} onPress={openItem} />} ListHeaderComponent={header} ListEmptyComponent={<Text style={styles.empty}>Nothing matches this search.</Text>} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} refreshControl={refreshControl} />
      ) : (
        <FlatList key={`${mediaKind}-collections`} data={visibleGroups} keyExtractor={(item) => item.key} numColumns={2} columnWrapperStyle={styles.collectionColumns} renderItem={({ item }) => <CollectionTile group={item} mediaKind={mediaKind} onPress={openCollection} />} ListHeaderComponent={header} ListEmptyComponent={screenLoading ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : <Text style={styles.empty}>{query.trim() ? 'No matches. Try another title, author or collection.' : emptyMessage}</Text>} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} refreshControl={refreshControl} />
      )}
      <Modal visible={addMenuOpen} transparent animationType="slide" onRequestClose={() => setAddMenuOpen(false)}>
        <View style={styles.sheetBackdrop}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close add menu" onPress={() => setAddMenuOpen(false)} style={StyleSheet.absoluteFill} />
          <SafeAreaView edges={['bottom']} style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.titleRow}><Text style={[styles.sectionTitle, { flex: 1 }]}>Add to Library</Text><Pressable accessibilityRole="button" onPress={() => setAddMenuOpen(false)} style={styles.toolbarButton}><Text style={styles.toolbarText}>Done</Text></Pressable></View>
            <Pressable accessibilityRole="button" onPress={() => { setAddMenuOpen(false); void primaryAction(); }} style={styles.sheetOption}><SymbolView name={{ ios: 'book', android: 'book' }} size={24} tintColor={colors.accent} /><View style={styles.sheetCopy}><Text style={styles.sheetOptionTitle}>Import a book</Text><Text style={styles.sheetOptionDetail}>EPUB or PDF</Text></View><SymbolView name={{ ios: 'chevron.right', android: 'chevron_right' }} size={18} tintColor={colors.textSecondary} /></Pressable>
            <Pressable accessibilityRole="button" onPress={() => { setAddMenuOpen(false); void importKindleHistory(); }} style={styles.sheetOption}><SymbolView name={{ ios: 'highlighter', android: 'ink_highlighter' }} size={24} tintColor={colors.accent} /><View style={styles.sheetCopy}><Text style={styles.sheetOptionTitle}>Import Kindle history</Text><Text style={styles.sheetOptionDetail}>Books, collections and highlights</Text></View><SymbolView name={{ ios: 'chevron.right', android: 'chevron_right' }} size={18} tintColor={colors.textSecondary} /></Pressable>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    skillFilters: { flexDirection: 'row', gap: 8 },
    skillFilter: { paddingHorizontal: 16, minHeight: 44, justifyContent: 'center', borderRadius: 12 },
    skillFilterSelected: { backgroundColor: colors.accentSoft },
    coverLeft: { left: '6%', transform: [{ rotate: '-9deg' }] },
    coverCentre: { left: '28%', bottom: 19, zIndex: 2 },
    coverRight: { left: '50%', transform: [{ rotate: '9deg' }] },
    coverSolo: { left: '28%', bottom: 19 },
    clearSearch: { minWidth: 30, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    clearSearchText: { fontSize: 24, color: colors.textSecondary },
    readingSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 38, paddingHorizontal: 2, gap: 12 },
    summaryText: { flex: 1, color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 19 },
    summaryValue: { color: colors.text, fontFamily: Fonts.semibold },
    browseToolbar: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
    sectionTitle: { flex: 1, color: colors.text, fontFamily: Fonts.semibold, fontSize: 20, lineHeight: 26 },
    toolbarButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 44, paddingHorizontal: 7 },
    toolbarText: { color: colors.textSecondary, fontFamily: Fonts.medium, fontSize: 12 },
    sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: { backgroundColor: colors.backgroundElement, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 10, paddingBottom: 24, width: '100%', maxWidth: 760, alignSelf: 'center' },
    sheetHandle: { height: 4, width: 36, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 8 },
    sheetOption: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 82, borderBottomWidth: 1, borderBottomColor: colors.line },
    sheetCopy: { flex: 1, gap: 4 },
    sheetOptionTitle: { color: colors.text, fontFamily: Fonts.semibold, fontSize: 17 },
    sheetOptionDetail: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 13 },
    safeArea: { flex: 1, backgroundColor: colors.background },
    loader: { padding: 32 },
    content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 110, width: '100%', maxWidth: 760, alignSelf: 'center' },
    header: { gap: 12, marginBottom: 12 },
    titleRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 3 },
    titleCopy: { flex: 1, minWidth: 0 },
    title: { color: colors.text, fontFamily: Fonts.bold, fontSize: 31, lineHeight: 38 },
    back: { color: colors.accent, fontFamily: Fonts.bold, fontSize: 13, lineHeight: 19, marginBottom: 1 },
    headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: colors.backgroundElement },
    plus: { color: colors.text, fontFamily: Fonts.sans, fontSize: 29, lineHeight: 34 },
    mediaSwitch: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line },
    mediaSwitchButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    mediaSwitchButtonSelected: { borderBottomColor: colors.accent },
    mediaSwitchText: { color: colors.textSecondary, fontFamily: Fonts.medium, fontSize: 14 },
    mediaSwitchTextSelected: { color: colors.text, fontFamily: Fonts.bold },
    searchShell: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 12, backgroundColor: colors.backgroundElement, paddingHorizontal: 13 },
    search: { flex: 1, minWidth: 0, minHeight: 46, color: colors.text, fontFamily: Fonts.sans, fontSize: 15, paddingVertical: 8 },
    error: { backgroundColor: colors.dangerSoft, borderRadius: 8, borderCurve: 'continuous', padding: 12 },
    errorText: { color: colors.danger, fontFamily: Fonts.semibold, fontSize: 12 },
    collectionColumns: { gap: 14, marginBottom: 22 },
    collection: { flex: 1, maxWidth: '48%', minWidth: 0 },
    coverMosaic: { height: 150, position: 'relative', overflow: 'hidden', borderRadius: 16, backgroundColor: colors.backgroundElement },
    collectionTierBadge: { position: 'absolute', zIndex: 2, top: 5, right: 5, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7, borderCurve: 'continuous' },
    collectionTierText: { color: '#111111', fontFamily: Fonts.extraBold, fontSize: 8, letterSpacing: 0.25 },
    miniCoverSlot: { position: 'absolute', width: '44%', height: 108, bottom: 15, overflow: 'hidden', borderRadius: 4, boxShadow: '0 4px 9px rgba(0,0,0,0.18)' },
    miniCover: { width: '100%', height: '100%', aspectRatio: undefined, borderRadius: 4 },
    miniEssay: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 1, backgroundColor: colors.accentSoft },
    miniEssayInitial: { color: colors.text, fontFamily: Fonts.bold, fontSize: 13 },
    miniEssayStatus: { color: colors.textSecondary, fontFamily: Fonts.extraBold, fontSize: 6, letterSpacing: 0.4 },
    collectionMeta: { gap: 4, paddingTop: 11 },
    collectionName: { color: colors.text, fontFamily: Fonts.semibold, fontSize: 15, lineHeight: 21 },
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
    pressed: { opacity: 0.76, transform: [{ scale: 0.985 }] },
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
