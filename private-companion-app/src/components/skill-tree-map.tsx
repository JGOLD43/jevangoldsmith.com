import { SymbolView } from 'expo-symbols';
import { memo, useMemo, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, type AppColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SKILL_DIMENSION_LABELS } from '@/learning/adaptive-skill-engine';
import type { SkillTreeNodeStatus, SkillTreeNodeView } from '@/learning/types';

type SkillTreeMapProps = {
  nodes: SkillTreeNodeView[];
  onSelect: (node: SkillTreeNodeView) => void;
};

const STATUS_COPY: Record<SkillTreeNodeStatus, string> = {
  locked: 'Locked',
  ready: 'Ready now',
  practising: 'In progress',
  reliable: 'Reliable',
  mastered: 'Automatic',
};

const STATUS_SYMBOL: Record<SkillTreeNodeStatus, ComponentProps<typeof SymbolView>['name']> = {
  locked: { ios: 'lock.fill', android: 'lock' },
  ready: { ios: 'play.fill', android: 'play_arrow' },
  practising: { ios: 'flame.fill', android: 'local_fire_department' },
  reliable: { ios: 'checkmark', android: 'check' },
  mastered: { ios: 'star.fill', android: 'star' },
};

export const SkillTreeMap = memo(function SkillTreeMap({ nodes, onSelect }: SkillTreeMapProps) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const levels = useMemo(() => [...new Set(nodes.map((node) => node.depth))], [nodes]);

  return <View style={styles.map}>
    <View style={styles.mapHeader}>
      <View><Text style={styles.mapEyebrow}>PROGRESSION MAP</Text><Text style={styles.mapTitle}>Build upward from the frontier.</Text></View>
      <View style={styles.legend}><Legend color={colors.success} label="Reliable" /><Legend color={colors.accent} label="Ready" /></View>
    </View>
    {levels.map((depth, index) => {
      const levelNodes = nodes.filter((node) => node.depth === depth);
      const previousLevel = index > 0 ? nodes.filter((node) => node.depth === levels[index - 1]) : [];
      return <View key={depth}>
        {index > 0 ? <BranchConnector count={Math.max(previousLevel.length, levelNodes.length)} /> : null}
        <View style={styles.levelHeader}><View style={styles.levelLine} /><Text style={styles.levelLabel}>{depth === 0 ? 'FOUNDATIONS' : `LEVEL ${depth + 1}`}</Text><View style={styles.levelLine} /></View>
        <View style={styles.levelNodes}>{levelNodes.map((node) => <SkillTreeMapNode key={node.id} node={node} onPress={onSelect} />)}</View>
      </View>;
    })}
  </View>;
});

const Legend = memo(function Legend({ color, label }: { color: string; label: string }) {
  const colors = useTheme(); const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: color }]} /><Text style={styles.legendText}>{label}</Text></View>;
});

const BranchConnector = memo(function BranchConnector({ count }: { count: number }) {
  const colors = useTheme(); const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={styles.connector}>
    <View style={styles.connectorStem} />
    {count > 1 ? <View style={styles.connectorBranch} /> : null}
    <View style={styles.connectorArrow}><SymbolView name={{ ios: 'chevron.down', android: 'keyboard_arrow_down' }} size={14} tintColor={colors.accent} /></View>
  </View>;
});

const SkillTreeMapNode = memo(function SkillTreeMapNode({ node, onPress }: { node: SkillTreeNodeView; onPress: (node: SkillTreeNodeView) => void }) {
  const colors = useTheme(); const styles = useMemo(() => createStyles(colors), [colors]);
  const completed = node.status === 'reliable' || node.status === 'mastered';
  const locked = node.status === 'locked';
  const statusColor = completed ? colors.success : locked ? colors.textSecondary : colors.accent;
  const actionLabel = locked ? 'Locked ability' : `${STATUS_COPY[node.status]} ability`;
  return <Pressable accessibilityLabel={`${node.title}. ${actionLabel}.`} accessibilityRole="button" accessibilityState={{ disabled: locked }} onPress={() => onPress(node)} style={({ pressed }) => [styles.node, completed && styles.nodeComplete, locked && styles.nodeLocked, pressed && styles.nodePressed]}>
    <View style={[styles.nodeIcon, { backgroundColor: completed ? colors.success : locked ? colors.backgroundSelected : colors.accentSoft }]}><SymbolView name={STATUS_SYMBOL[node.status]} size={17} tintColor={completed ? colors.onAction : locked ? colors.textSecondary : colors.accent} /></View>
    <View style={styles.nodeCopy}>
      <Text numberOfLines={2} style={styles.nodeTitle}>{node.title}</Text>
      <Text numberOfLines={1} style={styles.nodeMeta}>{SKILL_DIMENSION_LABELS[node.dimension]}</Text>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { backgroundColor: statusColor, width: `${node.progress.strength}%` }]} /></View>
    </View>
    <Text style={[styles.nodeStatus, { color: statusColor }]}>{STATUS_COPY[node.status]}</Text>
  </Pressable>;
});

function createStyles(colors: AppColors) { return StyleSheet.create({
  map: { gap: 12, padding: 16, borderRadius: 22, borderCurve: 'continuous', backgroundColor: colors.backgroundElement, borderWidth: 1, borderColor: colors.line },
  mapHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, paddingBottom: 3 }, mapEyebrow: { color: colors.accent, fontFamily: Fonts.extraBold, fontSize: 9, letterSpacing: 1.15 }, mapTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 16, marginTop: 4 },
  legend: { alignItems: 'flex-end', gap: 5 }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 }, legendDot: { width: 7, height: 7, borderRadius: 4 }, legendText: { color: colors.textSecondary, fontFamily: Fonts.medium, fontSize: 9 },
  connector: { height: 30, alignItems: 'center', justifyContent: 'center' }, connectorStem: { width: 2, height: 28, backgroundColor: colors.accentSoft }, connectorBranch: { position: 'absolute', top: 7, width: '48%', height: 1, backgroundColor: colors.accentSoft }, connectorArrow: { position: 'absolute', bottom: -1, width: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.backgroundElement, borderWidth: 1, borderColor: colors.accentSoft },
  levelHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 9 }, levelLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.line }, levelLabel: { color: colors.textSecondary, fontFamily: Fonts.extraBold, fontSize: 8, letterSpacing: 1.05 },
  levelNodes: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, node: { flexGrow: 1, flexBasis: 156, minHeight: 112, maxWidth: 280, padding: 12, gap: 8, borderRadius: 17, borderCurve: 'continuous', backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.accent }, nodeComplete: { borderColor: colors.success }, nodeLocked: { borderColor: colors.line, opacity: 0.58 }, nodePressed: { opacity: 0.76, transform: [{ scale: 0.985 }] },
  nodeIcon: { width: 31, height: 31, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, nodeCopy: { gap: 3 }, nodeTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 13, lineHeight: 17 }, nodeMeta: { color: colors.textSecondary, fontFamily: Fonts.medium, fontSize: 9 }, nodeStatus: { fontFamily: Fonts.extraBold, fontSize: 8, letterSpacing: 0.45, textTransform: 'uppercase', marginTop: 'auto' }, progressTrack: { height: 3, overflow: 'hidden', borderRadius: 2, backgroundColor: colors.line, marginTop: 5 }, progressFill: { height: 3, borderRadius: 2 },
}); }
