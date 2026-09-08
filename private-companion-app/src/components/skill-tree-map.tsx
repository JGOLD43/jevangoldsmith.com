import { SymbolView } from 'expo-symbols';
import { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SkillColors, SkillFonts as Fonts } from '@/constants/skill-theme';
import { layoutSkillTree } from '@/learning/skill-tree-layout';
import type { SkillTreeNodeView } from '@/learning/types';

export const SkillTreeMap = memo(function SkillTreeMap({ nodes, onSelect, nextId }: { nodes: SkillTreeNodeView[]; onSelect: (node: SkillTreeNodeView) => void; nextId?: string }) {
  const colors = SkillColors;
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const layout = useMemo(() => width ? layoutSkillTree(nodes, width, fontScale) : null, [nodes, width, fontScale]);
  const byId = useMemo(() => new Map(nodes.map(node => [node.id, node])), [nodes]);
  const styles = useMemo(() => StyleSheet.create({
    canvas: { width: '100%' },
    level: { position: 'absolute', color: colors.textSecondary, fontFamily: Fonts.medium, fontSize: 10, letterSpacing: 1.3, backgroundColor: colors.background, paddingHorizontal: 8, paddingVertical: 2 },
    card: { position: 'absolute', borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.backgroundElement, padding: 14, justifyContent: 'space-between' },
    active: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    number: { color: colors.textSecondary, fontFamily: Fonts.mono, fontSize: 11 },
    title: { color: colors.text, fontFamily: Fonts.semibold, fontSize: 14, lineHeight: 19, marginVertical: 6 },
    status: { color: colors.textSecondary, fontFamily: Fonts.medium, fontSize: 10 },
    edge: { position: 'absolute', borderRadius: 2 },
  }), [colors]);
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={[styles.canvas, { height: layout?.height ?? 200 }]}>
    {layout?.connections.flatMap(edge => edge.points.slice(1).map((point, index) => {
      const previous = edge.points[index];
      const connected = byId.get(edge.from)?.status === 'reliable' || byId.get(edge.from)?.status === 'mastered';
      return <View pointerEvents="none" key={`${edge.from}-${edge.to}-${index}`} style={[styles.edge, { left: Math.min(previous.x, point.x) - 0.75, top: Math.min(previous.y, point.y), width: Math.max(1.5, Math.abs(point.x - previous.x)), height: Math.max(1.5, Math.abs(point.y - previous.y)), backgroundColor: connected ? colors.accent : colors.line }]} />;
    }))}
    {layout?.headings.map(heading => <Text key={heading.depth} style={[styles.level, { top: heading.y, left: 12 }]}>{String(heading.depth + 1).padStart(2, '0')}  /  {heading.depth === 0 ? 'FOUNDATIONS' : `STAGE ${heading.depth + 1}`}</Text>)}
    {layout?.positions.map((position, index) => {
      const node = byId.get(position.id)!;
      const next = node.id === nextId;
      const complete = node.status === 'reliable' || node.status === 'mastered';
      const locked = node.status === 'locked';
      const status = next ? 'Up next' : complete ? 'Reliable' : locked ? 'Locked' : node.status === 'practising' ? 'In practice' : 'Ready';
      return <Pressable key={node.id} accessibilityRole="button" accessibilityLabel={`${node.title}. ${status}. Open lesson details.`} onPress={() => onSelect(node)} style={({ pressed }) => [styles.card, { left: position.x, top: position.y, width: position.width, height: position.height }, next && styles.active, pressed && { opacity: 0.75 }]}>
        <View style={styles.top}><Text style={styles.number}>{String(index + 1).padStart(2, '0')}</Text><SymbolView name={complete ? { ios: 'checkmark.circle.fill', android: 'check_circle' } : locked ? { ios: 'lock', android: 'lock_outline' } : { ios: 'arrow.up.right', android: 'north_east' }} size={17} tintColor={next || complete ? colors.accent : colors.textSecondary} /></View>
        <Text numberOfLines={3} style={[styles.title, locked && { color: colors.textSecondary }]}>{node.title}</Text>
        <Text style={[styles.status, next && { color: colors.text }]}>{status}</Text>
      </Pressable>;
    })}
  </View>;
});
