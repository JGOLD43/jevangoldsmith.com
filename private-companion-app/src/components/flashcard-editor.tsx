import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CARD_KINDS, type CardInput, type CardKind } from '@/learning/flashcards';
import { createLearningCard, updateLearningCard } from '@/storage/learning-cards-repository';

export function FlashcardEditor({ visible, initial, cardId, topics = [], onClose, onSaved }: { visible: boolean; initial?: CardInput; cardId?: string; topics?: string[]; onClose: () => void; onSaved: () => void }) {
  const colors = useTheme();
  const saveLock = useRef(false);
  const [topic, setTopic] = useState(''), [front, setFront] = useState(''), [back, setBack] = useState(''), [note, setNote] = useState(''), [tags, setTags] = useState('');
  const [kind, setKind] = useState<CardKind>('recall'), [reverse, setReverse] = useState(false), [saving, setSaving] = useState(false);
  useEffect(() => { if (!visible) return; setTopic(initial?.deckName ?? ''); setFront(initial?.front ?? ''); setBack(initial?.back ?? ''); setNote(initial?.note ?? ''); setTags(initial?.tags?.join(', ') ?? ''); setKind(initial?.promptKind ?? 'recall'); setReverse(initial?.reverseEnabled ?? false); }, [visible, initial]);
  const styles = useMemo(() => StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, gap: 16, paddingBottom: 60 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, title: { flex: 1, color: colors.text, fontFamily: Fonts.bold, fontSize: 23 }, text: { color: colors.text, fontFamily: Fonts.sans, fontSize: 14 }, muted: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18 }, input: { color: colors.text, fontFamily: Fonts.sans, fontSize: 16, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 14, minHeight: 50, backgroundColor: colors.backgroundElement }, multiline: { minHeight: 100, textAlignVertical: 'top' }, button: { padding: 13, minHeight: 46, borderRadius: 12, backgroundColor: colors.backgroundSelected }, primary: { backgroundColor: colors.action }, onPrimary: { color: colors.onAction, fontFamily: Fonts.bold, fontSize: 15, textAlign: 'center' } }), [colors]);
  async function save() {
    if (saveLock.current) return; saveLock.current = true; setSaving(true);
    try { const input = { ...initial, deckName: topic, front, back, note, tags: tags.split(','), promptKind: kind, reverseEnabled: reverse }; if (cardId) await updateLearningCard(cardId, input); else await createLearningCard(input); onSaved(); onClose(); }
    catch (error) { Alert.alert('Could not save card', error instanceof Error ? error.message : 'Please try again.'); }
    finally { saveLock.current = false; setSaving(false); }
  }
  return <Modal visible={visible} animationType="slide" onRequestClose={() => { if (!saving) onClose(); }}><SafeAreaView style={styles.screen}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <View style={styles.row}><Text style={styles.title}>{cardId ? 'Edit flashcard' : 'New flashcard'}</Text><Pressable accessibilityRole="button" disabled={saving} onPress={onClose} style={styles.button}><Text style={styles.text}>Cancel</Text></Pressable></View>
    <Text style={styles.text}>Topic / deck</Text><TextInput accessibilityLabel="Card topic" value={topic} onChangeText={setTopic} placeholder="e.g. Decision making" placeholderTextColor={colors.textSecondary} style={styles.input} />
    {topics.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wrap}>{topics.map(name => <Pressable key={name} onPress={() => setTopic(name)} style={styles.button}><Text style={styles.text}>{name}</Text></Pressable>)}</ScrollView> : null}
    <View style={styles.wrap}>{CARD_KINDS.map(item => <Pressable key={item.key} accessibilityRole="button" accessibilityState={{ selected: kind === item.key }} onPress={() => setKind(item.key)} style={[styles.button, kind === item.key && { backgroundColor: colors.accentSoft }]}><Text style={styles.text}>{item.label}</Text></Pressable>)}</View>
    <Text style={styles.muted}>{CARD_KINDS.find(item => item.key === kind)?.hint}</Text>
    <Text style={styles.text}>Question</Text><TextInput accessibilityLabel="Card question" multiline value={front} onChangeText={setFront} placeholder="What should you be able to recall or do?" placeholderTextColor={colors.textSecondary} style={[styles.input, styles.multiline]} />
    <Text style={styles.text}>{kind === 'apply' ? 'Worked answer / success criteria' : 'Answer'}</Text><TextInput accessibilityLabel="Card answer" multiline value={back} onChangeText={setBack} placeholder="Write a clear answer you can check yourself against." placeholderTextColor={colors.textSecondary} style={[styles.input, styles.multiline]} />
    <Text style={styles.text}>Source / extra context · shown after reveal</Text>{initial?.sourceLabel ? <Text style={styles.muted}>{initial.sourceLabel}</Text> : null}<TextInput accessibilityLabel="Card context" multiline value={note} onChangeText={setNote} placeholder="Original passage, explanation, example or source" placeholderTextColor={colors.textSecondary} style={[styles.input, styles.multiline]} />
    <Text style={styles.text}>Tags · comma separated</Text><TextInput accessibilityLabel="Card tags" value={tags} onChangeText={setTags} placeholder="habits, psychology" placeholderTextColor={colors.textSecondary} style={styles.input} />
    <View style={styles.row}><View style={{ flex: 1 }}><Text style={styles.text}>Also practise in reverse</Text><Text style={styles.muted}>Useful for vocabulary or paired facts. Each direction has its own schedule.</Text></View><Switch accessibilityLabel="Practise card in reverse" value={reverse} onValueChange={setReverse} /></View>
    {cardId ? <Text style={styles.muted}>Changing the question or answer restarts its review schedule.</Text> : <Text style={styles.muted}>Keep each card small. Check that your answer is correct before adding it to review. Cards stay in your encrypted vault.</Text>}
    <Pressable accessibilityRole="button" disabled={saving} onPress={() => { void save(); }} style={[styles.button, styles.primary]}><Text style={styles.onPrimary}>{saving ? 'Saving…' : 'Save flashcard'}</Text></Pressable>
  </ScrollView></SafeAreaView></Modal>;
}
