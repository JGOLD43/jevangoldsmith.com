import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookCover } from '@/components/book-cover';
import { Button, Card, Chip, SectionHeading } from '@/components/ui';
import { Fonts, type AppColors } from '@/constants/theme';
import type { Book, BookAnnotation, BookReadingStats, PublicBookFields } from '@/domain/models';
import { createBookPublishManifest } from '@/domain/privacy';
import { useTheme } from '@/hooks/use-theme';
import { queueAndAttemptPublication } from '@/services/publication-outbox';
import { toPublicBookFields } from '@/services/public-books';
import { useBooks } from '@/state/books-context';
import { formatReadingTime, getBookReadingStats } from '@/storage/reading-analytics';

function Field({ label, value, onChangeText, multiline = false, keyboardType }: {
  label: string; value: string; onChangeText: (value: string) => void; multiline?: boolean;
  keyboardType?: 'default' | 'number-pad';
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} multiline={multiline} keyboardType={keyboardType}
        textAlignVertical={multiline ? 'top' : 'center'} placeholderTextColor={colors.textSecondary}
        style={[styles.input, multiline && styles.textArea]} />
    </View>
  );
}

function BookEditor({ book, visible, onDismiss, onSave }: {
  book: Book; visible: boolean; onDismiss: () => void; onSave: (fields: Partial<Book>) => Promise<void>;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [isbn, setIsbn] = useState(book.isbn);
  const [year, setYear] = useState(book.year);
  const [category, setCategory] = useState(book.category);
  const [summary, setSummary] = useState(book.summary);
  const [review, setReview] = useState(book.review);
  const [rating, setRating] = useState(String(book.rating));
  const [reReads, setReReads] = useState(String(book.reReads));
  const [finished, setFinished] = useState(book.readingStatus === 'finished');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTitle(book.title); setAuthor(book.author); setIsbn(book.isbn); setYear(book.year); setCategory(book.category);
    setSummary(book.summary); setReview(book.review); setRating(String(book.rating)); setReReads(String(book.reReads));
    setFinished(book.readingStatus === 'finished');
  }, [book, visible]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave({ title, author, isbn, year, category, summary, review,
        rating: Math.max(0, Math.min(5, Number(rating) || 0)), reReads: Math.max(0, Number(reReads) || 0),
        readingStatus: finished ? 'finished' : book.progress > 0 ? 'reading' : 'unread' });
      onDismiss();
    } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onDismiss}>
      <SafeAreaView style={styles.modalSafe}>
        <View style={styles.modalHeader}><Text style={styles.modalTitle}>Book details</Text><Pressable onPress={onDismiss}><Text style={styles.close}>Close</Text></Pressable></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
          <Field label="Title" value={title} onChangeText={setTitle} />
          <Field label="Author" value={author} onChangeText={setAuthor} />
          <View style={styles.twoFields}><View style={styles.flex}><Field label="ISBN" value={isbn} onChangeText={setIsbn} /></View><View style={styles.smallField}><Field label="Year" value={year} onChangeText={setYear} /></View></View>
          <Field label="Category" value={category} onChangeText={setCategory} />
          <View style={styles.twoFields}><View style={styles.flex}><Field label="Rating (0–5)" value={rating} onChangeText={setRating} keyboardType="number-pad" /></View><View style={styles.flex}><Field label="Re-reads" value={reReads} onChangeText={setReReads} keyboardType="number-pad" /></View></View>
          <Field label="Public summary" value={summary} onChangeText={setSummary} multiline />
          <Field label="Public review" value={review} onChangeText={setReview} multiline />
          <View style={styles.switchRow}><View style={styles.flex}><Text style={styles.label}>Finished</Text><Text style={styles.helper}>This may be published, but private progress never is.</Text></View><Switch value={finished} onValueChange={setFinished} trackColor={{ false: colors.line, true: colors.action }} /></View>
          <Button label="Save privately" busy={saving} disabled={!title.trim() || saving} onPress={save} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function PublicPreview({ fields, visible, busy, onDismiss, onPublish }: {
  fields: PublicBookFields; visible: boolean; busy: boolean; onDismiss: () => void; onPublish: () => void;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onDismiss}>
      <SafeAreaView style={styles.modalSafe}>
        <View style={styles.modalHeader}><Text style={styles.modalTitle}>Public preview</Text><Pressable onPress={onDismiss}><Text style={styles.close}>Cancel</Text></Pressable></View>
        <ScrollView contentContainerStyle={styles.form}>
          <Card style={styles.publicWarning}><Text style={styles.warningTitle}>Only these fields will leave the phone</Text><Text style={styles.helper}>No book file, reading position, history, collection, private note, highlight, or attachment is included.</Text></Card>
          <Text style={styles.previewTitle}>{fields.title}</Text>
          <Text style={styles.previewAuthor}>{fields.author || 'Unknown author'}</Text>
          <Text style={styles.previewMeta}>{[fields.year, fields.category, fields.isbn ? `ISBN ${fields.isbn}` : '', `${fields.rating}/5`].filter(Boolean).join(' · ')}</Text>
          {fields.summary ? <Text style={styles.previewBody}>{fields.summary}</Text> : null}
          {fields.review ? <Text style={styles.previewBody}>{fields.review}</Text> : null}
          <Button label="Publish these fields" busy={busy} disabled={busy} onPress={onPublish} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { books, collections, editBook, importBook, deleteBook, annotationsFor, deleteAnnotation,
    collectionIdsFor, toggleCollection, createCollection } = useBooks();
  const book = books.find((item) => item.id === id);
  const [annotations, setAnnotations] = useState<BookAnnotation[]>([]);
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [newCollection, setNewCollection] = useState('');
  const [readingStats, setReadingStats] = useState<BookReadingStats | null>(null);
  const listRef = useRef<FlatList<BookAnnotation>>(null);

  useEffect(() => {
    if (!id) return;
    void Promise.all([annotationsFor(id), collectionIdsFor(id), getBookReadingStats(id)]).then(([nextAnnotations, nextIds, nextStats]) => {
      setAnnotations(nextAnnotations); setCollectionIds(nextIds); setReadingStats(nextStats);
    });
  }, [annotationsFor, collectionIdsFor, id, book?.updatedAt]);

  if (!book) {
    return <SafeAreaView style={styles.safe}><Text style={styles.empty}>Book not found.</Text></SafeAreaView>;
  }

  const attach = async () => {
    try { await importBook(book.id); } catch (cause) { Alert.alert('Could not attach file', cause instanceof Error ? cause.message : 'Please try again.'); }
  };

  const publish = async () => {
    setPublishing(true);
    try {
      const job = await queueAndAttemptPublication(
        createBookPublishManifest(book.id, book.publicId, toPublicBookFields(book)),
        book.id,
      );
      await editBook(book.id, { isPublic: job.status === 'submitted' });
      setPreviewOpen(false);
      if (job.status === 'submitted') {
        Alert.alert('Website update submitted', 'The approved book fields were committed and the website will deploy them automatically. The file and reading activity stayed on this phone.');
      } else if (job.status === 'queued') {
        Alert.alert('Queued for the website', 'This safe public copy will submit automatically after publishing is connected. Nothing private was included.');
      } else {
        Alert.alert('Saved, but submission failed', `${job.error}\n\nThe safe public copy remains queued for retry.`);
      }
    } catch (cause) {
      Alert.alert('Could not queue website update', cause instanceof Error ? cause.message : 'Please try again.');
    } finally { setPublishing(false); }
  };

  const header = (
    <View style={styles.content}>
      <View style={styles.topBar}><Button label="Back" variant="quiet" onPress={() => router.back()} /><Text style={styles.privateLabel}>PRIVATE LIBRARY</Text><Button label="Edit" variant="secondary" onPress={() => setEditorOpen(true)} /></View>
      <View style={styles.hero}>
        <BookCover title={book.title} author={book.author} uri={book.coverUri} style={styles.cover} />
        <View style={styles.heroCopy}>
          <Text style={styles.title}>{book.title}</Text>
          <Text style={styles.author}>{book.author || 'Unknown author'}</Text>
          <Text style={styles.meta}>{[book.year, book.category, book.rating ? `${book.rating}/5` : ''].filter(Boolean).join(' · ')}</Text>
          {book.encryptedFileUri ? <Button label={book.progress > 0 ? 'Continue reading' : 'Start reading'} onPress={() => router.push(`/books/${book.id}/reader`)} /> : <Button label="Attach EPUB or PDF" onPress={attach} />}
          <Text style={styles.localNote}>{book.encryptedFileUri ? `${book.format.toUpperCase()} encrypted locally · ${Math.round(book.progress * 100)}% read` : 'Website metadata only · no readable file attached'}</Text>
        </View>
      </View>
      {book.summary ? <Text style={styles.body}>{book.summary}</Text> : null}
      {book.review ? <Card><Text style={styles.cardLabel}>YOUR PUBLIC REVIEW</Text><Text style={styles.body}>{book.review}</Text></Card> : null}
      <SectionHeading title="Reading insights" detail="Private on this phone" />
      <View style={styles.insightGrid}>
        <Insight value={formatReadingTime(readingStats?.totalSeconds ?? 0)} label="total time" />
        <Insight value={formatReadingTime(readingStats?.todaySeconds ?? 0)} label="today" />
        <Insight value={String(readingStats?.daysRead ?? 0)} label="days read" />
        <Insight value={`${readingStats?.currentStreak ?? 0} days`} label="current streak" />
        <Insight value={String(readingStats?.sessionCount ?? 0)} label="sessions" />
        <Insight value={String((readingStats?.highlightCount ?? 0) + (readingStats?.noteCount ?? 0))} label="highlights & notes" />
      </View>
      <SectionHeading title="Highlights & notes" detail={`${annotations.length} private`} />
      {annotations.length ? <>
        {annotations.slice(0, 2).map((item) => <Card key={item.id} style={styles.annotationPreview}>
          <Text style={styles.cardLabel}>{item.kind} · {item.locator || 'imported'} · private</Text>
          <Text numberOfLines={4} style={styles.quote}>“{item.selectedText || item.note}”</Text>
        </Card>)}
        {annotations.length > 2 ? <Button label={`View all ${annotations.length} highlights & notes`}
          variant="secondary" onPress={() => listRef.current?.scrollToIndex({ index: 0, animated: true, viewPosition: 0 })} /> : null}
      </> : <Text style={styles.emptyCompact}>No highlights or notes saved for this book.</Text>}
      <SectionHeading title="Collections" detail="Private on this phone" />
      <View style={styles.chips}>{collections.map((collection) => <Chip key={collection.id} label={collection.name} selected={collectionIds.includes(collection.id)} onPress={async () => {
        const included = !collectionIds.includes(collection.id); await toggleCollection(book.id, collection.id, included);
        setCollectionIds((current) => included ? [...current, collection.id] : current.filter((item) => item !== collection.id));
      }} />)}</View>
      <View style={styles.collectionInput}><TextInput value={newCollection} onChangeText={setNewCollection} placeholder="New collection" placeholderTextColor={colors.textSecondary} style={[styles.input, styles.flex]} /><Button label="Add" variant="quiet" disabled={!newCollection.trim()} onPress={async () => { const collection = await createCollection(newCollection); await toggleCollection(book.id, collection.id, true); setCollectionIds((current) => [...new Set([...current, collection.id])]); setNewCollection(''); }} /></View>
      <SectionHeading title="Website" detail={book.isPublic ? 'Currently public' : 'Private only'} />
      <Card style={styles.websiteCard}><Text style={styles.body}>Preview the exact metadata and review that will be sent. Once approved, JGOLD submits it automatically or safely queues it until publishing is connected. The book file, progress, highlights and notes cannot enter this path.</Text><Button label={book.isPublic ? 'Update website listing' : 'Show on website'} onPress={() => setPreviewOpen(true)} /></Card>
      {annotations.length ? <SectionHeading title="All highlights & notes" detail={`${annotations.length} private`} /> : null}
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <FlatList ref={listRef} data={annotations} keyExtractor={(item) => item.id} ListHeaderComponent={header}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <Card style={styles.annotation}><Text style={styles.cardLabel}>{item.kind} · private</Text>{item.selectedText ? <Text style={styles.quote}>“{item.selectedText}”</Text> : null}{item.note ? <Text style={styles.body}>{item.note}</Text> : null}<Button label="Delete" variant="danger" onPress={() => Alert.alert('Delete private note?', 'This cannot be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await deleteAnnotation(item.id); setAnnotations((current) => current.filter((entry) => entry.id !== item.id)); } }])} /></Card>}
        ListEmptyComponent={<Text style={styles.empty}>Highlights, bookmarks and private notes from the reader will appear here.</Text>}
        ListFooterComponent={<Button label="Delete book" variant="danger" onPress={() => Alert.alert('Delete book?', 'The encrypted file, progress, notes and highlights will be removed from this phone. The website is unchanged.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await deleteBook(book.id); router.back(); } }])} />}
      />
      <BookEditor book={book} visible={editorOpen} onDismiss={() => setEditorOpen(false)} onSave={async (fields) => { await editBook(book.id, fields); }} />
      <PublicPreview fields={toPublicBookFields(book)} visible={previewOpen} busy={publishing} onDismiss={() => setPreviewOpen(false)} onPublish={publish} />
    </SafeAreaView>
  );
}

function Insight({ value, label }: { value: string; label: string }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={styles.insight}><Text style={styles.insightValue}>{value}</Text><Text style={styles.insightLabel}>{label}</Text></View>;
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background }, modalSafe: { flex: 1, backgroundColor: colors.background },
    listContent: { padding: 20, paddingBottom: 120, gap: 12, width: '100%', maxWidth: 760, alignSelf: 'center' }, content: { gap: 18 },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, privateLabel: { color: colors.accent, fontFamily: Fonts.extraBold, fontSize: 10, letterSpacing: 1 },
    hero: { flexDirection: 'row', gap: 18, alignItems: 'flex-start' }, cover: { width: 142 }, heroCopy: { flex: 1, gap: 8 },
    insightGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    insight: { width: '31%', flexGrow: 1, minWidth: 96, padding: 12, gap: 3, borderRadius: 8, backgroundColor: colors.backgroundSelected },
    insightValue: { color: colors.action, fontFamily: Fonts.bold, fontSize: 20 },
    insightLabel: { color: colors.textSecondary, fontFamily: Fonts.semibold, fontSize: 10 },
    title: { color: colors.text, fontFamily: Fonts.bold, fontSize: 27, lineHeight: 32 }, author: { color: colors.textSecondary, fontFamily: Fonts.semibold, fontSize: 16 },
    meta: { color: colors.accent, fontFamily: Fonts.bold, fontSize: 12 }, localNote: { color: colors.success, fontFamily: Fonts.semibold, fontSize: 11, lineHeight: 16 },
    body: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 15, lineHeight: 23 }, cardLabel: { color: colors.accent, fontFamily: Fonts.extraBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, collectionInput: { flexDirection: 'row', gap: 8 }, flex: { flex: 1 },
    input: { minHeight: 48, backgroundColor: colors.backgroundElement, borderColor: colors.line, borderWidth: 1, borderRadius: 8, borderCurve: 'continuous', paddingHorizontal: 13, color: colors.text, fontFamily: Fonts.sans, fontSize: 15 },
    websiteCard: { backgroundColor: colors.accentSoft }, annotation: { marginHorizontal: 0 }, annotationPreview: { marginHorizontal: 0, backgroundColor: colors.backgroundSelected }, quote: { color: colors.text, fontFamily: Fonts.medium, fontSize: 15, lineHeight: 23, fontStyle: 'italic' },
    empty: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21, paddingVertical: 24, textAlign: 'center' },
    emptyCompact: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.line }, modalTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 25 }, close: { color: colors.accent, fontFamily: Fonts.bold, fontSize: 15 },
    form: { padding: 20, paddingBottom: 60, gap: 14 }, field: { gap: 6 }, label: { color: colors.text, fontFamily: Fonts.bold, fontSize: 12 }, textArea: { minHeight: 120, paddingTop: 13 }, twoFields: { flexDirection: 'row', gap: 10 }, smallField: { width: 92 },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: 14 }, helper: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18 },
    publicWarning: { backgroundColor: colors.accentSoft }, warningTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 16 }, previewTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 32 }, previewAuthor: { color: colors.textSecondary, fontFamily: Fonts.semibold, fontSize: 18 }, previewMeta: { color: colors.accent, fontFamily: Fonts.bold, fontSize: 12 }, previewBody: { color: colors.text, fontFamily: Fonts.sans, fontSize: 16, lineHeight: 25 },
  });
}
