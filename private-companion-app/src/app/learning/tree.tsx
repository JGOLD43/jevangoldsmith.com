import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, type AppColors } from '@/constants/theme';
import { resolvedStatus } from '@/learning/engine';
import { FRENCH_SKILLS, FRENCH_SKILLS_BY_ID, FRENCH_SKILL_STAGES, skillsForStage, unlockedSkillIds, type FrenchSkillStage } from '@/learning/french-seed';
import type { FrenchSkill, LearningSkillState, LearningSkillStatus } from '@/learning/types';
import { useTheme } from '@/hooks/use-theme';
import { useLearning } from '@/state/learning-context';

type NodeProps = { skill: FrenchSkill; state?: LearningSkillState; status: LearningSkillStatus; onPress: (skill: FrenchSkill) => void };

const SkillNode = memo(function SkillNode({ skill, state, status, onPress }: NodeProps) {
  const colors = useTheme(); const styles = useMemo(() => createStyles(colors), [colors]);
  const reliable = status === 'reliable' || status === 'automatic'; const locked = status === 'locked';
  return <Pressable accessibilityLabel={`${skill.title}, ${status}`} accessibilityRole="button" onPress={() => onPress(skill)} style={({ pressed }) => [styles.node, reliable ? styles.nodeReliable : null, locked ? styles.nodeLocked : null, pressed ? styles.pressed : null]}>
    <View style={styles.nodeTop}>
      <View style={[styles.nodeIcon, reliable ? styles.nodeIconReliable : null]}><SymbolView name={{ ios: reliable ? 'checkmark' : locked ? 'lock.fill' : 'bolt.fill', android: reliable ? 'check' : locked ? 'lock' : 'bolt' }} size={14} tintColor={reliable ? colors.onAction : locked ? colors.textSecondary : colors.accent} /></View>
      <Text style={styles.nodePercent}>{state?.strength ?? 0}%</Text>
    </View>
    <Text numberOfLines={2} style={styles.nodeTitle}>{skill.title}</Text>
    <Text style={styles.nodeStatus}>{status}</Text>
  </Pressable>;
});

const Stage = memo(function Stage({ stage, states, onNodePress }: { stage: FrenchSkillStage; states: LearningSkillState[]; onNodePress: (skill: FrenchSkill) => void }) {
  const colors = useTheme(); const styles = useMemo(() => createStyles(colors), [colors]);
  const stateMap = useMemo(() => new Map(states.map((state) => [state.skillId, state])), [states]);
  const skills = useMemo(() => skillsForStage(stage), [stage]);
  const complete = skills.filter((skill) => { const status = resolvedStatus(skill, stateMap.get(skill.id), stateMap); return status === 'reliable' || status === 'automatic'; }).length;
  return <View style={styles.stage}>
    {stage.number > 1 ? <View style={styles.connector}><View style={styles.connectorLine} /><View style={styles.connectorArrow}><SymbolView name={{ ios: 'chevron.down', android: 'keyboard_arrow_down' }} size={17} tintColor={colors.accent} /></View></View> : null}
    <View style={styles.stageHeader}>
      <View style={styles.stageNumber}><Text style={styles.stageNumberText}>{stage.number}</Text></View>
      <View style={styles.stageCopy}><View style={styles.stageTitleRow}><Text style={styles.stageTitle}>{stage.title}</Text><Text style={styles.stageLevel}>{stage.level}</Text></View><Text style={styles.stageOutcome}>{stage.outcome}</Text></View>
      <Text style={styles.stageCount}>{complete}/{skills.length}</Text>
    </View>
    <View style={styles.nodes}>{skills.map((skill) => <SkillNode key={skill.id} skill={skill} state={stateMap.get(skill.id)} status={resolvedStatus(skill, stateMap.get(skill.id), stateMap)} onPress={onNodePress} />)}</View>
  </View>;
});

