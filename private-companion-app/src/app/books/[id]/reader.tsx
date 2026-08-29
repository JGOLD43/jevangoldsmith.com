import { Reader, ReaderProvider, useReader, type Annotation, type Location, type Theme } from '@epubjs-react-native/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Pdf from 'react-native-pdf';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { Fonts, type AppColors } from '@/constants/theme';
import type { Book, BookAnnotation } from '@/domain/models';
import { useTheme } from '@/hooks/use-theme';
import { useReadingSession } from '@/hooks/use-reading-session';
import { useApp } from '@/state/app-context';
import { useBooks } from '@/state/books-context';
import { prepareBookForReading, removePreparedBook } from '@/storage/book-files';
import { useEpubFileSystem } from '@/storage/epub-file-system';
import { isEpubCfi } from '@/services/book-matching';

type Selection = { text: string; locator: string };

function AnnotationList({ annotations, onOpen }: { annotations: BookAnnotation[]; onOpen?: (locator: string) => void }) {
  const colors = useTheme();
  const styles = stylesForTools(colors);
  return <FlatList data={annotations.filter((item) => item.kind !== 'bookmark')} keyExtractor={(item) => item.id}
    renderItem={({ item }) => <Pressable disabled={!onOpen || !isEpubCfi(item.locator)} style={styles.toolRow}
      onPress={() => onOpen?.(item.locator)}>
      <Text style={styles.toolTitle}>{item.selectedText || item.note || 'Saved note'}</Text>
      {item.note && item.selectedText ? <Text style={styles.annotationNote}>{item.note}</Text> : null}
      <Text style={styles.annotationLocation}>{item.locator || 'Imported highlight'}</Text>
    </Pressable>}
    ListEmptyComponent={<Text style={styles.empty}>No highlights or notes saved for this book.</Text>} />;
}

function AnnotationComposer({ selection, visible, onDismiss, onSave }: {
  selection: Selection | null; visible: boolean; onDismiss: () => void;
  onSave: (note: string) => Promise<void>;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [note, setNote] = useState('');
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.modalBackdrop}>
        <View style={styles.noteModal}>
          <Text style={styles.modalTitle}>Private note</Text>
          {selection?.text ? <Text numberOfLines={5} style={styles.selectionQuote}>“{selection.text}”</Text> : null}
          <TextInput value={note} onChangeText={setNote} multiline autoFocus placeholder="Add your thought…"
            placeholderTextColor={colors.textSecondary} style={styles.noteInput} />
          <View style={styles.modalActions}><Button label="Cancel" variant="secondary" style={styles.flex} onPress={onDismiss} /><Button label="Save privately" style={styles.flex} onPress={async () => { await onSave(note); setNote(''); onDismiss(); }} /></View>
        </View>
      </View>
    </Modal>
  );
}

