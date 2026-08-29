import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, type AppColors } from '@/constants/theme';
import type { AttemptResult, LearningSessionPlan } from '@/learning/types';
import { useTheme } from '@/hooks/use-theme';
import { useLearning } from '@/state/learning-context';

export default function LearningSessionScreen() {
  const { minutes: rawMinutes } = useLocalSearchParams<{ minutes?: string }>(); const minutes = Math.max(5, Math.min(60, Number(rawMinutes) || 20));
  const router = useRouter(); const colors = useTheme(); const styles = useMemo(() => createStyles(colors), [colors]);
  const { createPlan, recordAttempt, finishSession } = useLearning();
  const [plan, setPlan] = useState<LearningSessionPlan | null>(null); const [index, setIndex] = useState(0); const [revealed, setRevealed] = useState(false); const [saving, setSaving] = useState(false);
  const [briefing, setBriefing] = useState(true); const startedAt = useRef(Date.now()); const exerciseStartedAt = useRef(Date.now()); const creating = useRef(false);
  useEffect(() => { if (creating.current) return; creating.current = true; void createPlan(minutes).then(setPlan).catch(() => { Alert.alert('Practice could not start', 'Please return and try again.'); router.back(); }); }, [createPlan, minutes, router]);
  const exercise = plan?.exercises[index];
  const finish = async () => { if (!plan || saving) return; setSaving(true); await finishSession(plan.id, (Date.now() - startedAt.current) / 1000); router.replace('/learning'); };
  const rate = async (result: AttemptResult) => {
    if (!plan || !exercise || saving) return; setSaving(true);
    await recordAttempt(plan, index, result, (Date.now() - exerciseStartedAt.current) / 1000);
    if (index >= plan.exercises.length - 1) { await finishSession(plan.id, (Date.now() - startedAt.current) / 1000); router.replace('/learning'); return; }
    setIndex((current) => current + 1); setRevealed(false); exerciseStartedAt.current = Date.now(); setSaving(false);
  };
  if (!plan || !exercise) return <SafeAreaView style={styles.loading}><ActivityIndicator color={colors.accent} /><Text style={styles.loadingText}>Building the fastest useful session…</Text></SafeAreaView>;
  if (briefing) return <SafeAreaView edges={['top', 'bottom']} style={styles.safe}><ScrollView contentContainerStyle={styles.briefContent}>
    <Pressable accessibilityLabel="Close" hitSlop={12} onPress={() => router.back()}><SymbolView name={{ ios: 'xmark', android: 'close' }} size={25} tintColor={colors.text} /></Pressable>
    <View><Text style={styles.kind}>YOUR SESSION CONTRACT</Text><Text style={styles.briefTitle}>{minutes} minutes. No wasted drills.</Text></View>
    <Text style={styles.briefBody}>ChatGPT voice needs to know this exact focus at the start. This plan contains French practice only—not finances, photos, vault items or other private app data.</Text>
    <View style={styles.answerCard}><Text style={styles.answerLabel}>FOCUS</Text><Text style={styles.briefFocus}>{plan.focus}</Text><Text style={styles.answerLabel}>PHRASES</Text>{plan.phrases.map((phrase) => <Text key={phrase} style={styles.briefPhrase}>• {phrase}</Text>)}</View>
    <Pressable onPress={() => { void Share.share({ title: 'French practice plan', message: plan.voiceBrief }); }} style={styles.shareButton}><SymbolView name={{ ios: 'square.and.arrow.up', android: 'share' }} size={19} tintColor={colors.text} /><Text style={styles.shareText}>Share plan with ChatGPT</Text></Pressable>
    <Pressable onPress={() => { startedAt.current = Date.now(); exerciseStartedAt.current = Date.now(); setBriefing(false); }} style={styles.beginButton}><Text style={styles.beginText}>Begin retrieval practice</Text><SymbolView name={{ ios: 'arrow.right', android: 'arrow_forward' }} size={19} tintColor={colors.onAction} /></Pressable>
  </ScrollView></SafeAreaView>;
  const progress = (index / plan.exercises.length) * 100;
  return <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
    <View style={styles.topbar}><Pressable accessibilityLabel="End session" hitSlop={12} onPress={() => { Alert.alert('End this session?', 'Your completed attempts will still count.', [{ text: 'Keep going' }, { text: 'End', style: 'destructive', onPress: () => { void finish(); } }]); }}><SymbolView name={{ ios: 'xmark', android: 'close' }} size={25} tintColor={colors.text} /></Pressable><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View><Text style={styles.counter}>{index + 1}/{plan.exercises.length}</Text></View>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.focusRow}><Text style={styles.kind}>{exercise.kind.replace('_', ' ')}</Text><Text style={styles.target}>Aim: {exercise.targetSeconds}s</Text></View>
      <Text style={styles.prompt}>{exercise.prompt}</Text>
      <View style={styles.instruction}><SymbolView name={{ ios: 'waveform', android: 'graphic_eq' }} size={24} tintColor={colors.accent} /><Text style={styles.instructionText}>Say it aloud. Commit to an answer before revealing it.</Text></View>
      {!revealed ? <Pressable accessibilityRole="button" onPress={() => setRevealed(true)} style={({ pressed }) => [styles.reveal, pressed && styles.pressed]}><Text style={styles.revealText}>Reveal target</Text></Pressable> : <View style={styles.answerCard}>
        <Text style={styles.answerLabel}>TARGET LANGUAGE</Text><Text style={styles.answer}>{exercise.answer}</Text><Text style={styles.note}>{exercise.coachingNote}</Text>
      </View>}
      {revealed ? <View style={styles.ratingBlock}><Text style={styles.ratingTitle}>What actually happened?</Text><Text style={styles.ratingNote}>Be strict. Accurate evidence makes the next session faster.</Text>
        <Pressable disabled={saving} onPress={() => { void rate('clean'); }} style={({ pressed }) => [styles.rating, styles.clean, pressed && styles.pressed]}><View><Text style={styles.ratingName}>Clean, unaided</Text><Text style={styles.ratingDesc}>I produced it before looking</Text></View><Text style={styles.ratingImpact}>+20</Text></Pressable>
        <Pressable disabled={saving} onPress={() => { void rate('helped'); }} style={({ pressed }) => [styles.rating, pressed && styles.pressed]}><View><Text style={styles.ratingName}>Needed help</Text><Text style={styles.ratingDesc}>A prompt or answer unlocked it</Text></View><Text style={styles.ratingImpact}>+7</Text></Pressable>
        <Pressable disabled={saving} onPress={() => { void rate('missed'); }} style={({ pressed }) => [styles.rating, pressed && styles.pressed]}><View><Text style={styles.ratingName}>Missed</Text><Text style={styles.ratingDesc}>Could not produce it correctly</Text></View><Text style={styles.ratingImpact}>Review</Text></Pressable>
      </View> : null}
    </ScrollView>
  </SafeAreaView>;
}

