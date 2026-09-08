import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SkillColors, SkillFonts as Fonts } from '@/constants/skill-theme';
import { validPracticeDuration } from '@/learning/practice-time';
import { savePracticeTime } from '@/storage/practice-time-repository';

export function PracticeTimer({ treeId, nodeId, onPracticeSaved }: { treeId: string; nodeId: string; onPracticeSaved: () => void }) {
  const colors = SkillColors;
  const styles = useMemo(() => StyleSheet.create({
    card: { padding: 18, gap: 12, marginTop: 16, borderRadius: 18, backgroundColor: colors.backgroundElement, borderWidth: 1, borderColor: colors.line },
    title: { color: colors.text, fontFamily: Fonts.bold, fontSize: 18 }, text: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
    clock: { color: colors.text, fontFamily: Fonts.mono, fontSize: 40, fontVariant: ['tabular-nums'] }, row: { flexDirection: 'row', gap: 10 },
    button: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 12, backgroundColor: colors.accentSoft },
    label: { color: colors.accent, fontFamily: Fonts.bold }, input: { color: colors.text, borderWidth: 1, borderColor: colors.line, padding: 12, borderRadius: 12, minHeight: 48 },
  }), [colors]);
  const [kind, setKind] = useState<'practice' | 'study'>('practice');
  const [running, setRunning] = useState(false); const [elapsed, setElapsed] = useState(0);
  const [manual, setManual] = useState(false); const [minutes, setMinutes] = useState(''); const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false); const [message, setMessage] = useState('');
  const accumulated = useRef(0); const start = useRef<number | null>(null); const saveLock = useRef(false);
  const pause = () => { if (start.current !== null) accumulated.current += Math.max(0, Date.now() - start.current); start.current = null; setElapsed(accumulated.current); setRunning(false); };
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') pause(); });
    const interval = setInterval(() => { if (start.current !== null) setElapsed(accumulated.current + Math.max(0, Date.now() - start.current)); }, 500);
    return () => { subscription.remove(); clearInterval(interval); };
  }, []);
  const save = async () => {
    if (saveLock.current) return;
    pause();
    try {
      const durationMs = manual ? validPracticeDuration(minutes) : accumulated.current;
      if (!note.trim()) throw new Error('Record what you made, your result, and what you will improve next.');
      saveLock.current = true; setSaving(true);
      await savePracticeTime({ treeId, nodeId, kind, durationMs, note });
      if (kind === 'practice') onPracticeSaved();
      setMessage(`${(durationMs / 60_000).toFixed(1)} minutes of ${kind === 'practice' ? 'direct practice' : 'reading / study'} saved.`);
      accumulated.current = 0; setElapsed(0); setMinutes(''); setNote('');
    } catch (error) { Alert.alert('Could not save time', error instanceof Error ? error.message : 'Try again.'); }
    finally { saveLock.current = false; setSaving(false); }
  };
  return <View style={styles.card}>
    <Text style={styles.title}>Time</Text>

    <View style={styles.row}>{(['practice', 'study'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: kind === value }} disabled={running || elapsed > 0 || saving} onPress={() => setKind(value)} style={[styles.button, { opacity: kind === value ? 1 : 0.5 }]}><Text style={styles.label}>{value === 'practice' ? 'Direct practice' : 'Reading / study'}</Text></Pressable>)}</View>
    {manual ? <><Text style={styles.text}>Minutes practised elsewhere (today)</Text><TextInput accessibilityLabel="Minutes practised" keyboardType="decimal-pad" value={minutes} onChangeText={setMinutes} editable={!saving} placeholder="e.g. 20" placeholderTextColor={colors.textSecondary} style={styles.input} /></> : <><Text accessibilityRole="timer" style={styles.clock}>{Math.floor(elapsed / 60_000)}:{String(Math.floor(elapsed / 1000) % 60).padStart(2, '0')}</Text><Pressable disabled={saving} accessibilityRole="button" onPress={() => { if (running) pause(); else { start.current = Date.now(); setRunning(true); setMessage(''); } }} style={styles.button}><Text style={styles.label}>{running ? 'Pause' : elapsed > 0 ? 'Resume' : 'Start timer'}</Text></Pressable></>}
    <Text style={styles.text}>Auto-pauses outside the app. Save before leaving.</Text>
    <Pressable disabled={running || elapsed > 0 || saving} onPress={() => setManual(!manual)}><Text style={styles.label}>{manual ? 'Use timer instead' : 'Log time manually'}</Text></Pressable>
    <TextInput accessibilityLabel="Practice result and next correction" multiline editable={!saving} value={note} onChangeText={setNote} placeholder="Your result, work link, and one thing to improve…" placeholderTextColor={colors.textSecondary} style={styles.input} />
    <Pressable accessibilityRole="button" disabled={saving || !note.trim()} onPress={() => { void save(); }} style={[styles.button, { opacity: saving || !note.trim() ? 0.4 : 1 }]}><Text style={styles.label}>{saving ? 'Saving…' : 'Save session'}</Text></Pressable>
    {message ? <Text accessibilityLiveRegion="polite" style={styles.text}>{message}</Text> : null}

  </View>;
}