export default function FrenchSkillTreeScreen() {
  const router = useRouter(); const colors = useTheme(); const styles = useMemo(() => createStyles(colors), [colors]); const { states, dashboard } = useLearning();
  const [selected, setSelected] = useState<FrenchSkill | null>(null); const stateMap = useMemo(() => new Map(states.map((state) => [state.skillId, state])), [states]);
  const openNode = useCallback((skill: FrenchSkill) => setSelected(skill), []);
  const selectedState = selected ? stateMap.get(selected.id) : undefined; const selectedStatus = selected ? resolvedStatus(selected, selectedState, stateMap) : 'locked';
  const requirements = selected?.prerequisites.map((id) => FRENCH_SKILLS_BY_ID.get(id)?.title ?? id) ?? [];
  const unlocks = selected ? unlockedSkillIds(selected.id).map((id) => FRENCH_SKILLS_BY_ID.get(id)?.title ?? id) : [];
  return <SafeAreaView edges={['top']} style={styles.safe}>
    <FlatList data={FRENCH_SKILL_STAGES} keyExtractor={(stage) => stage.id} contentContainerStyle={styles.content} renderItem={({ item }) => <Stage stage={item} states={states} onNodePress={openNode} />} ListHeaderComponent={<View style={styles.header}>
      <View style={styles.topbar}><Pressable accessibilityLabel="Back" hitSlop={12} onPress={() => router.back()}><SymbolView name={{ ios: 'chevron.left', android: 'arrow_back' }} size={25} tintColor={colors.text} /></Pressable><View style={styles.titleCopy}><Text style={styles.eyebrow}>FRENCH · COMPLETE PATH</Text><Text style={styles.title}>Skill tree</Text></View></View>
      <Text style={styles.intro}>Every line is a dependency. Make a skill reliable to open the abilities below it.</Text>
      <View style={styles.summary}><View><Text style={styles.summaryValue}>{dashboard?.reliableSkills ?? 0}/{FRENCH_SKILLS.length}</Text><Text style={styles.summaryLabel}>Reliable abilities</Text></View><View style={styles.summaryDivider} /><View><Text style={styles.summaryValue}>{FRENCH_SKILL_STAGES.length}</Text><Text style={styles.summaryLabel}>Progression stages</Text></View><View style={styles.summaryDivider} /><View><Text style={styles.summaryValue}>{dashboard?.milestoneProgress ?? 0}%</Text><Text style={styles.summaryLabel}>Next milestone</Text></View></View>
      <View style={styles.legend}><View style={styles.legendItem}><View style={[styles.legendDot, styles.legendReady]} /><Text style={styles.legendText}>Ready</Text></View><View style={styles.legendItem}><View style={[styles.legendDot, styles.legendReliable]} /><Text style={styles.legendText}>Reliable</Text></View><View style={styles.legendItem}><View style={[styles.legendDot, styles.legendLocked]} /><Text style={styles.legendText}>Locked</Text></View></View>
    </View>} />
    <Modal animationType="slide" transparent visible={selected !== null} onRequestClose={() => setSelected(null)}><View style={styles.modalBackdrop}><SafeAreaView edges={['bottom']} style={styles.sheet}>
      <View style={styles.sheetHandle} />
      <ScrollView contentContainerStyle={styles.sheetContent}>
        <View style={styles.sheetTop}><View style={styles.sheetTitleCopy}><Text style={styles.sheetStatus}>{selectedStatus} · {selectedState?.strength ?? 0}%</Text><Text style={styles.sheetTitle}>{selected?.title}</Text></View><Pressable accessibilityLabel="Close details" hitSlop={12} onPress={() => setSelected(null)}><SymbolView name={{ ios: 'xmark.circle.fill', android: 'cancel' }} size={28} tintColor={colors.textSecondary} /></Pressable></View>
        <Text style={styles.sheetAbility}>{selected?.ability}</Text>
        <View style={styles.phraseCard}><Text style={styles.detailLabel}>TARGET PHRASES</Text>{selected?.phrases.map((phrase) => <Text key={phrase} style={styles.phrase}>{phrase}</Text>)}<Text style={styles.meaning}>{selected?.meaning}</Text></View>
        <View style={styles.detailGrid}><View style={styles.detailBlock}><Text style={styles.detailLabel}>REQUIRES</Text><Text style={styles.detailText}>{requirements.length ? requirements.join('\n') : 'Nothing — start here'}</Text></View><View style={styles.detailBlock}><Text style={styles.detailLabel}>UNLOCKS</Text><Text style={styles.detailText}>{unlocks.length ? unlocks.join('\n') : 'Final combined ability'}</Text></View></View>
        <Pressable onPress={() => { setSelected(null); router.push('/learning/session?minutes=10'); }} style={styles.practiceButton}><Text style={styles.practiceText}>Start an adaptive session</Text><SymbolView name={{ ios: 'arrow.right', android: 'arrow_forward' }} size={19} tintColor={colors.onAction} /></Pressable>
      </ScrollView>
    </SafeAreaView></View></Modal>
  </SafeAreaView>;
}

