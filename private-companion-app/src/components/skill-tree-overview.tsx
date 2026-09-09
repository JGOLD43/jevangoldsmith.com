import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SkillColors as c, SkillFonts as f } from '@/constants/skill-theme';
import { MARKETING_RESOURCES, MARKETING_PREPARATION } from '@/learning/marketing-curricula';
import { CURRICULUM_RESOURCES } from '@/learning/priority-curricula';
import type { SkillTreeAnalytics, SkillTreeDetail, SkillTreeNodeView } from '@/learning/types';
import type { getPracticeTime } from '@/storage/practice-time-repository';
import { SkillTreeMap } from './skill-tree-map';

type Props = { tree: SkillTreeDetail; analytics: SkillTreeAnalytics | null; time: Awaited<ReturnType<typeof getPracticeTime>> | null; next: SkillTreeNodeView | null; onBack: () => void; onAdd: () => void; onDelete: () => void; onSelect: (node: SkillTreeNodeView) => void; onPractice: (node: SkillTreeNodeView) => void };
const open = (url: string) => { void Linking.openURL(url).catch(() => Alert.alert('Could not open resource', url)); };

export function SkillTreeOverview({ tree, analytics, time, next, onBack, onAdd, onDelete, onSelect, onPractice }: Props) {
  const [tab, setTab] = useState<'Tree' | 'Resources' | 'Activity'>('Tree');
  const reliable = tree.nodes.filter(node => node.status === 'reliable' || node.status === 'mastered').length;
  const percent = tree.nodes.length ? Math.round(reliable / tree.nodes.length * 100) : 0;
  const resources = MARKETING_RESOURCES[tree.title] ?? CURRICULUM_RESOURCES[tree.title] ?? [];
  const preparation = MARKETING_PREPARATION[tree.title] ?? [];
  const menu = () => Alert.alert('Manage this skill tree', tree.title, [{ text: 'Add an ability', onPress: onAdd }, { text: 'Delete tree', style: 'destructive', onPress: onDelete }, { text: 'Cancel', style: 'cancel' }]);
  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <View style={s.nav}><Pressable accessibilityRole="button" accessibilityLabel="Back to skill library" onPress={onBack} style={s.back}><SymbolView name={{ ios: 'arrow.left', android: 'arrow_back' }} size={20} tintColor={c.text} /><Text style={s.backText}>Skills</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Manage skill tree" onPress={menu} style={s.menu}><SymbolView name={{ ios: 'ellipsis', android: 'more_horiz' }} size={22} tintColor={c.textSecondary} /></Pressable></View>
    <View style={s.heading}><Text style={s.title}>{tree.title}</Text></View>
    <View style={s.progressRow}><Text style={s.progressLabel}><Text style={s.progressStrong}>{reliable} of {tree.nodes.length}</Text> reliable</Text><Text style={s.progressLabel}>{Math.round((time?.totalMs ?? 0) / 60_000)} min practice</Text></View>
    <View accessibilityRole="progressbar" accessibilityLabel="Reliable skills" accessibilityValue={{ min: 0, max: tree.nodes.length || 1, now: reliable }} style={s.track}><View style={[s.fill, { width: `${percent}%` }]} /></View>
    <View accessibilityRole="tablist" style={s.tabs}>{(['Tree', 'Resources', 'Activity'] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: tab === value }} onPress={() => setTab(value)} style={[s.tab, tab === value && s.tabSelected]}><Text style={[s.tabText, tab === value && s.tabTextSelected]}>{value}</Text>{value === 'Resources' && resources.length ? <Text style={[s.tabCount, tab === value && s.tabTextSelected]}>{resources.length}</Text> : null}</Pressable>)}</View>
    {tab === 'Tree' ? <>
      {next ? <Pressable accessibilityRole="button" accessibilityLabel={`Practise ${next.title}`} onPress={() => onPractice(next)} style={({ pressed }) => [s.continue, pressed && s.pressed]}><View style={s.continueIcon}><SymbolView name={{ ios: 'play.fill', android: 'play_arrow' }} size={22} tintColor={c.onAction} /></View><View style={s.continueCopy}><Text style={s.continueLabel}>NEXT</Text><Text style={s.continueTitle}>{next.title}</Text></View><SymbolView name={{ ios: 'arrow.right', android: 'arrow_forward' }} size={19} tintColor={c.accent} /></Pressable> : null}
      <View style={s.mapIntro} />
      {tree.nodes.length ? <SkillTreeMap nodes={tree.nodes} nextId={next?.id} onSelect={onSelect} /> : <Pressable onPress={onAdd} style={s.empty}><Text style={s.sectionTitle}>Add a skill</Text></Pressable>}
      <View style={s.legend}><Text style={s.legendText}>● Up next</Text><Text style={s.legendText}>✓ Reliable</Text><Text style={s.legendText}>⌑ Locked</Text></View>
      
    </> : tab === 'Resources' ? <View style={s.panel}>
      
      {preparation.length ? <Text style={s.body}>Preparation: {preparation.join(" · ")}</Text> : null}
      {resources.map((resource, index) => <Pressable key={resource.url} accessibilityRole="link" onPress={() => open(resource.url)} style={({ pressed }) => [s.resource, pressed && s.pressed]}><Text style={s.resourceNumber}>{String(index + 1).padStart(2, '0')}</Text><View style={s.resourceCopy}><Text style={s.resourceTitle}>{resource.title}</Text><Text style={s.body}>{resource.when}</Text></View><SymbolView name={{ ios: 'arrow.up.right', android: 'north_east' }} size={18} tintColor={c.accent} /></Pressable>)}
      {!resources.length ? <Text style={s.body}>No resources added.</Text> : null}
      <Pressable accessibilityRole="link" onPress={() => open('https://www.justinmath.com/advice-on-upskilling/')} style={s.method}><Text style={s.resourceTitle}>Advice on Upskilling · Justin Skycak ↗</Text></Pressable>
    </View> : <View style={s.panel}>
      
      <View style={s.stats}><View style={s.stat}><Text style={s.statValue}>{Math.round((time?.weekMs ?? 0) / 60_000)}</Text><Text style={s.statLabel}>practice min · 7 days</Text></View><View style={s.stat}><Text style={s.statValue}>{Math.round((time?.studyMs ?? 0) / 60_000)}</Text><Text style={s.statLabel}>study min · total</Text></View></View>
      <Text style={s.sectionTitle}>Sessions</Text>
      {time?.recent.length ? time.recent.map((log, index) => <View key={`${log.created_at}-${index}`} style={s.journal}><View style={s.journalHeading}><Text style={s.journalDate}>{new Date(log.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</Text><Text style={s.journalMeta}>{(log.duration_ms / 60_000).toFixed(1)} min · {log.kind === 'practice' ? 'Practice' : 'Study'}</Text></View><Text style={s.resourceTitle}>{log.title}</Text><Text selectable style={s.body}>{log.note}</Text></View>) : <View style={s.empty}><SymbolView name={{ ios: 'clock', android: 'schedule' }} size={28} tintColor={c.accent} /><Text style={s.resourceTitle}>No sessions yet.</Text></View>}
      
    </View>}
  </ScrollView>;
}

const s = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 125, width: '100%', maxWidth: 640, alignSelf: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, back: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9 }, backText: { color: c.text, fontFamily: f.medium, fontSize: 14 }, menu: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  heading: { gap: 8 }, eyebrow: { color: c.accent, fontFamily: f.medium, fontSize: 10, letterSpacing: 1.5 }, title: { color: c.text, fontFamily: f.bold, fontSize: 30, lineHeight: 35, letterSpacing: -0.8 }, description: { color: c.textSecondary, fontFamily: f.sans, fontSize: 13, lineHeight: 20 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 20 }, progressLabel: { color: c.textSecondary, fontFamily: f.sans, fontSize: 11 }, progressStrong: { color: c.text, fontFamily: f.medium }, track: { height: 4, backgroundColor: c.line, borderRadius: 4, marginTop: 10, overflow: 'hidden' }, fill: { height: 4, backgroundColor: c.accent },
  tabs: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 13, backgroundColor: c.backgroundSelected, marginTop: 22, marginBottom: 20 }, tab: { flex: 1, minHeight: 44, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', borderRadius: 9 }, tabSelected: { backgroundColor: c.backgroundElement, boxShadow: '0 2px 5px rgba(23,36,59,0.06)' }, tabText: { color: c.textSecondary, fontFamily: f.medium, fontSize: 13 }, tabTextSelected: { color: c.text }, tabCount: { color: c.textSecondary, fontSize: 10 },
  continue: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 15, borderWidth: 1, borderColor: '#D9E2FF', borderRadius: 17, backgroundColor: c.backgroundElement, boxShadow: '0 4px 16px rgba(23,36,59,0.03)' }, continueIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }, continueCopy: { flex: 1, gap: 5 }, continueLabel: { color: c.accent, fontFamily: f.medium, fontSize: 9, letterSpacing: 1.1 }, continueTitle: { color: c.text, fontFamily: f.medium, fontSize: 14, lineHeight: 19 },
  mapIntro: { marginTop: 24, marginBottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, sectionTitle: { color: c.text, fontFamily: f.medium, fontSize: 18, letterSpacing: -0.3 }, mapHint: { color: c.textSecondary, fontFamily: f.sans, fontSize: 10 }, legend: { flexDirection: 'row', justifyContent: 'center', gap: 13, marginVertical: 15 }, legendText: { color: c.textSecondary, fontFamily: f.sans, fontSize: 10 }, footnote: { color: c.textSecondary, fontFamily: f.sans, fontSize: 11, lineHeight: 18, marginTop: 8 },
  panel: { gap: 14, paddingTop: 4 }, body: { color: c.textSecondary, fontFamily: f.sans, fontSize: 13, lineHeight: 21 }, resource: { flexDirection: 'row', gap: 12, paddingVertical: 18, borderBottomWidth: 1, borderColor: c.line }, resourceNumber: { color: c.accent, fontFamily: f.mono, fontSize: 12, paddingTop: 3 }, resourceCopy: { flex: 1, gap: 6 }, resourceTitle: { color: c.text, fontFamily: f.medium, fontSize: 15, lineHeight: 22 }, method: { padding: 18, backgroundColor: c.accentSoft, gap: 8, borderRadius: 16, marginTop: 8 },
  stats: { flexDirection: 'row', gap: 12, marginVertical: 8 }, stat: { flex: 1, padding: 20, borderWidth: 1, borderColor: c.line, backgroundColor: c.backgroundElement, borderRadius: 16 }, statValue: { color: c.text, fontFamily: f.medium, fontSize: 30 }, statLabel: { color: c.textSecondary, fontFamily: f.sans, fontSize: 10, marginTop: 6 }, journal: { borderBottomWidth: 1, borderColor: c.line, paddingVertical: 16, gap: 7 }, journalHeading: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, journalDate: { color: c.accent, fontFamily: f.medium, fontSize: 11 }, journalMeta: { color: c.textSecondary, fontFamily: f.sans, fontSize: 11 }, empty: { padding: 24, alignItems: 'flex-start', gap: 12, borderWidth: 1, borderColor: c.line, borderRadius: 18, backgroundColor: c.backgroundElement }, pressed: { opacity: 0.7 },
});
