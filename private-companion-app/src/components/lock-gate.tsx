import { Image } from 'expo-image';
import { type PropsWithChildren, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { Fonts, type AppColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/app-context';

export function LockGate({ children }: PropsWithChildren) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { locked, loading, error, unlock, dismissError } = useApp();
  if (!locked) return children;

  return (
    <SafeAreaView style={styles.screen}>
      <Image
        accessibilityLabel="JGOLD sailing ship"
        contentFit="cover"
        source={require('@/assets/images/jgold-icon.png')}
        style={styles.mark}
      />
      <Text style={styles.kicker}>JGOLD</Text>
      <Text style={styles.title}>Your life, held close.</Text>
      <Text style={styles.body}>
        Your vault is encrypted on this Galaxy phone. Unlock it to continue.
      </Text>
      {error ? (
        <Text onPress={dismissError} style={styles.error}>{error}</Text>
      ) : null}
      <Button
        label={loading ? 'Unlocking…' : 'Unlock with fingerprint'}
        onPress={unlock}
        disabled={loading}
        style={styles.unlockButton}
      />
      {loading ? <ActivityIndicator color={colors.action} /> : null}
      <Text style={styles.footnote}>Screenshots are blocked. No vault content is synced to the website or AI services.</Text>
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 34,
    gap: 16,
  },
  mark: { width: 96, height: 96, borderRadius: 22, borderCurve: 'continuous', marginBottom: 8 },
  kicker: { color: colors.accent, fontFamily: Fonts.extraBold, fontSize: 12, letterSpacing: 1.5 },
  title: { color: colors.text, fontFamily: Fonts.bold, fontSize: 38, textAlign: 'center' },
  body: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 16, lineHeight: 24, textAlign: 'center', maxWidth: 360 },
  error: { color: colors.danger, fontFamily: Fonts.sans, fontSize: 13, textAlign: 'center' },
  unlockButton: { width: '100%', maxWidth: 360, marginTop: 8 },
  footnote: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 12, textAlign: 'center', maxWidth: 310, marginTop: 10 },
});
}
