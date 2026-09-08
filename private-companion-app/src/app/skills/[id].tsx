import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getPracticeTime } from '@/storage/practice-time-repository';
import type { AppColors } from '@/constants/theme';
import { SkillColors, SkillFonts as Fonts } from '@/constants/skill-theme';
import { SkillTreeOverview } from '@/components/skill-tree-overview';
import { chooseNextSkill, SKILL_DIMENSIONS, SKILL_DIMENSION_LABELS } from '@/learning/adaptive-skill-engine';
import type { SkillDimension, SkillTreeAnalytics, SkillTreeDetail, SkillTreeNodeView } from '@/learning/types';
import { addSkillTreeNode, createSkillTree, deleteSkillTree, getSkillTree, getSkillTreeAnalytics } from '@/storage/skill-tree-repository';

const STATUS_LABEL = { locked: 'Locked', ready: 'Ready', practising: 'Practising', reliable: 'Reliable', mastered: 'Mastered' } as const;

export default function SkillTreeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = SkillColors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isNew = id === 'new';
  const [time, setTime] = useState<Awaited<ReturnType<typeof getPracticeTime>> | null>(null);
  const [tree, setTree] = useState<SkillTreeDetail | null>(null);
  const [analytics, setAnalytics] = useState<SkillTreeAnalytics | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selected, setSelected] = useState<SkillTreeNodeView | null>(null);

  const reload = useCallback(async () => {
    if (!id || isNew) return;
    const [nextTree, nextAnalytics] = await Promise.all([getSkillTree(id), getSkillTreeAnalytics(id)]);
    setTree(nextTree); setAnalytics(nextAnalytics); setTime(await getPracticeTime(id));
  }, [id, isNew]);
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));

  const create = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const created = await createSkillTree(title, description);
      router.replace({ pathname: '/skills/[id]', params: { id: created.id } });
    } finally { setCreating(false); }
  };

  const practice = useCallback((node?: SkillTreeNodeView) => {
    const target = node ??  (tree ? chooseNextSkill(tree.nodes) : null);
    if (!tree || !target) return;
    setSelected(null);
    router.push({ pathname: '/skills/[id]/practice', params: { id: tree.id, node: target.id } });
  }, [router, tree]);

  if (isNew) return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView automaticallyAdjustKeyboardInsets contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backRow}><SymbolView name={{ ios: 'chevron.left', android: 'arrow_back' }} size={20} tintColor={colors.accent} /><Text style={styles.backText}>Library</Text></Pressable>
        <Text style={styles.eyebrow}>NEW SKILL TREE</Text><Text style={styles.title}>What do you want to learn?</Text>
        <Text style={styles.intro}>Start with the outcome. You can add foundations and prerequisite branches next.</Text>
        <View style={styles.formCard}>
          <Text style={styles.label}>Skill tree name</Text><TextInput autoFocus value={title} onChangeText={setTitle} placeholder="e.g. Public speaking" placeholderTextColor={colors.textSecondary} style={styles.input} />
          <Text style={styles.label}>What will this help you do?</Text><TextInput multiline value={description} onChangeText={setDescription} placeholder="Describe the practical outcome" placeholderTextColor={colors.textSecondary} style={[styles.input, styles.multiline]} />
          <Pressable accessibilityRole="button" disabled={!title.trim() || creating} onPress={() => { void create(); }} style={[styles.primaryButton, (!title.trim() || creating) && styles.disabled]}><Text style={styles.primaryButtonText}>{creating ? 'Creating…' : 'Create skill tree'}</Text></Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  if (!tree) return <SafeAreaView edges={['top']} style={styles.safeArea}><Text style={styles.empty}>Loading skill tree…</Text></SafeAreaView>;
  const next = chooseNextSkill(tree.nodes);
  return <SafeAreaView edges={['top']} style={styles.safeArea}>
    <SkillTreeOverview tree={tree} analytics={analytics} time={time} next={next} onBack={() => router.back()} onAdd={() => setEditorOpen(true)} onSelect={setSelected} onPractice={practice} onDelete={() => Alert.alert('Delete this skill tree?', 'Its abilities and practice history will be permanently removed.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { void deleteSkillTree(tree.id).then(() => router.replace('/books')); } }])} />
    <AddAbilityModal visible={editorOpen} tree={tree} onClose={() => setEditorOpen(false)} onSaved={reload} />
    <NodeModal node={selected} tree={tree} onClose={() => setSelected(null)} onPractice={practice} onSelect={setSelected} />
  </SafeAreaView>;
}

function AddAbilityModal({ visible, tree, onClose, onSaved }: { visible: boolean; tree: SkillTreeDetail; onClose: () => void; onSaved: () => Promise<void> }) {
  const colors = SkillColors; const styles = useMemo(() => createStyles(colors), [colors]);
  const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [prompt, setPrompt] = useState(''); const [criteria, setCriteria] = useState(''); const [dimension, setDimension] = useState<SkillDimension>('procedural'); const [prerequisites, setPrerequisites] = useState<string[]>([]); const [saving, setSaving] = useState(false);
  const close = () => { setTitle(''); setDescription(''); setPrompt(''); setCriteria(''); setDimension('procedural'); setPrerequisites([]); onClose(); };
  const save = async () => { if (!title.trim()) return; setSaving(true); try { await addSkillTreeNode({ treeId: tree.id, title, description, practicePrompt: prompt, successCriteria: criteria, prerequisites, dimension }); await onSaved(); close(); } catch (cause) { Alert.alert('Could not add ability', cause instanceof Error ? cause.message : 'Please try again.'); } finally { setSaving(false); } };
  return <Modal animationType="slide" presentationStyle="pageSheet" visible={visible} onRequestClose={close}><SafeAreaView style={styles.modalSafe}><ScrollView automaticallyAdjustKeyboardInsets contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.modalContent}>
    <View style={styles.modalHeader}><Pressable onPress={close}><Text style={styles.backText}>Cancel</Text></Pressable><Text style={styles.modalTitle}>Add ability</Text><Pressable disabled={!title.trim() || saving} onPress={() => { void save(); }}><Text style={[styles.saveText, (!title.trim() || saving) && styles.faded]}>{saving ? 'Saving…' : 'Save'}</Text></Pressable></View>
    <Text style={styles.label}>Ability</Text><TextInput value={title} onChangeText={setTitle} placeholder="e.g. Hold eye contact" placeholderTextColor={colors.textSecondary} style={styles.input} />
    <Text style={styles.label}>Why it matters</Text><TextInput multiline value={description} onChangeText={setDescription} placeholder="A short explanation" placeholderTextColor={colors.textSecondary} style={[styles.input, styles.multiline]} />
    <Text style={styles.label}>Practice</Text><TextInput multiline value={prompt} onChangeText={setPrompt} placeholder="What should you do to practise it?" placeholderTextColor={colors.textSecondary} style={[styles.input, styles.multiline]} />
    <Text style={styles.label}>Success looks like</Text><TextInput multiline value={criteria} onChangeText={setCriteria} placeholder="How will you know you did it well?" placeholderTextColor={colors.textSecondary} style={[styles.input, styles.multiline]} />
    <Text style={styles.label}>Evidence angle</Text><Text style={styles.helper}>A robust skill needs more than factual recall. Choose what this practice proves.</Text><View style={styles.dimensionChoices}>{SKILL_DIMENSIONS.map((item) => <Pressable key={item} onPress={() => setDimension(item)} style={[styles.dimensionChoice, dimension === item && styles.dimensionChoiceSelected]}><Text style={[styles.dimensionChoiceText, dimension === item && styles.dimensionChoiceTextSelected]}>{SKILL_DIMENSION_LABELS[item]}</Text></Pressable>)}</View>
    {tree.nodes.length ? <><Text style={styles.label}>Prerequisites</Text><Text style={styles.helper}>Choose everything that should be reliable first.</Text><View style={styles.choiceList}>{tree.nodes.map((node) => { const checked = prerequisites.includes(node.id); return <Pressable key={node.id} onPress={() => setPrerequisites((items) => checked ? items.filter((item) => item !== node.id) : [...items, node.id])} style={styles.choice}><SymbolView name={checked ? { ios: 'checkmark.circle.fill', android: 'check_circle' } : { ios: 'circle', android: 'radio_button_unchecked' }} size={22} tintColor={checked ? colors.accent : colors.textSecondary} /><Text style={styles.choiceText}>{node.title}</Text></Pressable>; })}</View></> : null}
  </ScrollView></SafeAreaView></Modal>;
}