function ReaderChrome({ title, progress, onBack, onPrevious, onNext, onTools, toolsLabel = 'Tools', children }: {
  title: string; progress: number; onBack: () => void; onPrevious?: () => void; onNext?: () => void;
  onTools: () => void; toolsLabel?: string; children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [visible, setVisible] = useState(true);
  return (
    <View style={styles.readerRoot}>
      {children}
      <Pressable accessibilityLabel="Toggle reading controls" onPress={() => setVisible((current) => !current)} style={styles.centerTap} />
      {visible ? <>
        <View style={[styles.readerTop, { paddingTop: insets.top + 8 }]}>
          <Button label="Back" variant="quiet" onPress={onBack} />
          <Text numberOfLines={1} style={styles.readerTitle}>{title}</Text>
          <Button label={toolsLabel} variant="quiet" onPress={onTools} />
        </View>
        <View style={[styles.readerBottom, { paddingBottom: insets.bottom + 10 }]}>
          <Button label="Previous" variant="quiet" disabled={!onPrevious} onPress={onPrevious} />
          <View style={styles.readerProgress}><View style={styles.readerProgressTrack}><View style={[styles.readerProgressBar, { width: `${Math.max(0, Math.min(1, progress)) * 100}%` }]} /></View><Text style={styles.readerPercent}>{Math.round(progress * 100)}%</Text></View>
          <Button label="Next" variant="quiet" disabled={!onNext} onPress={onNext} />
        </View>
      </> : null}
    </View>
  );
}

function EpubContent({ book, uri, annotations }: { book: Book; uri: string; annotations: BookAnnotation[] }) {
  const router = useRouter();
  const colors = useTheme();
  const { addAnnotation: addStoredAnnotation, editBook, savePosition } = useBooks();
  const { sendAiMessage } = useApp();
  const reader = useReader();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [toolView, setToolView] = useState<'contents' | 'highlights'>('contents');
  const [searchQuery, setSearchQuery] = useState('');
  const [fontSize, setFontSize] = useState(100);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialAnnotations = useMemo<Annotation[]>(() => annotations.filter((item) => item.kind === 'highlight' && isEpubCfi(item.locator)).map((item) => ({
    type: 'highlight', cfiRange: item.locator, cfiRangeText: item.selectedText, sectionIndex: 0,
    data: { id: item.id }, styles: { color: item.color, opacity: 0.35 },
  })), [annotations]);
  const readerTheme = useMemo<Theme>(() => ({
    body: { color: colors.text, background: colors.background, 'font-family': 'serif', 'line-height': '1.55', padding: '0 4%' },
    p: { color: colors.text }, a: { color: colors.accent },
  }), [colors]);

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const persistHighlight = async (note = '') => {
    if (!selection) return;
    const saved = await addStoredAnnotation({ bookId: book.id, kind: note ? 'note' : 'highlight', locator: selection.locator,
      selectedText: selection.text, note, color: '#FFD54F' });
    reader.addAnnotation('highlight', selection.locator, { id: saved.id }, { color: '#FFD54F', opacity: 0.35 });
    reader.removeSelection();
    setSelection(null);
  };

  const bookmark = async () => {
    const location = reader.currentLocation;
    if (!location) return;
    await addStoredAnnotation({ bookId: book.id, kind: 'bookmark', locator: location.start.cfi,
      selectedText: reader.section?.label ?? '', note: '', color: colors.accent });
    Alert.alert('Bookmark saved', 'This bookmark remains private on your phone.');
  };

  const changeFont = (next: number) => {
    const value = Math.max(70, Math.min(180, next));
    setFontSize(value);
    reader.changeFontSize(`${value}%`);
  };

  const toolItems = useMemo(() => searchQuery.trim()
    ? reader.searchResults.results.map((item, index) => ({ key: `${item.cfi}-${index}`, locator: item.cfi, label: item.excerpt }))
    : reader.toc.map((item, index) => ({ key: `${item.href}-${index}`, locator: item.href, label: item.label })),
  [reader.searchResults.results, reader.toc, searchQuery]);

  return (
    <ReaderChrome title={book.title} progress={reader.progress || book.progress} onBack={() => router.back()}
      onPrevious={() => reader.goPrevious()} onNext={() => reader.goNext()} onTools={() => setToolsOpen(true)}>
      <Reader
        src={uri}
        fileSystem={useEpubFileSystem}
        initialLocation={book.locator ?? undefined}
        initialAnnotations={initialAnnotations}
        defaultTheme={readerTheme}
        flow="paginated"
        manager="default"
        spread="none"
        enableSwipe
        enableSelection
        allowScriptedContent={false}
        allowPopups={false}
        onSelected={(text, locator) => setSelection({ text, locator })}
        onReady={() => {
          const meta = reader.getMeta();
          if (meta.title || meta.author || meta.description) {
            void editBook(book.id, {
              title: meta.title || book.title,
              author: meta.author || book.author,
              summary: book.summary || meta.description || '',
            });
          }
        }}
        onLocationChange={(_total, location: Location, progress) => {
          if (saveTimer.current) clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => { void savePosition(book.id, { progress, locator: location.start.cfi }); }, 350);
        }}
        onPressExternalLink={(url) => Alert.alert('Open external link?', url, [{ text: 'Cancel', style: 'cancel' }, { text: 'Open', onPress: () => { void Linking.openURL(url); } }])}
        onDisplayError={(reason) => Alert.alert('Could not display EPUB', reason)}
      />
      {selection ? <View style={stylesForSelection(colors).selectionBar}>
        <Button label="Highlight" variant="quiet" onPress={() => { void persistHighlight(); }} />
        <Button label="Add note" variant="quiet" onPress={() => setNoteOpen(true)} />
        <Button label="Ask AI" variant="quiet" onPress={() => Alert.alert('Send this exact excerpt to AI?', selection.text, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Send excerpt', onPress: async () => { await sendAiMessage(`Help me understand this selected book excerpt. Do not assume access to the rest of the book.\n\n${selection.text}`); setSelection(null); Alert.alert('Sent to AI', 'The response is in the AI tab. No other book or private note was included.'); } },
        ])} />
      </View> : null}
      <AnnotationComposer selection={selection} visible={noteOpen} onDismiss={() => setNoteOpen(false)} onSave={persistHighlight} />
      <Modal visible={toolsOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setToolsOpen(false)}>
        <SafeAreaView style={stylesForTools(colors).safe}>
          <View style={stylesForTools(colors).header}><Text style={stylesForTools(colors).title}>Reading tools</Text><Pressable onPress={() => setToolsOpen(false)}><Text style={stylesForTools(colors).close}>Done</Text></Pressable></View>
          <View style={stylesForTools(colors).controls}>
            <Button label="A−" variant="secondary" onPress={() => changeFont(fontSize - 10)} />
            <Text style={stylesForTools(colors).fontValue}>{fontSize}%</Text>
            <Button label="A+" variant="secondary" onPress={() => changeFont(fontSize + 10)} />
            <Button label={reader.flow === 'paginated' ? 'Scroll' : 'Pages'} variant="quiet" onPress={() => reader.changeFlow(reader.flow === 'paginated' ? 'scrolled-doc' : 'paginated')} />
            <Button label="Bookmark" variant="quiet" onPress={() => { void bookmark(); }} />
          </View>
          <View style={stylesForTools(colors).switcher}>
            <Button label="Contents" variant={toolView === 'contents' ? 'primary' : 'secondary'} onPress={() => setToolView('contents')} />
            <Button label={`Highlights & notes (${annotations.filter((item) => item.kind !== 'bookmark').length})`}
              variant={toolView === 'highlights' ? 'primary' : 'secondary'} onPress={() => setToolView('highlights')} />
          </View>
          {toolView === 'highlights' ? <AnnotationList annotations={annotations} onOpen={(locator) => {
            reader.goToLocation(locator); setToolsOpen(false);
          }} /> : <>
            <TextInput value={searchQuery} onChangeText={(value) => { setSearchQuery(value); if (value.trim()) reader.search(value.trim()); else reader.clearSearchResults(); }}
              placeholder="Search inside this book" placeholderTextColor={colors.textSecondary} style={stylesForTools(colors).search} />
            <Text style={stylesForTools(colors).sectionLabel}>{searchQuery.trim() ? 'Search results' : 'Table of contents'}</Text>
            <FlatList data={toolItems} keyExtractor={(item) => item.key}
              renderItem={({ item }) => <Pressable style={stylesForTools(colors).toolRow} onPress={() => {
                reader.goToLocation(item.locator); setToolsOpen(false);
              }}><Text style={stylesForTools(colors).toolTitle}>{item.label}</Text></Pressable>}
              ListEmptyComponent={<Text style={stylesForTools(colors).empty}>Nothing found.</Text>} />
          </>}
        </SafeAreaView>
      </Modal>
    </ReaderChrome>
  );
}

