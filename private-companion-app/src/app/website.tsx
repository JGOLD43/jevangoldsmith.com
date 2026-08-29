import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DraftComposer } from '@/components/composers';
import { Fonts, type AppColors } from '@/constants/theme';
import type { DraftType, NewPublicDraft, PublicationJob, PublicDraft } from '@/domain/models';
import { canPublish, createPublishManifest } from '@/domain/privacy';
import { useTheme } from '@/hooks/use-theme';
import { queueAndAttemptPublication, retryPendingPublications } from '@/services/publication-outbox';
import { hasPublishingConnection } from '@/services/publishing';
import { collectionLabels, draftFromSiteItem, loadSiteCollection, type SiteCollection, type SiteItem } from '@/services/public-site';
import { useApp } from '@/state/app-context';

type CreateDefinition = { type: DraftType; label: string; detail: string; icon: SymbolViewProps['name'] };

const CREATE_TYPES: CreateDefinition[] = [
  { type: 'essay', label: 'Essay', detail: 'Tracked writing', icon: { ios: 'doc.text.fill', android: 'article' } },
  { type: 'adventure', label: 'Trip', detail: 'Travel story', icon: { ios: 'airplane', android: 'flight' } },
  { type: 'project', label: 'Project', detail: 'Work update', icon: { ios: 'hammer.fill', android: 'construction' } },
  { type: 'product', label: 'Shelf item', detail: 'Recommendation', icon: { ios: 'shippingbox.fill', android: 'inventory_2' } },
  { type: 'challenge', label: 'Challenge', detail: 'Experiment', icon: { ios: 'flag.fill', android: 'flag' } },
  { type: 'now', label: 'Now update', detail: 'Current focus', icon: { ios: 'clock.fill', android: 'schedule' } },
];

const LIVE_COLLECTIONS: SiteCollection[] = ['adventure', 'project', 'product', 'quote'];

const DraftCard = memo(function DraftCard({ draft, publishing, onEdit, onPublish }: {
  draft: PublicDraft;
  publishing: boolean;
  onEdit: (draft: PublicDraft) => void;
  onPublish: (draft: PublicDraft) => void;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.draftCard}>
      <View style={styles.draftTop}>
        <View style={styles.draftIcon}><SymbolView name={{ ios: 'doc.text.fill', android: 'description' }} size={19} tintColor={colors.accent} /></View>
        <View style={styles.draftCopy}><Text style={styles.draftType}>{draft.operation} · {draft.type}</Text><Text numberOfLines={2} style={styles.draftTitle}>{draft.title || 'Untitled change'}</Text></View>
        <View style={[styles.statusPill, draft.status === 'ready' && styles.readyPill]}><Text style={styles.statusText}>{draft.status}</Text></View>
      </View>
      {draft.summary ? <Text numberOfLines={2} style={styles.draftSummary}>{draft.summary}</Text> : null}
      <View style={styles.draftMeta}><Text style={styles.draftDate}>Updated {new Date(draft.updatedAt).toLocaleDateString()}</Text><Text style={styles.draftLength}>{draft.body.length.toLocaleString()} characters</Text></View>
      <View style={styles.draftActions}>
        <Pressable accessibilityRole="button" onPress={() => onEdit(draft)} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}><Text style={styles.secondaryButtonText}>Edit</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={publishing} onPress={() => onPublish(draft)} style={({ pressed }) => [styles.publishButton, pressed && styles.pressed]}>{publishing ? <ActivityIndicator color={colors.onAction} /> : <><Text style={styles.publishButtonText}>Publish</Text><SymbolView name={{ ios: 'arrow.up', android: 'publish' }} size={16} tintColor={colors.onAction} /></>}</Pressable>
      </View>
    </View>
  );
});

