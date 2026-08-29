import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { memo, useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookCover } from '@/components/book-cover';
import { VaultComposer } from '@/components/composers';
import { LifeItemComposer } from '@/components/life-item-composer';
import { LIFE_AREAS, lifeAreaDefinition, type LifeAreaDefinition } from '@/constants/life-areas';
import { Fonts, type AppColors } from '@/constants/theme';
import type { Book, LifeArea, LifeItem, NewLifeItem, NewVaultItem } from '@/domain/models';
import { useTheme } from '@/hooks/use-theme';
import { hasPublishingConnection } from '@/services/publishing';
import { formatReadingTime } from '@/storage/reading-analytics';
import { useApp } from '@/state/app-context';
import { useBooks } from '@/state/books-context';
import { useLearning } from '@/state/learning-context';

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

const AreaTab = memo(function AreaTab({ definition, count, selected, onPress }: {
  definition: LifeAreaDefinition;
  count: number;
  selected: boolean;
  onPress: (area: LifeArea) => void;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => onPress(definition.key)} style={({ pressed }) => [styles.areaTab, selected && styles.areaTabSelected, pressed && styles.pressed]}>
      <View style={[styles.areaIcon, { backgroundColor: `${definition.color}24` }]}><SymbolView name={definition.icon} size={20} tintColor={definition.color} /></View>
      <Text numberOfLines={1} style={[styles.areaTabLabel, selected && styles.areaTabLabelSelected]}>{definition.shortLabel}</Text>
      <Text style={styles.areaTabCount}>{count}</Text>
    </Pressable>
  );
});

