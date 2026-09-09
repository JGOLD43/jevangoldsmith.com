import { Image } from 'expo-image';
import { memo, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type ImageStyle } from 'react-native';

import { Fonts, type AppColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const FALLBACK_PALETTES = [
  { background: '#1F2A44', ink: '#F5EEDB', accent: '#E2B84B' },
  { background: '#6E2C2C', ink: '#FFF5E7', accent: '#E6B566' },
  { background: '#214E45', ink: '#F3EBDD', accent: '#D7C47A' },
  { background: '#342B4F', ink: '#F7F0E3', accent: '#D19A65' },
  { background: '#40352B', ink: '#FFF5DF', accent: '#C9A86C' },
] as const;

function fallbackPalette(title: string) {
  const hash = [...title].reduce((value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0, 7);
  return FALLBACK_PALETTES[hash % FALLBACK_PALETTES.length];
}

export const BookCover = memo(function BookCover({ title, author, uri, style, compact = false }: {
  title: string;
  author: string;
  uri: string | null;
  style?: ImageStyle;
  compact?: boolean;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [failedUri, setFailedUri] = useState<string | null>(null);
  if (uri && uri !== failedUri) {
    return <Image source={uri} onError={() => setFailedUri(uri)} contentFit="cover" cachePolicy="memory-disk" recyclingKey={uri} transition={160} style={[styles.cover, style]} />;
  }
  const palette = fallbackPalette(title);
  return (
    <View style={[styles.cover, styles.fallback, compact && { padding: 7 }, { backgroundColor: palette.background }, style]}>
      <View style={[styles.rule, { backgroundColor: palette.accent }]} />
      {!compact ? <Text style={[styles.edition, { color: palette.accent }]}>PRIVATE EDITION</Text> : null}
      <Text numberOfLines={6} style={[styles.title, compact && { fontSize: 10, lineHeight: 13 }, { color: palette.ink }]}>{title}</Text>
      <Text numberOfLines={2} style={[styles.author, compact && { fontSize: 7 }, { color: palette.ink }]}>{author || 'JGOLD archive'}</Text>
    </View>
  );
});

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    cover: { width: '100%', aspectRatio: 0.66, borderRadius: 7, borderCurve: 'continuous', backgroundColor: colors.backgroundSelected },
    fallback: { padding: 14, justifyContent: 'flex-start' },
    rule: { width: 32, height: 4, marginBottom: 9 },
    edition: { fontFamily: Fonts.extraBold, fontSize: 7, letterSpacing: 1.1, marginBottom: 18 },
    title: { fontFamily: Fonts.extraBold, fontSize: 18, lineHeight: 22 },
    author: { opacity: 0.76, fontFamily: Fonts.semibold, fontSize: 11, marginTop: 'auto' },
  });
}