function PdfContent({ book, uri, annotations }: { book: Book; uri: string; annotations: BookAnnotation[] }) {
  const router = useRouter();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { addAnnotation, savePosition } = useBooks();
  const [page, setPage] = useState(book.currentPage ?? 1);
  const [pages, setPages] = useState(book.totalPages ?? 1);
  const [toolsOpen, setToolsOpen] = useState(false);
  const progress = pages > 0 ? page / pages : 0;

  const bookmark = async () => {
    await addAnnotation({ bookId: book.id, kind: 'bookmark', locator: `page:${page}`, selectedText: `Page ${page}`, note: '', color: colors.accent });
    Alert.alert('Bookmark saved', `Page ${page} was saved privately.`);
  };
  return (
    <ReaderChrome title={book.title} progress={progress} onBack={() => router.back()} onTools={() => setToolsOpen(true)}>
      <Pdf source={{ uri, cache: false }} page={book.currentPage ?? 1} style={styles.pdf} horizontal enablePaging
        fitPolicy={2} enableAnnotationRendering enableDoubleTapZoom trustAllCerts={false}
        onLoadComplete={(count) => setPages(count)}
        onPageChanged={(nextPage, count) => { setPage(nextPage); setPages(count); void savePosition(book.id, { progress: nextPage / count, currentPage: nextPage, totalPages: count, locator: `page:${nextPage}` }); }}
        onError={(error) => Alert.alert('Could not display PDF', error.message)} />
      <Modal visible={toolsOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setToolsOpen(false)}>
        <SafeAreaView style={stylesForTools(colors).safe}>
          <View style={stylesForTools(colors).header}><Text style={stylesForTools(colors).title}>Highlights & notes</Text><Pressable onPress={() => setToolsOpen(false)}><Text style={stylesForTools(colors).close}>Done</Text></Pressable></View>
          <View style={stylesForTools(colors).controls}><Button label={`Bookmark page ${page}`} onPress={() => { void bookmark(); }} /></View>
          <AnnotationList annotations={annotations} />
        </SafeAreaView>
      </Modal>
    </ReaderChrome>
  );
}