function NodeModal({ node, tree, onClose, onPractice, onSelect }: { node: SkillTreeNodeView | null; tree: SkillTreeDetail; onClose: () => void; onPractice: (node: SkillTreeNodeView) => void; onSelect: (node: SkillTreeNodeView) => void }) {
  const colors = SkillColors; const styles = useMemo(() => createStyles(colors), [colors]);
  if (!node) return null;
  const requirements = node.prerequisites.map(id => tree.nodes.find(item => item.id === id)).filter((item): item is SkillTreeNodeView => Boolean(item));
  return <Modal animationType="slide" transparent visible onRequestClose={onClose}><View style={styles.scrim}>
    <Pressable accessibilityLabel="Close lesson preview" onPress={onClose} style={StyleSheet.absoluteFill} />
    <View style={styles.detailSheet}><View style={styles.sheetHandle} /><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
      <View style={styles.modalHeader}><Text style={styles.detailKind}>{STATUS_LABEL[node.status].toUpperCase()}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close lesson preview" onPress={onClose} style={styles.iconButton}><SymbolView name={{ ios: 'xmark', android: 'close' }} size={20} tintColor={colors.textSecondary} /></Pressable></View>
      <Text style={styles.detailTitle}>{node.title}</Text><Text style={styles.detailCopy}>{node.description || 'Build this skill through focused, independent practice.'}</Text>
      {requirements.length ? <View style={styles.requirementBox}><Text style={styles.label}>Builds on</Text>{requirements.map(item => { const reliable = item.status === 'reliable' || item.status === 'mastered'; return <Pressable key={item.id} accessibilityRole="button" onPress={() => onSelect(item)} style={styles.requirementRow}><SymbolView name={reliable ? { ios: 'checkmark.circle.fill', android: 'check_circle' } : { ios: 'circle', android: 'radio_button_unchecked' }} size={17} tintColor={reliable ? colors.success : colors.textSecondary} /><Text style={styles.requirement}>{item.title}</Text><SymbolView name={{ ios: 'chevron.right', android: 'chevron_right' }} size={15} tintColor={colors.textSecondary} /></Pressable>; })}</View> : null}
      <View style={styles.lessonSection}><Text style={styles.label}>The exercise</Text><Text style={styles.detailCopy}>{node.practicePrompt || `Practise ${node.title.toLowerCase()} in a realistic situation.`}</Text></View>
      <View style={styles.lessonSection}><Text style={styles.label}>What good looks like</Text><Text style={styles.detailCopy}>{node.successCriteria || 'Perform the skill independently and explain your choices.'}</Text></View>
      {node.sourceReferences.length ? <View style={styles.lessonSection}><Text style={styles.label}>Source notes</Text>{node.sourceReferences.map(source => <View key={`${source.annotationId}-${source.locator}`}><Text style={styles.sourceName}>{source.bookTitle}</Text><Text style={styles.sourceExcerpt}>{source.excerpt}</Text></View>)}</View> : null}
      {node.status === 'locked' ? <Text style={styles.lockedHelp}>Unlock by completing the prerequisites above.</Text> : <Pressable accessibilityRole="button" onPress={() => onPractice(node)} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Start practice</Text><SymbolView name={{ ios: 'arrow.right', android: 'arrow_forward' }} size={18} tintColor={colors.onAction} /></Pressable>}
    </ScrollView></View>
  </View></Modal>;
}