const LifeRow = memo(function LifeRow({ item, onEdit, onToggle }: { item: LifeItem; onEdit: (item: LifeItem) => void; onToggle: (item: LifeItem) => void }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const definition = lifeAreaDefinition(item.area);
  const complete = item.progress === 100;
  return (
    <View style={styles.lifeRow}>
      <Pressable accessibilityLabel={complete ? `Mark ${item.title} active` : `Complete ${item.title}`} accessibilityRole="checkbox" accessibilityState={{ checked: complete }} hitSlop={10} onPress={() => onToggle(item)} style={[styles.check, complete && { borderColor: definition.color, backgroundColor: definition.color }]}>
        {complete ? <SymbolView name={{ ios: 'checkmark', android: 'check' }} size={15} tintColor="#121212" /> : null}
      </Pressable>
      <Pressable accessibilityLabel={`Edit ${item.title}`} accessibilityRole="button" onPress={() => onEdit(item)} style={({ pressed }) => [styles.lifeEdit, pressed && styles.pressed]}>
        <View style={styles.lifeCopy}>
          <View style={styles.lifeTitleRow}><Text numberOfLines={1} style={[styles.lifeTitle, complete && styles.lifeTitleComplete]}>{item.title}</Text><Text style={[styles.lifeProgress, { color: definition.color }]}>{item.progress}%</Text></View>
          {item.note ? <Text numberOfLines={1} style={styles.lifeNote}>{item.note}</Text> : null}
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${item.progress}%`, backgroundColor: definition.color }]} /></View>
          {item.targetDate ? <View style={styles.targetRow}><SymbolView name={{ ios: 'calendar', android: 'event' }} size={12} tintColor={colors.textSecondary} /><Text style={styles.target}>{item.targetDate}</Text></View> : null}
        </View>
        <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right' }} size={17} tintColor={colors.textSecondary} />
      </Pressable>
    </View>
  );
});

const RecentBook = memo(function RecentBook({ book, onPress }: { book: Book; onPress: (book: Book) => void }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable accessibilityRole="button" onPress={() => onPress(book)} style={({ pressed }) => [styles.bookCard, pressed && styles.pressed]}>
      <BookCover title={book.title} author={book.author} uri={book.coverUri} style={styles.bookCover} />
      <View style={styles.bookCopy}>
        <Text numberOfLines={2} style={styles.bookTitle}>{book.title}</Text>
        <Text numberOfLines={1} style={styles.bookAuthor}>{book.author || 'Unknown author'}</Text>
        <View style={styles.bookProgressRow}><View style={styles.bookProgressTrack}><View style={[styles.bookProgressFill, { width: `${book.progress * 100}%` }]} /></View><Text style={styles.bookProgressText}>{Math.round(book.progress * 100)}%</Text></View>
      </View>
    </Pressable>
  );
});

export default function HomeScreen() {
  const router = useRouter();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { lifeItems, drafts, createVaultItem, createLifeItem, editLifeItem, deleteLifeItem } = useApp();
  const { books, readingStats, importBook } = useBooks();
  const { dashboard: learningDashboard } = useLearning();
  const [selectedArea, setSelectedArea] = useState<LifeArea>('goal');
  const [editingItem, setEditingItem] = useState<LifeItem | null>(null);
  const [lifeComposerOpen, setLifeComposerOpen] = useState(false);
  const [vaultComposerOpen, setVaultComposerOpen] = useState(false);
  const [publishingConnected, setPublishingConnected] = useState(false);
  const [importingBook, setImportingBook] = useState(false);

  useFocusEffect(useCallback(() => { void hasPublishingConnection().then(setPublishingConnected); }, []));

  const definition = lifeAreaDefinition(selectedArea);
  const selectedItems = useMemo(() => lifeItems
    .filter((item) => item.area === selectedArea)
    .sort((left, right) => Number(Boolean(left.completedAt)) - Number(Boolean(right.completedAt)) || right.updatedAt.localeCompare(left.updatedAt)), [lifeItems, selectedArea]);
  const completedItems = lifeItems.filter((item) => item.progress === 100).length;
  const activeItems = lifeItems.length - completedItems;
  const averageProgress = lifeItems.length ? Math.round(lifeItems.reduce((total, item) => total + item.progress, 0) / lifeItems.length) : 0;
  const activeDrafts = drafts.filter((draft) => draft.status !== 'published');
  const recentlyOpenedBooks = books.filter((book) => book.lastOpenedAt).sort((left, right) => (right.lastOpenedAt ?? '').localeCompare(left.lastOpenedAt ?? '')).slice(0, 3);

  const openNewItem = useCallback((area = selectedArea) => { setSelectedArea(area); setEditingItem(null); setLifeComposerOpen(true); }, [selectedArea]);
  const openItem = useCallback((item: LifeItem) => { setEditingItem(item); setLifeComposerOpen(true); }, []);
  const saveLifeItem = useCallback(async (input: NewLifeItem) => {
    if (editingItem) await editLifeItem(editingItem.id, input);
    else await createLifeItem(input);
    setSelectedArea(input.area);
  }, [createLifeItem, editLifeItem, editingItem]);
  const toggleLifeItem = useCallback(async (item: LifeItem) => {
    await editLifeItem(item.id, { area: item.area, title: item.title, note: item.note, targetDate: item.targetDate, progress: item.progress === 100 ? 75 : 100 });
  }, [editLifeItem]);
  const openBook = useCallback((book: Book) => router.push(`/books/${book.id}`), [router]);

  const startBookImport = async () => {
    setImportingBook(true);
    try {
      const book = await importBook();
      if (book) router.push(`/books/${book.id}`);
    } catch {
      Alert.alert('Could not import book', 'Please choose a DRM-free EPUB or PDF and try again.');
    } finally {
      setImportingBook(false);
    }
  };

  return (
    <>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerCopy}><Text style={styles.date}>{DATE_FORMATTER.format(new Date())}</Text><Text style={styles.greeting}>Your life, at a glance.</Text></View>
            <View style={styles.headerActions}>
              <Pressable accessibilityLabel="Settings" accessibilityRole="button" onPress={() => router.push('/settings')} style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}><SymbolView name={{ ios: 'gearshape', android: 'settings' }} size={21} tintColor={colors.textSecondary} /></Pressable>
              <Pressable accessibilityLabel="Add something" accessibilityRole="button" onPress={() => openNewItem()} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}><SymbolView name={{ ios: 'plus', android: 'add' }} size={27} tintColor={colors.onAction} /></Pressable>
            </View>
          </View>

          <View style={styles.hero}>
            <View style={styles.heroTop}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroEyebrow}>PERSONAL COMMAND CENTRE</Text>
                <Text style={styles.heroTitle}>{activeItems ? `${activeItems} things are in motion` : 'Make room for what matters'}</Text>
                <Text style={styles.heroBody}>{lifeItems.length ? `${completedItems} completed · ${averageProgress}% overall progress` : 'Goals, adventures, learning and plans—kept privately on this phone.'}</Text>
              </View>
              <View style={styles.momentum}><Text style={styles.momentumValue}>{averageProgress}</Text><Text style={styles.momentumUnit}>%</Text></View>
            </View>
            <View style={styles.heroTrack}><View style={[styles.heroFill, { width: `${averageProgress}%` }]} /></View>
            <View style={styles.heroMetrics}>
              <Pressable onPress={() => router.push('/insights?kind=books')} style={styles.heroMetric}><Text style={styles.heroMetricValue}>{readingStats.currentStreak}d</Text><Text style={styles.heroMetricLabel}>Reading streak</Text></Pressable>
              <View style={styles.heroDivider} />
              <Pressable onPress={() => router.push('/website')} style={styles.heroMetric}><Text style={styles.heroMetricValue}>{activeDrafts.length}</Text><Text style={styles.heroMetricLabel}>Drafts moving</Text></Pressable>
              <View style={styles.heroDivider} />
              <View style={styles.heroMetric}><Text style={styles.heroMetricValue}>{completedItems}</Text><Text style={styles.heroMetricLabel}>Done</Text></View>
            </View>
          </View>

          <Pressable accessibilityRole="button" onPress={() => router.push('/learning')} style={({ pressed }) => [styles.learningCard, pressed && styles.pressed]}>
            <View style={styles.learningTop}>
              <View style={styles.learningIcon}><SymbolView name={{ ios: 'bolt.fill', android: 'bolt' }} size={22} tintColor={colors.accent} /></View>
              <View style={styles.learningCopy}><Text style={styles.learningEyebrow}>LEARNING · ADAPTIVE MEMORY</Text><Text style={styles.learningTitle}>Build memory that transfers</Text></View>
              <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right' }} size={19} tintColor={colors.textSecondary} />
            </View>
            <Text style={styles.learningBody}>Turn highlights into prerequisite maps, retrieve at the right time, and prove each ability through independent practice.</Text>
            <View style={styles.learningMetrics}>
              <Text style={styles.learningMetric}><Text style={styles.learningMetricStrong}>{learningDashboard?.dueReviews ?? 0}</Text> due</Text>
              <Text style={styles.learningMetric}><Text style={styles.learningMetricStrong}>{learningDashboard?.todayMinutes ?? 0}m</Text> today</Text>
              <Text style={styles.learningMetric}><Text style={styles.learningMetricStrong}>{learningDashboard?.reliableSkills ?? 0}</Text> reliable</Text>
            </View>
          </Pressable>

          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Your world</Text><Text style={styles.sectionDetail}>Private to this phone</Text></View>
          <ScrollView accessibilityRole="tablist" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.areaTabs}>
            {LIFE_AREAS.map((area) => <AreaTab key={area.key} definition={area} count={lifeItems.filter((item) => item.area === area.key).length} selected={selectedArea === area.key} onPress={setSelectedArea} />)}
          </ScrollView>

          <View style={styles.areaPanel}>
            <View style={styles.areaHeading}>
              <View style={styles.areaHeadingCopy}><Text style={styles.areaTitle}>{definition.label}</Text><Text style={styles.areaDescription}>{definition.description}</Text></View>
              <Pressable accessibilityLabel={`Add to ${definition.label}`} accessibilityRole="button" onPress={() => openNewItem(selectedArea)} style={[styles.areaAdd, { backgroundColor: `${definition.color}24` }]}><SymbolView name={{ ios: 'plus', android: 'add' }} size={21} tintColor={definition.color} /></Pressable>
            </View>
            {selectedItems.length ? selectedItems.map((item) => <LifeRow key={item.id} item={item} onEdit={openItem} onToggle={toggleLifeItem} />) : (
              <Pressable accessibilityRole="button" onPress={() => openNewItem(selectedArea)} style={({ pressed }) => [styles.emptyArea, pressed && styles.pressed]}>
                <View style={[styles.emptyIcon, { backgroundColor: `${definition.color}24` }]}><SymbolView name={definition.icon} size={24} tintColor={definition.color} /></View>
                <View style={styles.emptyCopy}><Text style={styles.emptyTitle}>Start your {definition.label.toLowerCase()}</Text><Text style={styles.emptyBody}>Add the first thing you want to remember, plan or move forward.</Text></View>
                <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right' }} size={18} tintColor={colors.textSecondary} />
              </Pressable>
            )}
          </View>

          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Continue reading</Text><Pressable onPress={() => router.push('/books')}><Text style={styles.sectionLink}>Library</Text></Pressable></View>
          {recentlyOpenedBooks.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.booksRow}>{recentlyOpenedBooks.map((book) => <RecentBook key={book.id} book={book} onPress={openBook} />)}</ScrollView> : (
            <Pressable accessibilityRole="button" disabled={importingBook} onPress={() => { if (books.length) router.push('/books'); else void startBookImport(); }} style={({ pressed }) => [styles.readingEmpty, pressed && styles.pressed]}>
              <SymbolView name={{ ios: 'book.fill', android: 'menu_book' }} size={24} tintColor={colors.accent} />
              <View style={styles.emptyCopy}><Text style={styles.emptyTitle}>{books.length ? 'Choose your next book' : 'Bring your books with you'}</Text><Text style={styles.emptyBody}>{books.length ? `${books.length} books are waiting in your Library.` : 'Import a DRM-free EPUB or PDF to begin.'}</Text></View>
              <Text style={styles.sectionLink}>{importingBook ? 'Opening…' : books.length ? 'Browse' : 'Import'}</Text>
            </Pressable>
          )}
          <View style={styles.readingStrip}>
            <View style={styles.miniMetric}><Text style={styles.miniValue}>{formatReadingTime(readingStats.todaySeconds)}</Text><Text style={styles.miniLabel}>Today</Text></View>
            <View style={styles.miniMetric}><Text style={styles.miniValue}>{formatReadingTime(readingStats.lastSevenDaysSeconds)}</Text><Text style={styles.miniLabel}>7 days</Text></View>
            <View style={styles.miniMetric}><Text style={styles.miniValue}>{readingStats.highlightCount}</Text><Text style={styles.miniLabel}>Highlights</Text></View>
          </View>

          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Capture</Text><Text style={styles.sectionDetail}>Get it out of your head</Text></View>
          <View style={styles.captureGrid}>
            <Pressable onPress={() => setVaultComposerOpen(true)} style={({ pressed }) => [styles.captureCard, styles.captureCardAccent, pressed && styles.pressed]}><SymbolView name={{ ios: 'square.and.pencil', android: 'edit_note' }} size={25} tintColor={colors.onAction} /><Text style={[styles.captureTitle, styles.captureTitleAccent]}>Private note</Text><Text style={[styles.captureBody, styles.captureBodyAccent]}>Thought or photo</Text></Pressable>
            <Pressable onPress={() => router.push('/website')} style={({ pressed }) => [styles.captureCard, pressed && styles.pressed]}><SymbolView name={{ ios: 'doc.badge.plus', android: 'post_add' }} size={25} tintColor={colors.accent} /><Text style={styles.captureTitle}>Website draft</Text><Text style={styles.captureBody}>Open Studio</Text></Pressable>
            <Pressable disabled={importingBook} onPress={() => { void startBookImport(); }} style={({ pressed }) => [styles.captureCard, pressed && styles.pressed]}><SymbolView name={{ ios: 'book.badge.plus', android: 'library_add' }} size={25} tintColor={colors.accent} /><Text style={styles.captureTitle}>Import book</Text><Text style={styles.captureBody}>{importingBook ? 'Opening files…' : 'EPUB or PDF'}</Text></Pressable>
            <Pressable onPress={() => router.push('/website')} style={({ pressed }) => [styles.captureCard, pressed && styles.pressed]}><SymbolView name={{ ios: 'slider.horizontal.3', android: 'tune' }} size={25} tintColor={colors.accent} /><Text style={styles.captureTitle}>Studio</Text><Text style={styles.captureBody}>{publishingConnected ? 'Ready to publish' : 'Connect publishing'}</Text></Pressable>
          </View>

          <Pressable accessibilityRole="button" onPress={() => router.push('/ai')} style={({ pressed }) => [styles.sitePulse, pressed && styles.pressed]}>
            <View style={styles.liveDot} /><View style={styles.siteCopy}><Text style={styles.siteEyebrow}>YOUR PUBLIC SITE</Text><Text style={styles.siteTitle}>Open the live website</Text></View><SymbolView name={{ ios: 'arrow.up.right', android: 'north_east' }} size={20} tintColor={colors.accent} />
          </Pressable>
        </ScrollView>
      </SafeAreaView>

      <LifeItemComposer visible={lifeComposerOpen} initialArea={selectedArea} item={editingItem} onDismiss={() => setLifeComposerOpen(false)} onSave={saveLifeItem} onDelete={async (item) => { await deleteLifeItem(item.id); }} />
      <VaultComposer visible={vaultComposerOpen} onDismiss={() => setVaultComposerOpen(false)} onSave={async (input: NewVaultItem) => { await createVaultItem(input); }} />
    </>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120, gap: 20, width: '100%', maxWidth: 760, alignSelf: 'center' },
    header: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 16 }, headerCopy: { flex: 1, gap: 4 }, headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    date: { color: colors.accent, fontFamily: Fonts.extraBold, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' }, greeting: { color: colors.text, fontFamily: Fonts.bold, fontSize: 30, lineHeight: 36 },
    addButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: colors.action }, settingsButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: colors.backgroundSelected },
    hero: { overflow: 'hidden', borderRadius: 22, borderCurve: 'continuous', backgroundColor: colors.backgroundElement, borderWidth: 1, borderColor: colors.line, padding: 20, gap: 18 },
    heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 }, heroCopy: { flex: 1, gap: 7 },
    heroEyebrow: { color: colors.accent, fontFamily: Fonts.extraBold, fontSize: 9, letterSpacing: 1.1 }, heroTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 23, lineHeight: 28 }, heroBody: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18 },
    momentum: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: colors.accentSoft }, momentumValue: { color: colors.accent, fontFamily: Fonts.bold, fontSize: 23 }, momentumUnit: { color: colors.accent, fontFamily: Fonts.bold, fontSize: 10, marginTop: 8 },
    heroTrack: { height: 5, overflow: 'hidden', borderRadius: 3, backgroundColor: colors.backgroundSelected }, heroFill: { height: 5, borderRadius: 3, backgroundColor: colors.accent },
    heroMetrics: { flexDirection: 'row', alignItems: 'center' }, heroMetric: { flex: 1, gap: 2 }, heroMetricValue: { color: colors.text, fontFamily: Fonts.bold, fontSize: 18 }, heroMetricLabel: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.3 }, heroDivider: { width: 1, height: 28, backgroundColor: colors.line, marginHorizontal: 12 },
    learningCard: { borderRadius: 20, borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.backgroundElement, padding: 17, gap: 12 }, learningTop: { flexDirection: 'row', alignItems: 'center', gap: 12 }, learningIcon: { width: 43, height: 43, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft }, learningCopy: { flex: 1, minWidth: 0, gap: 3 }, learningEyebrow: { color: colors.accent, fontFamily: Fonts.extraBold, fontSize: 8, letterSpacing: .9 }, learningTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 16 }, learningBody: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 11, lineHeight: 17 }, learningMetrics: { flexDirection: 'row', gap: 17, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line }, learningMetric: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 10 }, learningMetricStrong: { color: colors.text, fontFamily: Fonts.bold },
    sectionHeader: { minHeight: 28, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginTop: 2 }, sectionTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 20 }, sectionDetail: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 11 }, sectionLink: { color: colors.accent, fontFamily: Fonts.bold, fontSize: 12 },
    areaTabs: { gap: 10, paddingRight: 20 }, areaTab: { width: 104, minHeight: 104, padding: 12, gap: 7, borderWidth: 1, borderColor: colors.line, borderRadius: 16, borderCurve: 'continuous', backgroundColor: colors.backgroundElement }, areaTabSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft }, areaIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, areaTabLabel: { color: colors.textSecondary, fontFamily: Fonts.bold, fontSize: 11 }, areaTabLabelSelected: { color: colors.text }, areaTabCount: { position: 'absolute', right: 12, top: 15, color: colors.textSecondary, fontFamily: Fonts.bold, fontSize: 11 },
    areaPanel: { borderWidth: 1, borderColor: colors.line, borderRadius: 18, borderCurve: 'continuous', backgroundColor: colors.backgroundElement, padding: 16, gap: 4 }, areaHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingBottom: 13 }, areaHeadingCopy: { flex: 1, gap: 3 }, areaTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 18 }, areaDescription: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 11, lineHeight: 16 }, areaAdd: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
    lifeRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 11, borderTopWidth: 1, borderTopColor: colors.line, paddingVertical: 12 }, lifeEdit: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 9 }, check: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.textSecondary, borderRadius: 8 }, lifeCopy: { flex: 1, minWidth: 0, gap: 5 }, lifeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, lifeTitle: { flex: 1, color: colors.text, fontFamily: Fonts.bold, fontSize: 14 }, lifeTitleComplete: { color: colors.textSecondary, textDecorationLine: 'line-through' }, lifeProgress: { fontFamily: Fonts.bold, fontSize: 10 }, lifeNote: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 11 }, progressTrack: { height: 3, overflow: 'hidden', borderRadius: 2, backgroundColor: colors.backgroundSelected }, progressFill: { height: 3, borderRadius: 2 }, targetRow: { flexDirection: 'row', alignItems: 'center', gap: 4 }, target: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 9 },
    emptyArea: { minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 14 }, emptyIcon: { width: 43, height: 43, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, emptyCopy: { flex: 1, gap: 3 }, emptyTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 14 }, emptyBody: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 11, lineHeight: 16 },
    booksRow: { gap: 12, paddingRight: 20 }, bookCard: { width: 250, minHeight: 132, flexDirection: 'row', gap: 12, padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.backgroundElement }, bookCover: { width: 72, height: 108, aspectRatio: undefined, borderRadius: 6 }, bookCopy: { flex: 1, minWidth: 0, justifyContent: 'center', gap: 6 }, bookTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 14, lineHeight: 18 }, bookAuthor: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 10 }, bookProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 3 }, bookProgressTrack: { flex: 1, height: 3, overflow: 'hidden', borderRadius: 2, backgroundColor: colors.backgroundSelected }, bookProgressFill: { height: 3, backgroundColor: colors.accent }, bookProgressText: { color: colors.textSecondary, fontFamily: Fonts.bold, fontSize: 9 },
    readingEmpty: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 13, borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.backgroundElement, padding: 15 }, readingStrip: { flexDirection: 'row', paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line }, miniMetric: { flex: 1, alignItems: 'center', gap: 2 }, miniValue: { color: colors.text, fontFamily: Fonts.bold, fontSize: 14 }, miniLabel: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 9, textTransform: 'uppercase' },
    captureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, captureCard: { width: '48%', flexGrow: 1, minHeight: 112, justifyContent: 'space-between', padding: 15, borderWidth: 1, borderColor: colors.line, borderRadius: 16, borderCurve: 'continuous', backgroundColor: colors.backgroundElement }, captureCardAccent: { borderColor: colors.action, backgroundColor: colors.action }, captureTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 14, marginTop: 9 }, captureTitleAccent: { color: colors.onAction }, captureBody: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 10 }, captureBodyAccent: { color: colors.onAction, opacity: 0.7 },
    sitePulse: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.backgroundElement }, liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.success }, siteCopy: { flex: 1, gap: 2 }, siteEyebrow: { color: colors.textSecondary, fontFamily: Fonts.extraBold, fontSize: 8, letterSpacing: 0.8 }, siteTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 15 },
    pressed: { opacity: 0.72, transform: [{ scale: 0.988 }] },
  });
}