export default function BookReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { books, annotationsFor, refreshReadingStats } = useBooks();
  const book = books.find((item) => item.id === id);
  const [uri, setUri] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<BookAnnotation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useReadingSession(book?.id ?? null, Boolean(uri && book && !error), () => { void refreshReadingStats(); });

  useEffect(() => {
    let active = true;
    let prepared: string | null = null;
    if (!book?.encryptedFileUri) { setError('This book does not have an EPUB or PDF attached.'); return; }
    void Promise.all([prepareBookForReading(book.encryptedFileUri, book.format), annotationsFor(book.id)])
      .then(([nextUri, nextAnnotations]) => { prepared = nextUri; if (active) { setUri(nextUri); setAnnotations(nextAnnotations); } else removePreparedBook(nextUri); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not unlock this book.'); });
    return () => { active = false; removePreparedBook(prepared); };
  }, [annotationsFor, book?.encryptedFileUri, book?.format, book?.id]);

  if (!book || error) return <SafeAreaView style={styles.errorScreen}><Text style={styles.errorTitle}>Reader unavailable</Text><Text style={styles.errorBody}>{error ?? 'Book not found.'}</Text><Button label="Back" onPress={() => router.back()} /></SafeAreaView>;
  if (!uri) return <View style={styles.loading}><ActivityIndicator color={colors.accent} /><Text style={styles.loadingText}>Unlocking book locally…</Text></View>;
  if (book.format === 'pdf') return <PdfContent book={book} uri={uri} annotations={annotations} />;
  return <ReaderProvider><EpubContent book={book} uri={uri} annotations={annotations} /></ReaderProvider>;
}

function stylesForSelection(colors: AppColors) {
  return StyleSheet.create({ selectionBar: { position: 'absolute', left: 12, right: 12, bottom: 98, flexDirection: 'row', justifyContent: 'center', gap: 7, padding: 8, borderRadius: 10, borderCurve: 'continuous', backgroundColor: colors.backgroundElement, borderWidth: 1, borderColor: colors.line } });
}

function stylesForTools(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.line },
    title: { color: colors.text, fontFamily: Fonts.bold, fontSize: 25 },
    close: { color: colors.accent, fontFamily: Fonts.bold, fontSize: 15 },
    controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: 16 },
    switcher: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
    fontValue: { color: colors.text, fontFamily: Fonts.bold, fontSize: 13 },
    search: { marginHorizontal: 16, height: 50, borderRadius: 8, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.backgroundElement, color: colors.text, paddingHorizontal: 14, fontFamily: Fonts.sans, fontSize: 15 },
    sectionLabel: { color: colors.accent, fontFamily: Fonts.extraBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, padding: 16, paddingBottom: 6 },
    toolRow: { paddingHorizontal: 18, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.line },
    toolTitle: { color: colors.text, fontFamily: Fonts.semibold, fontSize: 15, lineHeight: 21 },
    annotationNote: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, marginTop: 6 },
    annotationLocation: { color: colors.accent, fontFamily: Fonts.bold, fontSize: 11, marginTop: 7 },
    empty: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 14, padding: 24, textAlign: 'center' },
  });
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    readerRoot: { flex: 1, backgroundColor: colors.background }, centerTap: { position: 'absolute', top: '28%', bottom: '28%', left: '34%', right: '34%' },
    readerTop: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingBottom: 10, backgroundColor: colors.navBackground, borderBottomWidth: 1, borderBottomColor: colors.line },
    readerTitle: { flex: 1, color: colors.text, fontFamily: Fonts.bold, fontSize: 14, textAlign: 'center' },
    readerBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 10, backgroundColor: colors.navBackground, borderTopWidth: 1, borderTopColor: colors.line },
    readerProgress: { flex: 1, alignItems: 'center', gap: 5 }, readerProgressTrack: { width: '100%', height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: colors.line }, readerProgressBar: { height: 4, backgroundColor: colors.accent }, readerPercent: { color: colors.textSecondary, fontFamily: Fonts.bold, fontSize: 10 },
    pdf: { flex: 1, width: '100%', height: '100%', backgroundColor: colors.background }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.background }, loadingText: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 14 },
    errorScreen: { flex: 1, padding: 30, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: colors.background }, errorTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 25 }, errorBody: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22, textAlign: 'center' },
    modalBackdrop: { flex: 1, justifyContent: 'flex-end', padding: 16, backgroundColor: 'rgba(0,0,0,0.4)' }, noteModal: { padding: 18, gap: 12, borderRadius: 12, borderCurve: 'continuous', backgroundColor: colors.backgroundElement }, modalTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 21 }, selectionQuote: { color: colors.textSecondary, fontFamily: Fonts.medium, fontSize: 14, lineHeight: 21, fontStyle: 'italic' }, noteInput: { minHeight: 110, padding: 13, borderRadius: 8, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.background, color: colors.text, fontFamily: Fonts.sans, fontSize: 15, textAlignVertical: 'top' }, modalActions: { flexDirection: 'row', gap: 8 }, flex: { flex: 1 },
  });
}