function createStyles(colors: AppColors) { return StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, content: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 120, width: '100%', maxWidth: 760, alignSelf: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 42 }, backRow: { flexDirection: 'row', alignItems: 'center', minHeight: 42, marginLeft: -7 }, backText: { color: colors.accent, fontFamily: Fonts.semibold, fontSize: 15 }, iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: colors.accent, fontFamily: Fonts.extraBold, fontSize: 11, letterSpacing: 1.8, marginTop: 10 }, title: { color: colors.text, fontFamily: Fonts.bold, fontSize: 34, lineHeight: 41, marginTop: 5 }, intro: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 15, lineHeight: 23, marginTop: 7, marginBottom: 22 },
  formCard: { gap: 10, padding: 18, borderRadius: 22, borderCurve: 'continuous', backgroundColor: colors.backgroundElement, borderWidth: 1, borderColor: colors.line }, label: { color: colors.text, fontFamily: Fonts.bold, fontSize: 13, marginTop: 5 }, input: { minHeight: 50, color: colors.text, fontFamily: Fonts.sans, fontSize: 15, borderRadius: 13, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.background, paddingHorizontal: 14, paddingVertical: 12 }, multiline: { minHeight: 82, textAlignVertical: 'top' },
  primaryButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 14, borderCurve: 'continuous', backgroundColor: colors.action, paddingHorizontal: 16 }, primaryButtonText: { color: colors.onAction, fontFamily: Fonts.bold, fontSize: 14 }, secondaryButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 14, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.backgroundElement }, secondaryButtonText: { color: colors.accent, fontFamily: Fonts.bold, fontSize: 14 }, disabled: { opacity: 0.38 },
  summaryCard: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, borderRadius: 18, borderCurve: 'continuous', backgroundColor: colors.backgroundElement, borderWidth: 1, borderColor: colors.line }, summaryValue: { color: colors.text, fontFamily: Fonts.bold, fontSize: 20, textAlign: 'center' }, summaryLabel: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }, growthCard: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 9, paddingHorizontal: 15, paddingVertical: 11, borderRadius: 14, borderCurve: 'continuous', backgroundColor: colors.accentSoft }, growthValue: { color: colors.text, fontFamily: Fonts.bold, fontSize: 14 }, growthLabel: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 9, textTransform: 'uppercase', marginTop: 2 }, growthRight: { alignItems: 'flex-end' }, actions: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 24 }, actionButton: { flex: 1 },
  emptyCard: { alignItems: 'center', padding: 30, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.line, borderRadius: 20 }, emptyTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 17 }, emptyCopy: { color: colors.textSecondary, fontFamily: Fonts.sans, textAlign: 'center', fontSize: 13, lineHeight: 20, marginTop: 6 }, empty: { color: colors.textSecondary, margin: 30, textAlign: 'center' },
  modalSafe: { flex: 1, backgroundColor: colors.background }, modalContent: { paddingHorizontal: 20, paddingBottom: 50, gap: 9 }, modalHeader: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: colors.line, marginBottom: 12 }, modalTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 17 }, saveText: { color: colors.accent, fontFamily: Fonts.bold, fontSize: 15 }, faded: { opacity: 0.4 }, helper: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 12 }, dimensionChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, dimensionChoice: { paddingHorizontal: 11, paddingVertical: 9, borderRadius: 11, borderCurve: 'continuous', backgroundColor: colors.backgroundElement, borderWidth: 1, borderColor: colors.line }, dimensionChoiceSelected: { backgroundColor: colors.accentSoft, borderColor: colors.accent }, dimensionChoiceText: { color: colors.textSecondary, fontFamily: Fonts.semibold, fontSize: 11 }, dimensionChoiceTextSelected: { color: colors.text }, choiceList: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.line }, choice: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, backgroundColor: colors.backgroundElement, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line }, choiceText: { flex: 1, color: colors.text, fontFamily: Fonts.sans, fontSize: 14 },
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(17,30,52,0.36)' }, detailSheet: { maxHeight: '88%', borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.backgroundElement }, sheetHandle: { width: 36, height: 4, borderRadius: 4, backgroundColor: colors.line, alignSelf: 'center', marginTop: 12 }, sheetContent: { paddingHorizontal: 24, paddingBottom: 48, gap: 14 }, lessonSection: { gap: 6, paddingBottom: 14, borderBottomWidth: 1, borderColor: colors.line }, requirementRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9 }, detailTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 26, lineHeight: 32, letterSpacing: -0.5 }, detailKind: { color: colors.accent, fontFamily: Fonts.extraBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }, detailCopy: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 22 }, requirementBox: { padding: 14, borderRadius: 14, borderCurve: 'continuous', backgroundColor: colors.backgroundSelected, gap: 7 }, requirement: { flex: 1, color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 13 }, sourceName: { color: colors.text, fontFamily: Fonts.bold, fontSize: 11 }, sourceExcerpt: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 11, lineHeight: 16, marginTop: 2 }, lockedHelp: { color: colors.textSecondary, fontFamily: Fonts.semibold, fontSize: 13, lineHeight: 20, textAlign: 'center', padding: 14 }, closeButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
}); }
