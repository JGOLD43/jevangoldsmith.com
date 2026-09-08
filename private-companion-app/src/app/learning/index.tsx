import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { memo, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivityHeatmap } from '@/components/activity-heatmap';
import { PRIORITY_CURRICULA } from '@/learning/priority-curricula';
import { getPracticeTime } from '@/storage/practice-time-repository';
import { Fonts, type AppColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { SkillTreeAnalytics, SkillTreeSummary } from '@/learning/types';
import { useBooks } from '@/state/books-context';
import { useLearning } from '@/state/learning-context';
import { ensurePriorityCurricula, ensureUpskillingSkillTree, getSkillTreeAnalytics, listSkillTrees } from '@/storage/skill-tree-repository';

const DURATIONS = [10, 20, 30] as const;

const DomainRow = memo(function DomainRow({ id, title, description, abilities, reliable, due, retention, onOpen }: {
  id: string; title: string; description: string; abilities: number; reliable: number; due: number; retention: number;
  onOpen: (id: string) => void;
}) {
  const colors = useTheme(); const styles = useMemo(() => createStyles(colors), [colors]);
  return <Pressable accessibilityRole="button" onPress={() => onOpen(id)} style={({ pressed }) => [styles.domainRow, pressed && styles.pressed]}>
    <View style={styles.domainMain}><Text style={styles.domainTitle}>{title}</Text><Text numberOfLines={2} style={styles.domainDescription}>{description}</Text><Text style={styles.domainMeta}>{abilities} abilities · {reliable} reliable · {due} ready</Text></View>
    <View style={styles.retention}><Text style={styles.retentionValue}>{retention}%</Text><Text style={styles.retentionLabel}>retained</Text></View>
    <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right' }} size={18} tintColor={colors.textSecondary} />
  </Pressable>;
});

export default function LearningScreen() {
  const router = useRouter(); const colors = useTheme(); const styles = useMemo(() => createStyles(colors), [colors]);
  const { dashboard, loading: frenchLoading } = useLearning();
  const { books, readingStats } = useBooks();
  const [minutes, setMinutes] = useState<(typeof DURATIONS)[number]>(20);
  const [trees, setTrees] = useState<SkillTreeSummary[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, SkillTreeAnalytics>>({});
  const [loadingTrees, setLoadingTrees] = useState(true);
  const [upskillingId, setUpskillingId] = useState('');
  const [focusTitle, setFocusTitle] = useState('Copywriting');
  const [time, setTime] = useState<Awaited<ReturnType<typeof getPracticeTime>> | null>(null);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoadingTrees(true);
    try {
    await ensurePriorityCurricula();
    const id = await ensureUpskillingSkillTree();
    const nextTrees = await listSkillTrees();
    const entries = await Promise.all(nextTrees.map(async (tree) => [tree.id, await getSkillTreeAnalytics(tree.id)] as const));
    setUpskillingId(id); setTrees(nextTrees.sort((a, b) => Number(PRIORITY_CURRICULA.some(seed => seed.title === b.title)) - Number(PRIORITY_CURRICULA.some(seed => seed.title === a.title)))); setAnalytics(Object.fromEntries(entries)); setTime(await getPracticeTime()); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load learning.'); } finally { setLoadingTrees(false); }
  }, []);
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));

  const openTree = useCallback((id: string) => router.push({ pathname: '/skills/[id]', params: { id } }), [router]);
  const totalAbilities = trees.reduce((sum, tree) => sum + tree.nodeCount, dashboard?.totalSkills ?? 0);
  const totalReliable = trees.reduce((sum, tree) => sum + tree.reliableCount, dashboard?.reliableSkills ?? 0);
  const totalDue = trees.reduce((sum, tree) => sum + (analytics[tree.id]?.dueCount ?? tree.readyCount), dashboard?.dueReviews ?? 0);
  const weightedNodes = trees.reduce((sum, tree) => sum + tree.nodeCount, 0);
  const retained = weightedNodes ? Math.round(trees.reduce((sum, tree) => sum + (analytics[tree.id]?.estimatedRetention ?? 0) * tree.nodeCount, 0) / weightedNodes) : 0;
  const highlightedBooks = books.filter((book) => book.readingStatus !== 'unread').length;
  const upskilling = trees.find((tree) => tree.title === focusTitle) ?? trees.find(tree => tree.id === upskillingId);
  const focusId = upskilling?.id;

  const header = <View style={styles.header}>
    <View style={styles.topbar}><Pressable accessibilityLabel="Back" hitSlop={12} onPress={() => router.back()} style={styles.back}><SymbolView name={{ ios: 'chevron.left', android: 'arrow_back' }} size={24} tintColor={colors.text} /></Pressable><View><Text style={styles.eyebrow}>LEARNING SYSTEM</Text><Text style={styles.title}>Build skills by doing.</Text></View></View>
    <Text style={styles.intro}>Choose one track. Do a short exercise, save your time and work, then correct one weakness. Aim for 20 minutes today; 10 is enough to start.</Text>

    <Pressable accessibilityRole="button" onPress={() => router.push('/learning/cards' as Href)} style={styles.sourceRow}><View style={styles.sourceCopy}><Text style={styles.sourceTitle}>Flashcards</Text><Text style={styles.sourceBody}>Create topic decks from your reading. Recall, reveal, review — or shuffle through your cards.</Text></View><SymbolView name={{ ios: 'chevron.right', android: 'chevron_right' }} size={20} tintColor={colors.accent} /></Pressable>

    {error ? <Pressable onPress={() => { void reload(); }}><Text style={styles.intro}>{error} · Tap to retry</Text></Pressable> : null}
    <View style={styles.memoryBand}>
      <View style={styles.memoryLead}><Text style={styles.memoryValue}>{((time?.todayMs ?? 0) / 60_000).toFixed(1)}</Text><Text style={styles.memoryLabel}>practice minutes today</Text></View>
      <View style={styles.memoryStat}><Text style={styles.statValue}>{((time?.weekMs ?? 0) / 60_000).toFixed(0)}</Text><Text style={styles.statLabel}>Last 7 days</Text></View>
      <View style={styles.memoryStat}><Text style={styles.statValue}>{((time?.totalMs ?? 0) / 3_600_000).toFixed(1)}h</Text><Text style={styles.statLabel}>Total practice</Text></View>
    </View>
    <Text style={styles.sectionBody}>{((time?.studyMs ?? 0) / 60_000).toFixed(0)} minutes reading / study recorded separately. French sessions have their own tracker below.</Text>
    <View style={styles.durationRow}>{PRIORITY_CURRICULA.map(seed => <Pressable key={seed.key} accessibilityRole="button" accessibilityState={{ selected: focusTitle === seed.title }} onPress={() => setFocusTitle(seed.title)} style={[styles.duration, focusTitle === seed.title && styles.durationSelected]}><Text style={[styles.durationText, focusTitle === seed.title && styles.durationTextSelected]}>{seed.title === 'AI foundations & papers' ? 'AI' : seed.title}</Text></Pressable>)}</View>

    <View style={styles.todaySection}><Text style={styles.sectionEyebrow}>YOUR NEXT REPETITION</Text><Text style={styles.sectionTitle}>{upskilling?.title ?? 'Learning how to learn'}</Text><Text style={styles.sectionBody}>{upskilling?.description ?? 'The next practice will stay at the edge of what you can do independently.'}</Text>
      <Pressable disabled={!focusId} accessibilityRole="button" onPress={() => { if (focusId) openTree(focusId); }} style={({ pressed }) => [styles.primary, pressed && styles.pressed, !focusId && styles.disabled]}><Text style={styles.primaryText}>Open practice & curriculum</Text><SymbolView name={{ ios: 'arrow.right', android: 'arrow_forward' }} size={19} tintColor={colors.onAction} /></Pressable>
    </View>

    <View style={styles.pipeline}>
      <View style={styles.pipelineStep}><Text style={styles.pipelineNumber}>{readingStats.highlightCount}</Text><Text style={styles.pipelineLabel}>Highlights</Text></View><Text style={styles.pipelineArrow}>→</Text>
      <View style={styles.pipelineStep}><Text style={styles.pipelineNumber}>{trees.length}</Text><Text style={styles.pipelineLabel}>Skill trees</Text></View><Text style={styles.pipelineArrow}>→</Text>
      <View style={styles.pipelineStep}><Text style={styles.pipelineNumber}>{totalReliable}</Text><Text style={styles.pipelineLabel}>Reliable</Text></View><Text style={styles.pipelineArrow}>→</Text>
      <View style={styles.pipelineStep}><Text style={styles.pipelineNumber}>{trees.reduce((sum, tree) => sum + (analytics[tree.id]?.masteredCount ?? 0), 0)}</Text><Text style={styles.pipelineLabel}>Transferred</Text></View>
    </View>

    <Pressable accessibilityRole="button" onPress={() => router.push('/books')} style={({ pressed }) => [styles.sourceRow, pressed && styles.pressed]}><View style={styles.sourceIcon}><SymbolView name={{ ios: 'text.quote', android: 'format_quote' }} size={22} tintColor={colors.accent} /></View><View style={styles.sourceCopy}><Text style={styles.sourceTitle}>Source library</Text><Text style={styles.sourceBody}>{readingStats.highlightCount} highlights from a library of {highlightedBooks} read or active books. Covers and collections stay attached to the evidence.</Text></View><SymbolView name={{ ios: 'chevron.right', android: 'chevron_right' }} size={18} tintColor={colors.textSecondary} /></Pressable>

    <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Learning domains</Text><Text style={styles.sectionAside}>{trees.length + 1} active</Text></View>
  </View>;

  const footer = <View style={styles.footer}>
    <View style={styles.frenchSection}><View><Text style={styles.sectionEyebrow}>LANGUAGE PRACTICE</Text><Text style={styles.sectionTitle}>French conversation</Text><Text style={styles.sectionBody}>{dashboard?.nextMilestone?.realLifeTest ?? 'Retrieval, correction and live speaking tasks.'}</Text></View><View style={styles.durationRow}>{DURATIONS.map((duration) => <Pressable key={duration} onPress={() => setMinutes(duration)} style={[styles.duration, minutes === duration && styles.durationSelected]}><Text style={[styles.durationText, minutes === duration && styles.durationTextSelected]}>{duration}m</Text></Pressable>)}</View><Pressable accessibilityRole="button" onPress={() => router.push(`/learning/session?minutes=${minutes}`)} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}><Text style={styles.secondaryText}>Start speaking practice</Text><SymbolView name={{ ios: 'waveform', android: 'graphic_eq' }} size={19} tintColor={colors.accent} /></Pressable><Pressable onPress={() => router.push('/learning/tree')} style={styles.textLink}><Text style={styles.textLinkLabel}>Open French prerequisite map</Text></Pressable></View>
    <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Direct practice history</Text><Text style={styles.sectionAside}>52 weeks</Text></View>
    <View style={styles.heatmap}><ActivityHeatmap activity={time?.activity ?? []} formatValue={(value, count) => `${value.toFixed(1)} minutes across ${count} sessions`} /></View>
    <Text style={styles.privacy}>Time and evidence stay on your device. Skill progress uses your self-assessments; it is not an independently verified measure of competence.</Text>
  </View>;

  return <SafeAreaView edges={['top']} style={styles.safe}>
    <FlatList data={trees} keyExtractor={(item) => item.id} contentContainerStyle={styles.content} ListHeaderComponent={header} ListFooterComponent={footer} ListEmptyComponent={loadingTrees || frenchLoading ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : <Text style={styles.empty}>No skill trees yet.</Text>} renderItem={({ item }) => <DomainRow id={item.id} title={item.title} description={item.description} abilities={item.nodeCount} reliable={item.reliableCount} due={analytics[item.id]?.dueCount ?? item.readyCount} retention={analytics[item.id]?.estimatedRetention ?? 0} onOpen={openTree} />} />
  </SafeAreaView>;
}