export default function WebsiteScreen() {
  const router = useRouter();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { drafts, createDraft, editDraft, setDraftStatus } = useApp();
  const [composerOpen, setComposerOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [composerInitial, setComposerInitial] = useState<NewPublicDraft | null>(null);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [publicationJobs, setPublicationJobs] = useState<PublicationJob[]>([]);
  const [liveCollection, setLiveCollection] = useState<SiteCollection | null>(null);
  const [liveItems, setLiveItems] = useState<SiteItem[]>([]);
  const [loadingLive, setLoadingLive] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    void (async () => {
      const activeConnection = await hasPublishingConnection();
      if (active) setConnected(activeConnection);
      const jobs = await retryPendingPublications();
      for (const job of jobs) {
        if (job.status === 'submitted' && job.itemType !== 'book') await setDraftStatus(job.localId, 'published');
      }
      if (active) setPublicationJobs(jobs);
    })();
    return () => { active = false; };
  }, [setDraftStatus]));

  useEffect(() => {
    if (!liveCollection) return;
    let active = true;
    setLoadingLive(true);
    setLiveError(null);
    loadSiteCollection(liveCollection)
      .then((items) => { if (active) setLiveItems(items); })
      .catch((cause) => { if (active) setLiveError(cause instanceof Error ? cause.message : 'Could not load this collection.'); })
      .finally(() => { if (active) setLoadingLive(false); });
    return () => { active = false; };
  }, [liveCollection]);

  const activeDrafts = useMemo(() => drafts.filter((draft) => draft.status !== 'published'), [drafts]);
  const pendingDeliveryCount = publicationJobs.filter((job) => job.status !== 'submitted').length;
  const submittedCount = publicationJobs.filter((job) => job.status === 'submitted').length;

  const openCreate = (definition: CreateDefinition) => {
    setCreateMenuOpen(false);
    if (definition.type === 'essay') {
      router.push('/essays/new');
      return;
    }
    setEditingDraftId(null);
    setComposerInitial({ type: definition.type, title: '', summary: '', body: '', sourceId: null, operation: 'create' });
    setComposerOpen(true);
  };

  const openLiveEdit = (item: SiteItem) => {
    setLiveCollection(null);
    setEditingDraftId(null);
    setComposerInitial(draftFromSiteItem(item));
    setComposerOpen(true);
  };

  const openDraftEdit = useCallback((draft: PublicDraft) => {
    setEditingDraftId(draft.id);
    setComposerInitial(draft);
    setComposerOpen(true);
  }, []);

  const saveComposer = async (input: NewPublicDraft) => {
    if (editingDraftId) await editDraft(editingDraftId, { ...input, nowLocation: input.nowLocation ?? null });
    else await createDraft(input);
    setEditingDraftId(null);
    Alert.alert('Saved to the queue', 'Nothing has been published. Review it here when you are ready.');
  };

  const publish = useCallback(async (draft: PublicDraft) => {
    if (!canPublish(draft)) {
      Alert.alert('More writing needed', 'Add a title and body before publishing.');
      return;
    }
    setPublishingId(draft.id);
    try {
      const job = await queueAndAttemptPublication(createPublishManifest(draft), draft.id);
      setPublicationJobs((current) => [job, ...current.filter((candidate) => candidate.id !== job.id)]);
      if (job.status === 'submitted') {
        await setDraftStatus(draft.id, 'published');
        Alert.alert('Website update submitted', 'The source commit was created. GitHub will test and deploy it automatically.');
      } else if (job.status === 'queued') {
        setConnected(false);
        Alert.alert('Queued safely', 'Connect publishing in Settings and JGOLD will submit this approved public copy automatically.', [
          { text: 'Later', style: 'cancel' }, { text: 'Open Settings', onPress: () => router.push('/settings') },
        ]);
      } else {
        Alert.alert('Submission failed', `${job.error}\n\nThe approved public copy is saved and can be retried.`);
      }
    } catch (cause) {
      Alert.alert('Publishing failed', cause instanceof Error ? cause.message : 'Please try again.');
    } finally {
      setPublishingId(null);
    }
  }, [router, setDraftStatus]);

  return (
    <>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerCopy}><Text style={styles.eyebrow}>PUBLISHING CONTROL</Text><Text style={styles.title}>Studio</Text><Text style={styles.intro}>Create, review and publish changes to your website.</Text></View>
            <Pressable accessibilityLabel="Add website change" accessibilityRole="button" onPress={() => setCreateMenuOpen(true)} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}><SymbolView name={{ ios: 'plus', android: 'add' }} size={27} tintColor={colors.onAction} /></Pressable>
          </View>

          <View style={styles.statusBar}>
            <View style={[styles.connectionDot, !connected && styles.connectionDotOff]} />
            <View style={styles.statusCopy}><Text style={styles.statusTitle}>{connected ? 'Publishing connected' : 'Publishing not connected'}</Text><Text style={styles.statusBody}>{connected ? 'Approved changes submit automatically from this phone.' : 'Approved changes queue safely until GitHub is connected.'}</Text></View>
            <Pressable accessibilityLabel={connected ? 'Open live website' : 'Open publishing settings'} accessibilityRole="button" onPress={() => { if (connected) router.push('/ai'); else router.push('/settings'); }} style={styles.statusAction}><SymbolView name={connected ? { ios: 'arrow.up.right', android: 'north_east' } : { ios: 'gearshape', android: 'settings' }} size={20} tintColor={colors.accent} /></Pressable>
          </View>

          <View style={styles.metrics}>
            <View style={styles.metric}><Text style={styles.metricValue}>{activeDrafts.length}</Text><Text style={styles.metricLabel}>In queue</Text></View>
            <View style={styles.metric}><Text style={styles.metricValue}>{pendingDeliveryCount}</Text><Text style={styles.metricLabel}>Delivery</Text></View>
            <View style={styles.metric}><Text style={styles.metricValue}>{submittedCount}</Text><Text style={styles.metricLabel}>Submitted</Text></View>
          </View>

          <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Publishing queue</Text><Text style={styles.sectionDetail}>{activeDrafts.length ? `${activeDrafts.length} waiting` : 'Clear'}</Text></View>
          {activeDrafts.length ? activeDrafts.map((draft) => <DraftCard key={draft.id} draft={draft} publishing={publishingId === draft.id} onEdit={openDraftEdit} onPublish={(item) => { void publish(item); }} />) : (
            <View style={styles.emptyQueue}><View style={styles.emptyIcon}><SymbolView name={{ ios: 'checkmark', android: 'check' }} size={23} tintColor={colors.success} /></View><View style={styles.emptyCopy}><Text style={styles.emptyTitle}>Nothing waiting to publish</Text><Text style={styles.emptyBody}>New website changes and public-intent essays will appear here.</Text></View></View>
          )}

          <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Edit existing</Text><Text style={styles.sectionDetail}>Load only when needed</Text></View>
          <View style={styles.existingRow}>
            {LIVE_COLLECTIONS.map((collection) => <Pressable key={collection} accessibilityRole="button" onPress={() => setLiveCollection(collection)} style={({ pressed }) => [styles.existingButton, pressed && styles.pressed]}><Text style={styles.existingText}>{collectionLabels[collection]}</Text><SymbolView name={{ ios: 'chevron.right', android: 'chevron_right' }} size={15} tintColor={colors.textSecondary} /></Pressable>)}
          </View>
          <Pressable accessibilityRole="button" onPress={() => router.push('/books')} style={({ pressed }) => [styles.libraryNote, pressed && styles.pressed]}><SymbolView name={{ ios: 'books.vertical.fill', android: 'library_books' }} size={19} tintColor={colors.accent} /><View style={styles.libraryCopy}><Text style={styles.libraryTitle}>Books and essays live in Library</Text><Text style={styles.libraryBody}>Manage the source content there; only approved changes return to this publishing queue.</Text></View><SymbolView name={{ ios: 'chevron.right', android: 'chevron_right' }} size={17} tintColor={colors.textSecondary} /></Pressable>
        </ScrollView>
      </SafeAreaView>

      <DraftComposer visible={composerOpen} initial={composerInitial} lockedType onDismiss={() => { setComposerOpen(false); setEditingDraftId(null); }} onSave={saveComposer} />

      <Modal visible={createMenuOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCreateMenuOpen(false)}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.modalHeader}><Pressable accessibilityRole="button" accessibilityLabel="Close create menu" onPress={() => setCreateMenuOpen(false)} style={styles.modalClose}><SymbolView name={{ ios: 'xmark', android: 'close' }} size={23} tintColor={colors.text} /></Pressable><View style={styles.modalCopy}><Text style={styles.modalEyebrow}>PRIVATE UNTIL PUBLISHED</Text><Text style={styles.modalTitle}>What do you want to create?</Text></View></View>
          <ScrollView contentContainerStyle={styles.createSheet}>
            {CREATE_TYPES.map((definition) => <Pressable key={definition.type} accessibilityRole="button" onPress={() => openCreate(definition)} style={({ pressed }) => [styles.createRow, pressed && styles.pressed]}><View style={styles.createIcon}><SymbolView name={definition.icon} size={22} tintColor={colors.accent} /></View><View style={styles.createCopy}><Text style={styles.createTitle}>{definition.label}</Text><Text style={styles.createDetail}>{definition.detail}</Text></View><SymbolView name={{ ios: 'chevron.right', android: 'chevron_right' }} size={18} tintColor={colors.textSecondary} /></Pressable>)}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={Boolean(liveCollection)} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setLiveCollection(null)}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.modalHeader}><Pressable accessibilityRole="button" onPress={() => setLiveCollection(null)} style={styles.modalClose}><SymbolView name={{ ios: 'xmark', android: 'close' }} size={23} tintColor={colors.text} /></Pressable><View style={styles.modalCopy}><Text style={styles.modalEyebrow}>LIVE WEBSITE</Text><Text style={styles.modalTitle}>{liveCollection ? collectionLabels[liveCollection] : ''}</Text></View></View>
          {loadingLive ? <ActivityIndicator color={colors.accent} style={styles.modalLoader} /> : liveError ? <Text style={styles.error}>{liveError}</Text> : <FlatList data={liveItems} keyExtractor={(item) => item.id} contentContainerStyle={styles.liveList} renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => openLiveEdit(item)} style={({ pressed }) => [styles.liveRow, pressed && styles.pressed]}><View style={styles.liveCopy}><Text style={styles.liveType}>{item.status} · {item.category}</Text><Text numberOfLines={2} style={styles.liveTitle}>{item.title}</Text><Text numberOfLines={1} style={styles.liveSummary}>{item.summary}</Text></View><SymbolView name={{ ios: 'square.and.pencil', android: 'edit' }} size={19} tintColor={colors.accent} /></Pressable>} />}
        </SafeAreaView>
      </Modal>
    </>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, paddingTop: 18, paddingBottom: 120, gap: 20, width: '100%', maxWidth: 760, alignSelf: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 16 }, headerCopy: { flex: 1, gap: 3 }, eyebrow: { color: colors.accent, fontFamily: Fonts.extraBold, fontSize: 9, letterSpacing: 1.1 }, title: { color: colors.text, fontFamily: Fonts.bold, fontSize: 34, lineHeight: 40 }, intro: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 }, addButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: colors.action },
    statusBar: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.backgroundElement }, connectionDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.success }, connectionDotOff: { backgroundColor: colors.accent }, statusCopy: { flex: 1, gap: 2 }, statusTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 13 }, statusBody: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 10, lineHeight: 15 }, statusAction: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.backgroundSelected },
    metrics: { flexDirection: 'row', gap: 8 }, metric: { flex: 1, minHeight: 74, justifyContent: 'space-between', padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.backgroundElement }, metricValue: { color: colors.text, fontFamily: Fonts.bold, fontSize: 22 }, metricLabel: { color: colors.textSecondary, fontFamily: Fonts.semibold, fontSize: 9, textTransform: 'uppercase' },
    sectionHeading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginTop: 3 }, sectionTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 20 }, sectionDetail: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 10 },
    createSheet: { padding: 20, gap: 10 }, createRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, borderWidth: 1, borderColor: colors.line, borderRadius: 15, backgroundColor: colors.backgroundElement }, createIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.accentSoft }, createCopy: { flex: 1, gap: 3 }, createTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 15 }, createDetail: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 11 },
    draftCard: { padding: 15, gap: 11, borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.backgroundElement }, draftTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, draftIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.accentSoft }, draftCopy: { flex: 1, gap: 2 }, draftType: { color: colors.accent, fontFamily: Fonts.extraBold, fontSize: 8, letterSpacing: 0.7, textTransform: 'uppercase' }, draftTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 16, lineHeight: 20 }, statusPill: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: colors.backgroundSelected }, readyPill: { backgroundColor: colors.accentSoft }, statusText: { color: colors.textSecondary, fontFamily: Fonts.bold, fontSize: 8, textTransform: 'uppercase' }, draftSummary: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 11, lineHeight: 16 }, draftMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 }, draftDate: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 9 }, draftLength: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 9 }, draftActions: { flexDirection: 'row', gap: 8 }, secondaryButton: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: colors.line }, secondaryButtonText: { color: colors.text, fontFamily: Fonts.bold, fontSize: 12 }, publishButton: { flex: 1.4, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, backgroundColor: colors.action }, publishButtonText: { color: colors.onAction, fontFamily: Fonts.bold, fontSize: 12 },
    emptyQueue: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.backgroundElement }, emptyIcon: { width: 41, height: 41, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.backgroundSelected }, emptyCopy: { flex: 1, gap: 3 }, emptyTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 14 }, emptyBody: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 10, lineHeight: 15 },
    existingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, existingButton: { width: '47%', flexGrow: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 13, borderRadius: 11, backgroundColor: colors.backgroundElement, borderWidth: 1, borderColor: colors.line }, existingText: { color: colors.text, fontFamily: Fonts.bold, fontSize: 11 },
    libraryNote: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14, borderRadius: 14, backgroundColor: colors.accentSoft }, libraryCopy: { flex: 1, gap: 2 }, libraryTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 12 }, libraryBody: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 9, lineHeight: 14 },
    modalHeader: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.line }, modalClose: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }, modalCopy: { flex: 1, gap: 2 }, modalEyebrow: { color: colors.accent, fontFamily: Fonts.extraBold, fontSize: 8, letterSpacing: 0.8 }, modalTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 18 }, modalLoader: { flex: 1 }, error: { color: colors.danger, fontFamily: Fonts.sans, fontSize: 13, padding: 20 }, liveList: { padding: 16, paddingBottom: 60, gap: 9 }, liveRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.backgroundElement }, liveCopy: { flex: 1, gap: 3 }, liveType: { color: colors.accent, fontFamily: Fonts.extraBold, fontSize: 8, letterSpacing: 0.5, textTransform: 'uppercase' }, liveTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 14 }, liveSummary: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 10 }, pressed: { opacity: 0.7, transform: [{ scale: 0.988 }] },
  });
}
