import { type PropsWithChildren, type ReactNode, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, type AppColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function useStyles() {
  const colors = useTheme();
  return { colors, styles: useMemo(() => createStyles(colors), [colors]) };
}

export function Screen({ eyebrow, title, intro, action, children }: PropsWithChildren<{
  eyebrow: string;
  title: string;
  intro?: string;
  action?: ReactNode;
}>) {
  const { styles } = useStyles();
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.screenContent}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Text style={styles.title}>{title}</Text>
          </View>
          {action}
        </View>
        {intro ? <Text style={styles.intro}>{intro}</Text> : null}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  const { styles } = useStyles();
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionHeading({ title, detail }: { title: string; detail?: string }) {
  const { styles } = useStyles();
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {detail ? <Text style={styles.sectionDetail}>{detail}</Text> : null}
    </View>
  );
}

export function Button({ label, variant = 'primary', busy, style, ...props }: PressableProps & {
  label: string;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  busy?: boolean;
  style?: ViewStyle;
}) {
  const { colors, styles } = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        pressed ? styles.pressed : null,
        props.disabled ? styles.disabled : null,
        style,
      ]}
      {...props}>
      {busy ? (
        <ActivityIndicator color={variant === 'primary' ? colors.onAction : colors.text} />
      ) : (
        <Text style={[styles.buttonLabel, styles[`buttonLabel_${variant}`]]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  const { styles } = useStyles();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.chip, selected ? styles.chipSelected : null]}>
      <Text style={[styles.chipLabel, selected ? styles.chipLabelSelected : null]}>{label}</Text>
    </Pressable>
  );
}

export function Stat({ value, label, tone = 'plain' }: { value: string; label: string; tone?: 'plain' | 'accent' }) {
  const { styles } = useStyles();
  return (
    <View style={[styles.stat, tone === 'accent' ? styles.statAccent : null]}>
      <Text style={[styles.statValue, tone === 'accent' ? styles.statValueAccent : null]}>{value}</Text>
      <Text style={[styles.statLabel, tone === 'accent' ? styles.statLabelAccent : null]}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  const { styles } = useStyles();
  return (
    <Card style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </Card>
  );
}

function createStyles(color: AppColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: color.background },
    screenContent: {
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 120,
      gap: 18,
      width: '100%',
      maxWidth: 760,
      alignSelf: 'center',
    },
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
    headerCopy: { flex: 1, gap: 5 },
    eyebrow: { color: color.accent, fontFamily: Fonts.extraBold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' },
    title: { color: color.text, fontFamily: Fonts.bold, fontSize: 38, lineHeight: 44 },
    intro: { color: color.textSecondary, fontFamily: Fonts.sans, fontSize: 16, lineHeight: 24, maxWidth: 620 },
    card: { backgroundColor: color.backgroundElement, borderWidth: 1, borderColor: color.line, borderRadius: 8, padding: 18, gap: 10 },
    sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 },
    sectionTitle: { color: color.text, fontFamily: Fonts.bold, fontSize: 20 },
    sectionDetail: { color: color.textSecondary, fontFamily: Fonts.sans, fontSize: 13 },
    button: { minHeight: 46, paddingHorizontal: 17, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    button_primary: { backgroundColor: color.action },
    button_secondary: { backgroundColor: color.backgroundElement, borderWidth: 1, borderColor: color.line },
    button_quiet: { backgroundColor: color.backgroundSelected },
    button_danger: { backgroundColor: color.dangerSoft },
    buttonLabel: { fontFamily: Fonts.bold, fontSize: 15 },
    buttonLabel_primary: { color: color.onAction },
    buttonLabel_secondary: { color: color.text },
    buttonLabel_quiet: { color: color.action },
    buttonLabel_danger: { color: color.danger },
    pressed: { opacity: 0.72 },
    disabled: { opacity: 0.42 },
    chip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, backgroundColor: color.backgroundSelected },
    chipSelected: { backgroundColor: color.action },
    chipLabel: { color: color.textSecondary, fontFamily: Fonts.bold, fontSize: 13 },
    chipLabelSelected: { color: color.onAction },
    stat: { flex: 1, minWidth: 98, padding: 15, borderRadius: 8, backgroundColor: color.backgroundSelected, gap: 3 },
    statAccent: { backgroundColor: color.accentSoft },
    statValue: { color: color.action, fontFamily: Fonts.bold, fontSize: 27 },
    statValueAccent: { color: color.accent },
    statLabel: { color: color.textSecondary, fontFamily: Fonts.semibold, fontSize: 12 },
    statLabelAccent: { color: color.textSecondary },
    emptyState: { alignItems: 'flex-start', paddingVertical: 26 },
    emptyTitle: { color: color.text, fontFamily: Fonts.bold, fontSize: 21 },
    emptyBody: { color: color.textSecondary, fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22 },
  });
}