function createStyles(colors: AppColors) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: colors.background }, loadingText: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 12 }, briefContent: { flexGrow: 1, width: '100%', maxWidth: 680, alignSelf: 'center', padding: 24, gap: 24 }, briefTitle: { color: colors.text, fontFamily: Fonts.black, fontSize: 31, lineHeight: 38, marginTop: 8 }, briefBody: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 20 }, briefFocus: { color: colors.text, fontFamily: Fonts.bold, fontSize: 18, lineHeight: 25, marginBottom: 7 }, briefPhrase: { color: colors.text, fontFamily: Fonts.medium, fontSize: 13, lineHeight: 20 }, shareButton: { minHeight: 52, borderRadius: 15, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }, shareText: { color: colors.text, fontFamily: Fonts.bold, fontSize: 13 }, beginButton: { minHeight: 57, borderRadius: 15, backgroundColor: colors.action, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 }, beginText: { color: colors.onAction, fontFamily: Fonts.bold, fontSize: 15 }, topbar: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.line }, progressTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.backgroundSelected, overflow: 'hidden' }, progressFill: { height: 5, backgroundColor: colors.accent }, counter: { color: colors.textSecondary, fontFamily: Fonts.bold, fontSize: 11 }, content: { flexGrow: 1, padding: 24, paddingBottom: 48, width: '100%', maxWidth: 680, alignSelf: 'center', gap: 24 }, focusRow: { flexDirection: 'row', justifyContent: 'space-between' }, kind: { color: colors.accent, fontFamily: Fonts.extraBold, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }, target: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 10 }, prompt: { color: colors.text, fontFamily: Fonts.black, fontSize: 30, lineHeight: 39, marginTop: 16 }, instruction: { minHeight: 65, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 15, backgroundColor: colors.accentSoft }, instructionText: { flex: 1, color: colors.text, fontFamily: Fonts.medium, fontSize: 12, lineHeight: 18 }, reveal: { minHeight: 55, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.accent }, revealText: { color: colors.accent, fontFamily: Fonts.bold, fontSize: 14 }, answerCard: { borderRadius: 20, backgroundColor: colors.backgroundElement, borderWidth: 1, borderColor: colors.line, padding: 20, gap: 10 }, answerLabel: { color: colors.accent, fontFamily: Fonts.extraBold, fontSize: 9, letterSpacing: 1 }, answer: { color: colors.text, fontFamily: Fonts.bold, fontSize: 22, lineHeight: 32 }, note: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18 }, ratingBlock: { gap: 9 }, ratingTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 18 }, ratingNote: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 10, marginBottom: 5 }, rating: { minHeight: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 15, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16, backgroundColor: colors.backgroundElement }, clean: { borderColor: colors.success }, ratingName: { color: colors.text, fontFamily: Fonts.bold, fontSize: 13 }, ratingDesc: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 10, marginTop: 3 }, ratingImpact: { color: colors.accent, fontFamily: Fonts.bold, fontSize: 11 }, pressed: { opacity: .72, transform: [{ scale: .99 }] },
}); }
