import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, type AppColors } from '@/constants/theme';
import type { EssayDocument, EssayRevision, EssayVisibility, NewEssayDocument } from '@/domain/models';
import { createPublishManifest } from '@/domain/privacy';
import { useTheme } from '@/hooks/use-theme';
import { queueAndAttemptPublication } from '@/services/publication-outbox';
import { loadSiteCollection, type SiteItem } from '@/services/public-site';
import { listEssayRevisions } from '@/storage/repository';
import { useApp } from '@/state/app-context';

const DATE_TIME = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const DATE_ONLY = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

function formattedDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value || 'Unknown' : DATE_ONLY.format(date);
}

function revisionLabel(reason: EssayRevision['reason']) {
  if (reason === 'created') return 'Essay created';
  if (reason === 'studio') return 'Sent to Studio';
  if (reason === 'manual') return 'Version saved';
  return 'Writing autosaved';
}

export default function EssayEditorScreen() {
  const { id, collection } = useLocalSearchParams<{ id: string; collection?: string }>();
  const router = useRouter();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { essays, createEssay, editEssay, deleteEssay, createDraft, setDraftStatus } = useApp();
  const localId = id?.startsWith('local:') ? id.slice(6) : null;
  const publicId = id?.startsWith('public:') ? id.slice(7) : null;
  const isNew = id === 'new';
  const localEssay = localId ? essays.find((essay) => essay.id === localId) ?? null : null;
  const [publicEssay, setPublicEssay] = useState<SiteItem | null>(null);
  const [loadingPublic, setLoadingPublic] = useState(Boolean(publicId));
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [collectionName, setCollectionName] = useState(collection || 'Unsorted');
  const [visibility, setVisibility] = useState<EssayVisibility>('private');
  const [revisions, setRevisions] = useState<EssayRevision[]>([]);
  const [selectedRevision, setSelectedRevision] = useState<EssayRevision | null>(null);
  const [status, setStatus] = useState('Saved locally');
  const [publishing, setPublishing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const creatingRef = useRef(false);
  const latestRef = useRef<NewEssayDocument>({ title: '', summary: '', body: '', collectionName: collection || 'Unsorted', visibility: 'private' });

  useEffect(() => {
    latestRef.current = { title, summary, body, collectionName, visibility };
  }, [body, collectionName, summary, title, visibility]);

  useEffect(() => {
    if (!localEssay) {
      if (isNew) setHydrated(true);
      return;
    }
    setTitle(localEssay.title);
    setSummary(localEssay.summary);
    setBody(localEssay.body);
    setCollectionName(localEssay.collectionName);
    setVisibility(localEssay.visibility);
    setHydrated(true);
  }, [isNew, localEssay]);

  const refreshTimeline = useCallback(async (essayId: string) => {
    setRevisions(await listEssayRevisions(essayId));
  }, []);

  useEffect(() => { if (localId) void refreshTimeline(localId); }, [localId, refreshTimeline]);

  useEffect(() => {
    if (!publicId) return;
    let active = true;
    loadSiteCollection('essay')
      .then((items) => { if (active) setPublicEssay(items.find((essay) => essay.id === publicId) ?? null); })
      .catch(() => { if (active) setPublicEssay(null); })
      .finally(() => { if (active) setLoadingPublic(false); });
    return () => { active = false; };
  }, [publicId]);

  const persist = useCallback(async (reason: 'autosave' | 'manual' | 'studio') => {
    const input = latestRef.current;
    if (localId) {
      setStatus(reason === 'autosave' ? 'Saving…' : 'Saving version…');
      const saved = await editEssay(localId, input, reason);
      if (saved) {
        setStatus(`Saved ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`);
        await refreshTimeline(localId);
      }
      return saved;
    }
    if (!isNew || creatingRef.current || (!input.title.trim() && !input.body.trim())) return null;
    creatingRef.current = true;
    setStatus('Creating essay…');
    const created = await createEssay(input);
    creatingRef.current = false;
    if (created) router.replace(`/essays/${encodeURIComponent(`local:${created.id}`)}`);
    return created;
  }, [createEssay, editEssay, isNew, localId, refreshTimeline, router]);

  useFocusEffect(useCallback(() => {
    if (publicId) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      void persist('manual').finally(() => router.back());
      return true;
    });
    return () => subscription.remove();
  }, [persist, publicId, router]));

  useEffect(() => {
    if (!hydrated || publicId) return;
    if (isNew && !title.trim() && !summary.trim() && !body.trim()) {
      setStatus('New essay');
      return;
    }
    setStatus('Unsaved changes');
    const timeout = setTimeout(() => { void persist('autosave'); }, 1400);
    return () => clearTimeout(timeout);
  }, [body, collectionName, hydrated, isNew, persist, publicId, summary, title, visibility]);

  useEffect(() => () => {
    if (hydrated && localId) void editEssay(localId, latestRef.current, 'autosave');
  }, [editEssay, hydrated, localId]);

  const makeEditableCopy = async () => {
    if (!publicEssay) return;
    const created = await createEssay({
      sourceId: publicEssay.id,
      title: publicEssay.title,
      summary: publicEssay.summary,
      body: publicEssay.body,
      collectionName: publicEssay.category,
      visibility: 'public',
    });
    if (created) router.replace(`/essays/${encodeURIComponent(`local:${created.id}`)}`);
  };

  const publishToWebsite = async () => {
    setPublishing(true);
    try {
      const saved = await persist('studio');
      const essay = saved ?? localEssay;
      if (!essay) return;
      const stableSourceId = essay.sourceId ?? `jgold-${essay.id}`;
      if (!essay.sourceId) {
        await editEssay(essay.id, { ...latestRef.current, sourceId: stableSourceId }, 'studio');
      }
      const draft = await createDraft({
        type: 'essay', title: essay.title, summary: essay.summary, body: essay.body,
        sourceId: stableSourceId, operation: essay.sourceId ? 'update' : 'create',
      });
      if (!draft) return;
      const job = await queueAndAttemptPublication(createPublishManifest(draft), draft.id);
      if (job.status === 'submitted') {
        await setDraftStatus(draft.id, 'published');
        Alert.alert('Website update submitted', 'The approved essay was committed and will deploy automatically. Your revision history remains only on this phone.');
      } else if (job.status === 'queued') {
        Alert.alert('Queued in Studio', 'The approved public copy will submit automatically after publishing is connected.', [
          { text: 'Stay here' }, { text: 'Open Studio', onPress: () => router.push('/website') },
        ]);
      } else {
        Alert.alert('Saved, but submission failed', `${job.error}\n\nThe public copy remains in Studio for retry.`);
      }
    } catch (cause) {
      Alert.alert('Could not prepare website update', cause instanceof Error ? cause.message : 'Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const remove = () => {
    if (!localId || !localEssay) return;
    Alert.alert('Delete this essay?', 'Its complete local revision timeline will also be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { void deleteEssay(localId).then(() => router.replace('/books')); } },
    ]);
  };

  if (publicId) {
    return (
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.readerContent}>
          <View style={styles.topbar}><Pressable accessibilityLabel="Back to essays" onPress={() => router.back()} style={styles.iconButton}><SymbolView name={{ ios: 'chevron.left', android: 'arrow_back' }} size={25} tintColor={colors.text} /></Pressable><View style={styles.topbarCopy}><Text style={styles.topbarEyebrow}>PUBLIC ESSAY</Text><Text numberOfLines={1} style={styles.topbarTitle}>Website collection</Text></View></View>
          {loadingPublic ? <Text style={styles.helper}>Loading essay…</Text> : publicEssay ? <>
            <Text style={styles.publicTitle}>{publicEssay.title}</Text>
            <Text style={styles.publicSummary}>{publicEssay.summary}</Text>
            <View style={styles.publicMeta}><Text style={styles.metaPill}>{publicEssay.category}</Text><Text style={styles.metaText}>Created {formattedDate(publicEssay.createdAt)}</Text><Text style={styles.metaText}>Updated {formattedDate(publicEssay.updatedAt)}</Text></View>
            <Pressable accessibilityRole="button" onPress={() => { void makeEditableCopy(); }} style={styles.primaryButton}><SymbolView name={{ ios: 'square.and.pencil', android: 'edit_note' }} size={20} tintColor={colors.onAction} /><Text style={styles.primaryButtonText}>Edit this essay</Text></Pressable>
            <Text style={styles.helper}>This creates an editable document on your phone. Every change will autosave and build its own revision history.</Text>
            <Text style={styles.publicBody}>{publicEssay.body}</Text>
          </> : <Text style={styles.helper}>This public essay could not be found.</Text>}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <>
    <SafeAreaView edges={['top']} style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.topbar}>
          <Pressable accessibilityLabel="Back to essays" onPress={() => { void persist('manual').finally(() => router.back()); }} style={styles.iconButton}><SymbolView name={{ ios: 'chevron.left', android: 'arrow_back' }} size={25} tintColor={colors.text} /></Pressable>
          <View style={styles.topbarCopy}><Text style={styles.topbarEyebrow}>{visibility === 'private' ? 'PRIVATE ESSAY' : 'PUBLIC ESSAY'}</Text><Text numberOfLines={1} style={styles.topbarTitle}>{status}</Text></View>
          <Pressable accessibilityRole="button" onPress={() => { void persist('manual'); }} style={styles.saveButton}><Text style={styles.saveText}>Save</Text></Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.editorContent}>
          <View style={styles.visibilitySwitch}>
            {(['private', 'public'] as const).map((option) => <Pressable key={option} accessibilityRole="tab" accessibilityState={{ selected: visibility === option }} onPress={() => setVisibility(option)} style={[styles.visibilityOption, visibility === option && styles.visibilitySelected]}><SymbolView name={option === 'private' ? { ios: 'lock.fill', android: 'lock' } : { ios: 'globe', android: 'public' }} size={16} tintColor={visibility === option ? colors.onAction : colors.textSecondary} /><Text style={[styles.visibilityText, visibility === option && styles.visibilityTextSelected]}>{option === 'private' ? 'Private' : 'Public'}</Text></Pressable>)}
          </View>
          <Text style={styles.visibilityHelp}>{visibility === 'private' ? 'Encrypted on this phone and never included in publishing.' : 'Only the title, summary and essay text can leave this phone after you press Publish.'}</Text>
          <TextInput value={collectionName} onChangeText={setCollectionName} placeholder="Collection" placeholderTextColor={colors.textSecondary} style={styles.collectionInput} />
          <TextInput autoFocus={isNew} value={title} onChangeText={setTitle} multiline placeholder="Essay title" placeholderTextColor={colors.textSecondary} style={styles.titleInput} />
          <TextInput value={summary} onChangeText={setSummary} multiline placeholder="Short summary or central idea…" placeholderTextColor={colors.textSecondary} style={styles.summaryInput} />
          <View style={styles.writingMeta}><Text style={styles.writingMetaText}>{body.length.toLocaleString()} characters</Text><Text style={styles.writingMetaText}>{Math.max(1, Math.ceil(body.trim().split(/\s+/).filter(Boolean).length / 200))} min read</Text></View>
          <TextInput value={body} onChangeText={setBody} multiline textAlignVertical="top" placeholder="Start writing…" placeholderTextColor={colors.textSecondary} style={styles.bodyInput} />

          {visibility === 'public' ? <Pressable accessibilityRole="button" disabled={!title.trim() || !body.trim() || publishing} onPress={() => Alert.alert('Publish this essay?', 'Only the title, summary and essay text will be submitted. Your complete revision timeline stays on this phone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Publish', onPress: () => { void publishToWebsite(); } }])} style={[styles.primaryButton, (!title.trim() || !body.trim() || publishing) && styles.disabled]}><Text style={styles.primaryButtonText}>{publishing ? 'Submitting…' : 'Publish to website'}</Text></Pressable> : null}

          {localEssay ? <View style={styles.timeline}>
            <View style={styles.timelineHeader}><View><Text style={styles.timelineTitle}>Writing timeline</Text><Text style={styles.timelineSubtitle}>Complete encrypted revision history</Text></View><Text style={styles.versionCount}>{revisions.length} versions</Text></View>
            <View style={styles.spanCard}><View><Text style={styles.spanLabel}>Started</Text><Text style={styles.spanValue}>{formattedDate(localEssay.createdAt)}</Text></View><SymbolView name={{ ios: 'arrow.right', android: 'arrow_forward' }} size={17} tintColor={colors.textSecondary} /><View><Text style={styles.spanLabel}>Last worked on</Text><Text style={styles.spanValue}>{formattedDate(localEssay.updatedAt)}</Text></View></View>
            {revisions.map((revision, index) => <Pressable key={revision.id} accessibilityLabel={`Open version ${revision.sequence}`} accessibilityRole="button" onPress={() => setSelectedRevision(revision)} style={({ pressed }) => [styles.revisionRow, pressed && styles.pressed]}>
              <View style={styles.timelineRail}><View style={[styles.timelineDot, index === 0 && styles.timelineDotLatest]} />{index < revisions.length - 1 ? <View style={styles.timelineLine} /> : null}</View>
              <View style={styles.revisionCopy}><View style={styles.revisionHeading}><Text style={styles.revisionTitle}>{revisionLabel(revision.reason)}</Text><Text style={styles.revisionSequence}>v{revision.sequence}</Text></View><Text style={styles.revisionTime}>{DATE_TIME.format(new Date(revision.createdAt))}</Text><Text style={styles.revisionStats}>{revision.characterCount.toLocaleString()} characters · {revision.changeSize >= 0 ? '+' : ''}{revision.changeSize.toLocaleString()} changed</Text></View>
              <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right' }} size={16} tintColor={colors.textSecondary} />
            </Pressable>)}
          </View> : null}
          {localEssay ? <Pressable accessibilityRole="button" onPress={remove} style={styles.deleteButton}><Text style={styles.deleteText}>Delete essay and history</Text></Pressable> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    <Modal visible={Boolean(selectedRevision)} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedRevision(null)}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.topbar}><Pressable accessibilityRole="button" onPress={() => setSelectedRevision(null)} style={styles.iconButton}><SymbolView name={{ ios: 'xmark', android: 'close' }} size={23} tintColor={colors.text} /></Pressable><View style={styles.topbarCopy}><Text style={styles.topbarEyebrow}>VERSION {selectedRevision?.sequence}</Text><Text style={styles.topbarTitle}>{selectedRevision ? DATE_TIME.format(new Date(selectedRevision.createdAt)) : ''}</Text></View></View>
        {selectedRevision ? <ScrollView contentContainerStyle={styles.versionContent}>
          <Text style={styles.versionTitle}>{selectedRevision.title}</Text>
          {selectedRevision.summary ? <Text style={styles.versionSummary}>{selectedRevision.summary}</Text> : null}
          <View style={styles.publicMeta}><Text style={styles.metaPill}>{revisionLabel(selectedRevision.reason)}</Text><Text style={styles.metaText}>{selectedRevision.characterCount.toLocaleString()} characters</Text></View>
          <Text style={styles.publicBody}>{selectedRevision.body || 'This version did not contain body text yet.'}</Text>
          <Pressable accessibilityRole="button" onPress={() => { setTitle(selectedRevision.title); setSummary(selectedRevision.summary); setBody(selectedRevision.body); setSelectedRevision(null); }} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Restore this version as a new edit</Text></Pressable>
          <Text style={styles.helper}>Restoring never deletes later history. It creates another timestamped version.</Text>
        </ScrollView> : null}
      </SafeAreaView>
    </Modal>
    </>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 },
    topbar: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.background },
    iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }, topbarCopy: { flex: 1, minWidth: 0, gap: 2 }, topbarEyebrow: { color: colors.accent, fontFamily: Fonts.extraBold, fontSize: 8, letterSpacing: 0.9 }, topbarTitle: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 11 }, saveButton: { minWidth: 58, minHeight: 42, alignItems: 'flex-end', justifyContent: 'center' }, saveText: { color: colors.accent, fontFamily: Fonts.bold, fontSize: 14 },
    editorContent: { padding: 20, paddingBottom: 140, gap: 14, width: '100%', maxWidth: 760, alignSelf: 'center' },
    visibilitySwitch: { flexDirection: 'row', padding: 4, gap: 4, borderRadius: 13, backgroundColor: colors.backgroundSelected }, visibilityOption: { flex: 1, minHeight: 41, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10 }, visibilitySelected: { backgroundColor: colors.action }, visibilityText: { color: colors.textSecondary, fontFamily: Fonts.bold, fontSize: 12 }, visibilityTextSelected: { color: colors.onAction }, visibilityHelp: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 10, lineHeight: 15, textAlign: 'center' },
    collectionInput: { minHeight: 44, color: colors.accent, fontFamily: Fonts.bold, fontSize: 12, paddingHorizontal: 13, backgroundColor: colors.accentSoft, borderRadius: 10 },
    titleInput: { color: colors.text, fontFamily: Fonts.bold, fontSize: 31, lineHeight: 38, paddingVertical: 4 }, summaryInput: { minHeight: 68, color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
    writingMeta: { flexDirection: 'row', justifyContent: 'space-between' }, writingMetaText: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.4 }, bodyInput: { minHeight: 420, color: colors.text, fontFamily: Fonts.sans, fontSize: 17, lineHeight: 28, paddingVertical: 8 },
    primaryButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16, borderRadius: 13, backgroundColor: colors.action }, primaryButtonText: { color: colors.onAction, fontFamily: Fonts.bold, fontSize: 14 }, disabled: { opacity: 0.4 }, helper: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 11, lineHeight: 17, textAlign: 'center' },
    timeline: { gap: 12, marginTop: 18, paddingTop: 22, borderTopWidth: 1, borderTopColor: colors.line }, timelineHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }, timelineTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 20 }, timelineSubtitle: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 10, marginTop: 2 }, versionCount: { color: colors.accent, fontFamily: Fonts.bold, fontSize: 11 },
    spanCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 14, borderRadius: 13, backgroundColor: colors.backgroundElement, borderWidth: 1, borderColor: colors.line }, spanLabel: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 8, textTransform: 'uppercase' }, spanValue: { color: colors.text, fontFamily: Fonts.bold, fontSize: 12, marginTop: 3 },
    revisionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 72 }, timelineRail: { width: 15, alignItems: 'center', alignSelf: 'stretch' }, timelineDot: { width: 9, height: 9, borderRadius: 5, marginTop: 5, backgroundColor: colors.line }, timelineDotLatest: { backgroundColor: colors.accent }, timelineLine: { width: 1, flex: 1, marginTop: 4, backgroundColor: colors.line }, revisionCopy: { flex: 1, gap: 3, paddingBottom: 12 }, revisionHeading: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, revisionTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 13 }, revisionSequence: { color: colors.textSecondary, fontFamily: Fonts.mono, fontSize: 10 }, revisionTime: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 10 }, revisionStats: { color: colors.accent, fontFamily: Fonts.semibold, fontSize: 10 },
    deleteButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 }, deleteText: { color: colors.danger, fontFamily: Fonts.bold, fontSize: 13 },
    readerContent: { padding: 20, paddingBottom: 140, gap: 17, width: '100%', maxWidth: 760, alignSelf: 'center' }, versionContent: { padding: 20, paddingBottom: 80, gap: 16, width: '100%', maxWidth: 760, alignSelf: 'center' }, versionTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 27, lineHeight: 34 }, versionSummary: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22 }, publicTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 32, lineHeight: 40, marginTop: 10 }, publicSummary: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 17, lineHeight: 25 }, publicMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }, metaPill: { overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9, color: colors.accent, backgroundColor: colors.accentSoft, fontFamily: Fonts.bold, fontSize: 9 }, metaText: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 10 }, publicBody: { color: colors.text, fontFamily: Fonts.sans, fontSize: 17, lineHeight: 29 }, pressed: { opacity: 0.7 },
  });
}
