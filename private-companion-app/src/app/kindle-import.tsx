import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, type AppColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useBooks } from '@/state/books-context';
import { importKindleLibrary, type KindleImportResult } from '@/storage/books-repository';
import { loadKindleImportFile } from '@/storage/kindle-import';

export default function KindleImportScreen() {
  const params = useLocalSearchParams<{ uri?: string; name?: string }>();
  const router = useRouter();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { refresh } = useBooks();
  const started = useRef(false);
  const [result, setResult] = useState<KindleImportResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!params.uri?.startsWith('file://')) {
      setError('JGOLD did not receive a readable Kindle notebook. Export it again and choose JGOLD.');
      return;
    }
    void (async () => {
      try {
        const document = await loadKindleImportFile(params.uri!, params.name ?? 'Kindle Notebook.html');
        const next = await importKindleLibrary(document);
        await refresh();
        setResult(next);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not import that Kindle notebook.');
      }
    })();
  }, [params.name, params.uri, refresh]);

  const done = () => router.replace('/books');
  return <SafeAreaView style={styles.safe}>
    <View style={styles.content}>
      <View style={styles.mark}><SymbolView name={{ ios: result ? 'checkmark' : error ? 'exclamationmark' : 'highlighter', android: result ? 'check' : error ? 'error' : 'ink_highlighter' }} size={34} tintColor={result ? colors.success : error ? colors.danger : colors.accent} /></View>
      <Text style={styles.eyebrow}>KINDLE NOTEBOOK</Text>
      <Text style={styles.title}>{result ? 'Highlights imported.' : error ? 'Import stopped.' : 'Bringing everything in…'}</Text>
      {result ? <Text style={styles.body}>{result.highlightsAdded} highlights · {result.booksAdded ? '1 new book' : 'matched to your library'} · {result.collectionsAdded} collection links</Text> : null}
      {error ? <Text style={styles.body}>{error}</Text> : null}
      {!result && !error ? <ActivityIndicator color={colors.accent} size="large" /> : null}
      {result || error ? <Pressable accessibilityRole="button" onPress={done} style={({ pressed }) => [styles.button, pressed && styles.pressed]}><Text style={styles.buttonText}>Open library</Text></Pressable> : null}
    </View>
  </SafeAreaView>;
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: { flex: 1, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center', gap: 14 },
    mark: { width: 68, height: 68, borderRadius: 20, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundElement },
    eyebrow: { color: colors.accent, fontFamily: Fonts.extraBold, fontSize: 10, letterSpacing: 1.1 },
    title: { color: colors.text, fontFamily: Fonts.black, fontSize: 30, lineHeight: 35, textAlign: 'center' },
    body: { maxWidth: 420, color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22, textAlign: 'center' },
    button: { minWidth: 220, minHeight: 52, marginTop: 8, borderRadius: 14, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.action },
    buttonText: { color: colors.onAction, fontFamily: Fonts.bold, fontSize: 15 },
    pressed: { opacity: 0.76, transform: [{ scale: 0.99 }] },
  });
}
