import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, AppState, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ReviewCard } from '@/learning/types';
import { buildCardReviewQueue, reviewLearningCard } from '@/storage/learning-cards-repository';

export default function FlashcardStudy() {
  const params = useLocalSearchParams<{ mode?: string; topic?: string }>(), router = useRouter(), colors = useTheme();
  const mode = params.mode === 'cram' ? 'cram' : 'due';
  const [queue, setQueue] = useState<ReviewCard[]>([]), [index, setIndex] = useState(0), [revealed, setRevealed] = useState(false), [response, setResponse] = useState('');
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [saving, setSaving] = useState(false), [remembered, setRemembered] = useState(0), [missed, setMissed] = useState(0);
  const lock = useRef(false), started = useRef(Date.now()), elapsed = useRef(0);
  const card = queue[index];
  useEffect(() => { let active = true; setLoading(true); void buildCardReviewQueue(mode, params.topic, mode === 'cram' ? 100 : 24).then(cards => { if (active) { setQueue(cards); setLoading(false); started.current = Date.now(); } }).catch(() => { if (active) { setError('Your review could not load. Go back and try again.'); setLoading(false); } }); return () => { active = false; }; }, [mode, params.topic]);
  useEffect(() => { const subscription = AppState.addEventListener('change', state => { if (state === 'active') started.current = Date.now(); else { elapsed.current += Date.now() - started.current; started.current = Date.now(); } }); return () => subscription.remove(); }, []);
  const styles = useMemo(() => StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, content: { flexGrow: 1, padding: 22, paddingBottom: 50, gap: 20 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, text: { color: colors.text, fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22 }, muted: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18 }, title: { color: colors.text, fontFamily: Fonts.bold, fontSize: 29, lineHeight: 39 }, button: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 17, minHeight: 52, backgroundColor: colors.backgroundElement }, primary: { backgroundColor: colors.action }, primaryText: { color: colors.onAction, fontFamily: Fonts.bold, fontSize: 16, textAlign: 'center' }, answer: { padding: 20, borderWidth: 1, borderColor: colors.accent, borderRadius: 18, backgroundColor: colors.backgroundElement, gap: 12 }, input: { minHeight: 110, textAlignVertical: 'top', padding: 16, borderWidth: 1, borderColor: colors.line, borderRadius: 14, color: colors.text, fontFamily: Fonts.sans, fontSize: 16 } }), [colors]);
  function advance() { setIndex(value => value + 1); setRevealed(false); setResponse(''); elapsed.current = 0; started.current = Date.now(); }
  async function grade(success: boolean) {
    if (!card || !revealed || lock.current) return; lock.current = true; setSaving(true);
    try { await reviewLearningCard(card, success, elapsed.current + Date.now() - started.current); if (success) setRemembered(value => value + 1); else setMissed(value => value + 1); advance(); }
    catch (cause) { Alert.alert('Review not saved', cause instanceof Error ? cause.message : 'Please try again.'); }
    finally { lock.current = false; setSaving(false); }
  }
  const button = (label: string, action: () => void, primary = false) => <Pressable disabled={saving} accessibilityRole="button" onPress={action} style={[styles.button, primary && styles.primary]}><Text style={primary ? styles.primaryText : styles.text}>{label}</Text></Pressable>;
  return <SafeAreaView style={styles.safe}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <View style={styles.row}>{button('Close', () => router.back())}<Text style={styles.muted}>{mode === 'cram' ? 'SHUFFLE · UNGRADED' : 'SPACED REVIEW'}{queue.length ? ` · ${Math.min(index + 1, queue.length)}/${queue.length}` : ''}</Text></View>
    {loading ? <ActivityIndicator color={colors.accent} /> : error ? <Text accessibilityRole="alert" style={styles.text}>{error}</Text> : !card ? <>
      <Text style={styles.title}>{queue.length ? 'Session complete' : 'Nothing to review here'}</Text><Text style={styles.text}>{mode === 'cram' ? 'Browse again whenever you want. Your spaced review schedule hasn’t changed.' : queue.length ? `${remembered} recalled · ${missed} to revisit. Missed cards return in about 10 minutes; remembered cards get a longer interval.` : 'Choose another topic, add a card, or return when your next review is due.'}</Text>{button('Back to flashcards', () => router.back(), true)}
    </> : <>
      <Text style={styles.muted}>{card.deckName} · {card.promptKind ?? 'recall'}{card.direction === 'reverse' ? ' · reverse' : ''}</Text>
      <Text selectable style={styles.title}>{card.prompt}</Text>
      {!revealed ? <><Text style={styles.muted}>Answer from memory before turning the card. For a problem, work it out first.</Text><TextInput accessibilityLabel="Your answer from memory" multiline value={response} onChangeText={setResponse} placeholder="Think it, say it, or jot it here…" placeholderTextColor={colors.textSecondary} style={styles.input} />{button('Reveal answer', () => setRevealed(true), true)}</> : <>
        {response ? <View><Text style={styles.muted}>YOUR ANSWER</Text><Text selectable style={styles.text}>{response}</Text></View> : null}
        <View style={styles.answer}><Text style={styles.muted}>{card.promptKind === 'apply' ? 'CHECK YOUR WORK' : 'ANSWER'}</Text><Text selectable style={styles.text}>{card.answer}</Text>{card.note ? <><Text style={styles.muted}>CONTEXT</Text><Text selectable style={styles.text}>{card.note}</Text></> : null}{card.sourceLabel ? <Text style={styles.muted}>{card.sourceLabel}</Text> : null}</View>
        {mode === 'cram' ? button('Next card', advance, true) : <><Text style={styles.muted}>Could you answer correctly without help? If you needed the answer or a hint, choose “Again.”</Text>{button('Again · revisit soon', () => { void grade(false); })}{button('Remembered · space it out', () => { void grade(true); }, true)}</>}
        {card.bookId ? button('Open source book', () => router.push(`/books/${card.bookId}`)) : null}
      </>}
    </>}
  </ScrollView></SafeAreaView>;
}