function createStyles(colors: AppColors) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 125, width: '100%', maxWidth: 760, alignSelf: 'center' }, header: { gap: 17, paddingBottom: 10 }, topbar: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 14 }, titleCopy: { gap: 2 }, eyebrow: { color: colors.accent, fontFamily: Fonts.extraBold, fontSize: 9, letterSpacing: 1.1 }, title: { color: colors.text, fontFamily: Fonts.black, fontSize: 34, lineHeight: 39 }, intro: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 20 }, summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderRadius: 17, backgroundColor: colors.backgroundElement, borderWidth: 1, borderColor: colors.line }, summaryValue: { color: colors.text, fontFamily: Fonts.bold, fontSize: 16 }, summaryLabel: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 8, marginTop: 3, textTransform: 'uppercase' }, summaryDivider: { width: 1, height: 30, backgroundColor: colors.line }, legend: { flexDirection: 'row', gap: 16 }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 }, legendDot: { width: 9, height: 9, borderRadius: 5 }, legendReady: { backgroundColor: colors.accent }, legendReliable: { backgroundColor: colors.success }, legendLocked: { backgroundColor: colors.backgroundSelected, borderWidth: 1, borderColor: colors.textSecondary }, legendText: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 9 },
  stage: { paddingTop: 8 }, connector: { height: 45, alignItems: 'center', justifyContent: 'center' }, connectorLine: { width: 2, height: 31, backgroundColor: colors.accent }, connectorArrow: { position: 'absolute', bottom: -1, width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.accentSoft }, stageHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, marginBottom: 12 }, stageNumber: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.action }, stageNumberText: { color: colors.onAction, fontFamily: Fonts.bold, fontSize: 14 }, stageCopy: { flex: 1, minWidth: 0, gap: 4 }, stageTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, stageTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 17 }, stageLevel: { color: colors.accent, fontFamily: Fonts.extraBold, fontSize: 9 }, stageOutcome: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 10, lineHeight: 15 }, stageCount: { color: colors.textSecondary, fontFamily: Fonts.bold, fontSize: 10 }, nodes: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, node: { width: '48%', flexGrow: 1, minHeight: 112, borderRadius: 16, padding: 13, gap: 7, backgroundColor: colors.backgroundElement, borderWidth: 1, borderColor: colors.accent }, nodeReliable: { borderColor: colors.success }, nodeLocked: { borderColor: colors.line, opacity: .52 }, nodeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, nodeIcon: { width: 27, height: 27, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft }, nodeIconReliable: { backgroundColor: colors.success }, nodePercent: { color: colors.textSecondary, fontFamily: Fonts.bold, fontSize: 9 }, nodeTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 13, lineHeight: 17 }, nodeStatus: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 8, textTransform: 'uppercase', letterSpacing: .4 }, pressed: { opacity: .72, transform: [{ scale: .985 }] },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.58)' }, sheet: { maxHeight: '83%', borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: colors.background }, sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginTop: 9 }, sheetContent: { padding: 22, paddingBottom: 30, gap: 18 }, sheetTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 }, sheetTitleCopy: { flex: 1, gap: 5 }, sheetStatus: { color: colors.accent, fontFamily: Fonts.extraBold, fontSize: 9, textTransform: 'uppercase', letterSpacing: .8 }, sheetTitle: { color: colors.text, fontFamily: Fonts.black, fontSize: 26, lineHeight: 32 }, sheetAbility: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 20 }, phraseCard: { padding: 17, borderRadius: 17, gap: 8, backgroundColor: colors.backgroundElement, borderWidth: 1, borderColor: colors.line }, detailLabel: { color: colors.accent, fontFamily: Fonts.extraBold, fontSize: 8, letterSpacing: .8 }, phrase: { color: colors.text, fontFamily: Fonts.bold, fontSize: 16, lineHeight: 22 }, meaning: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 11, lineHeight: 17, paddingTop: 4 }, detailGrid: { flexDirection: 'row', gap: 9 }, detailBlock: { flex: 1, minHeight: 90, padding: 13, borderRadius: 14, backgroundColor: colors.backgroundElement, gap: 7 }, detailText: { color: colors.text, fontFamily: Fonts.medium, fontSize: 10, lineHeight: 16 }, practiceButton: { minHeight: 55, borderRadius: 15, backgroundColor: colors.action, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 }, practiceText: { color: colors.onAction, fontFamily: Fonts.bold, fontSize: 14 },
}); }