function createStyles(colors: AppColors) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 125, width: '100%', maxWidth: 760, alignSelf: 'center' }, header: { gap: 18 }, footer: { gap: 18, paddingTop: 22 },
  topbar: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12 }, back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', marginLeft: -10 }, eyebrow: { color: colors.accent, fontFamily: Fonts.extraBold, fontSize: 9, letterSpacing: 1.3 }, title: { color: colors.text, fontFamily: Fonts.black, fontSize: 31, lineHeight: 36, marginTop: 2 }, intro: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22, maxWidth: 610 },
  memoryBand: { minHeight: 86, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line }, memoryLead: { flex: 1.3 }, memoryValue: { color: colors.text, fontFamily: Fonts.black, fontSize: 28 }, memoryLabel: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 9, textTransform: 'uppercase' }, memoryDivider: { width: 1, height: 46, backgroundColor: colors.line, marginRight: 14 }, memoryStat: { flex: 1, alignItems: 'center' }, statValue: { color: colors.text, fontFamily: Fonts.bold, fontSize: 17 }, statLabel: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 9, marginTop: 2 },
  todaySection: { gap: 9, padding: 20, backgroundColor: colors.backgroundElement, borderWidth: 1, borderColor: colors.line, borderRadius: 22, borderCurve: 'continuous' }, sectionEyebrow: { color: colors.accent, fontFamily: Fonts.extraBold, fontSize: 9, letterSpacing: 1.2 }, sectionTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 21 }, sectionBody: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 20 }, primary: { minHeight: 54, marginTop: 5, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, borderCurve: 'continuous', backgroundColor: colors.action }, primaryText: { color: colors.onAction, fontFamily: Fonts.bold, fontSize: 14 }, disabled: { opacity: 0.45 },
  pipeline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }, pipelineStep: { alignItems: 'center', gap: 2 }, pipelineNumber: { color: colors.text, fontFamily: Fonts.bold, fontSize: 16 }, pipelineLabel: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 8, textTransform: 'uppercase' }, pipelineArrow: { color: colors.line, fontFamily: Fonts.bold, fontSize: 18 },
  sourceRow: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line }, sourceIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 13, borderCurve: 'continuous', backgroundColor: colors.accentSoft }, sourceCopy: { flex: 1, minWidth: 0, gap: 2 }, sourceTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 14 }, sourceBody: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 10, lineHeight: 14 },
  sectionHeading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }, sectionAside: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 10 }, domainRow: { minHeight: 102, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line }, domainMain: { flex: 1, minWidth: 0, gap: 3 }, domainTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 15 }, domainDescription: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 10, lineHeight: 14 }, domainMeta: { color: colors.accent, fontFamily: Fonts.semibold, fontSize: 9, marginTop: 3 }, retention: { alignItems: 'flex-end' }, retentionValue: { color: colors.text, fontFamily: Fonts.bold, fontSize: 15 }, retentionLabel: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 8 },
  frenchSection: { gap: 11, padding: 18, backgroundColor: colors.accentSoft, borderRadius: 20, borderCurve: 'continuous' }, durationRow: { flexDirection: 'row', gap: 7 }, duration: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderCurve: 'continuous', backgroundColor: colors.backgroundElement }, durationSelected: { borderWidth: 1, borderColor: colors.accent }, durationText: { color: colors.textSecondary, fontFamily: Fonts.bold, fontSize: 11 }, durationTextSelected: { color: colors.text }, secondary: { minHeight: 50, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.accent, borderRadius: 13, borderCurve: 'continuous', backgroundColor: colors.backgroundElement }, secondaryText: { color: colors.text, fontFamily: Fonts.bold, fontSize: 13 }, textLink: { minHeight: 38, alignItems: 'center', justifyContent: 'center' }, textLinkLabel: { color: colors.accent, fontFamily: Fonts.bold, fontSize: 11 },
  heatmap: { padding: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.backgroundElement, borderRadius: 16, borderCurve: 'continuous' }, privacy: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 9, lineHeight: 14 }, loader: { marginVertical: 24 }, empty: { color: colors.textSecondary, textAlign: 'center', padding: 24 }, pressed: { opacity: 0.74, transform: [{ scale: 0.99 }] },
}); }
