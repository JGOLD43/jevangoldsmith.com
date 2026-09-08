import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashcardEditor } from '@/components/flashcard-editor';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CardDashboard, LearningCard } from '@/learning/types';
import { deleteLearningCard, getCardDashboard, listLearningCards, setLearningCardArchived } from '@/storage/learning-cards-repository';

export default function FlashcardsScreen() {
  const router = useRouter(), colors = useTheme();
  const [cards, setCards] = useState<LearningCard[]>([]), [dashboard, setDashboard] = useState<CardDashboard | null>(null);
  const [topic, setTopic] = useState(''), [search, setSearch] = useState(''), [archived, setArchived] = useState(false), [error, setError] = useState('');
  const [editor, setEditor] = useState(false), [editing, setEditing] = useState<LearningCard | undefined>();
  const reload = useCallback(async () => { try { const [items, stats] = await Promise.all([listLearningCards(true), getCardDashboard()]); setCards(items); setDashboard(stats); setError(''); } catch { setError('Your flashcards could not load. Please try again.'); } }, []);
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  const topics = useMemo(() => [...new Set(cards.filter(card => !card.archived).map(card => card.deckName))].sort(), [cards]);
  const visible = useMemo(() => cards.filter(card => card.archived === archived && (!topic || card.deckName === topic) && `${card.front} ${card.back} ${card.tags.join(' ')} ${card.sourceLabel}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())), [cards, topic, search, archived]);
  const styles = useMemo(() => StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, paddingBottom: 120, gap: 12 }, header: { gap: 16, marginBottom: 10 }, row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, title: { color: colors.text, fontFamily: Fonts.bold, fontSize: 30, flex: 1 }, text: { color: colors.text, fontFamily: Fonts.sans, fontSize: 14 }, muted: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18 }, button: { padding: 14, minHeight: 46, backgroundColor: colors.backgroundSelected, borderRadius: 12 }, selected: { backgroundColor: colors.accentSoft }, action: { backgroundColor: colors.action }, actionText: { color: colors.onAction, fontFamily: Fonts.bold, fontSize: 14 }, card: { backgroundColor: colors.backgroundElement, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 16, gap: 10 }, question: { color: colors.text, fontFamily: Fonts.bold, fontSize: 17, lineHeight: 24 }, input: { color: colors.text, fontFamily: Fonts.sans, fontSize: 15, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 14 } }), [colors]);
  const action = (label: string, onPress: () => void, selected = false) => <Pressable key={label} accessibilityRole="button" onPress={onPress} style={[styles.button, selected && styles.selected]}><Text style={styles.text}>{label}</Text></Pressable>;
  const start = (mode: 'due' | 'cram') => router.push({ pathname: '/learning/cards/study', params: { mode, ...(topic ? { topic } : {}) } } as Href);
  async function archive(card: LearningCard) { try { await setLearningCardArchived(card.id, !card.archived); await reload(); } catch { Alert.alert('Could not update card', 'Please try again.'); } }
  const header = <View style={styles.header}>
    <View style={styles.row}>{action('‹ Back', () => router.back())}<Text style={styles.title}>Flashcards</Text></View>
    <Text style={styles.muted}>Your reading, turned into recall. Study a learning group or mix your due reviews.</Text>
    <View style={styles.wrap}>{action('Study my reading →', () => router.push({ pathname: '/learning/cards/reading', params: topic ? { group: topic } : {} } as Href), true)}{action('＋ New card', () => { setEditing(undefined); setEditor(true); })}{action(archived ? 'Show active' : 'Archived', () => { setArchived(!archived); setTopic(''); })}</View>
    {error ? <>{action('Try again', () => { void reload(); })}<Text accessibilityRole="alert" style={styles.muted}>{error}</Text></> : dashboard ? <Text style={styles.text}>{dashboard.dueCount} due · {dashboard.newCount} new · {dashboard.reviewedToday} reviews today</Text> : <Text style={styles.muted}>Loading…</Text>}
    {!archived && !topic ? <View style={{ gap: 10 }}><Text style={styles.question}>Learning groups</Text>{dashboard?.deckCounts.map(deck => <Pressable key={deck.name} accessibilityRole="button" onPress={() => setTopic(deck.name)} style={styles.card}><Text style={styles.question}>{deck.name} →</Text><Text style={styles.muted}>{deck.newCount} new · {deck.learning} learning · {deck.due} due · {deck.total} cards</Text></Pressable>)}</View> : null}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wrap}>{action('All topics', () => setTopic(''), !topic)}{topics.map(name => action(name, () => setTopic(name), topic === name))}</ScrollView>
    {!archived ? <><Pressable accessibilityRole="button" onPress={() => start('due')} style={[styles.button, styles.action]}><Text style={styles.actionText}>{topic ? 'Review this topic' : 'Mixed spaced review'}</Text></Pressable>{action('Shuffle & browse', () => start('cram'))}<Text style={styles.muted}>Sessions prioritise due cards, then introduce up to 10 new cards. Shuffle is ungraded and leaves your schedule unchanged.</Text></> : null}
    <TextInput accessibilityLabel="Search flashcards" value={search} onChangeText={setSearch} placeholder="Search questions, answers or tags" placeholderTextColor={colors.textSecondary} style={styles.input} />
    <Text style={styles.muted}>{visible.length} {visible.length === 1 ? 'card' : 'cards'}{topic ? ` · ${topic}` : ''}</Text>
  </View>;
  return <SafeAreaView edges={['top']} style={styles.safe}><FlatList data={visible} keyExtractor={card => card.id} contentContainerStyle={styles.content} ListHeaderComponent={header} ListEmptyComponent={<View style={styles.card}><Text style={styles.question}>{search ? 'No matching cards' : archived ? 'No archived cards' : 'Start with what you’ve read'}</Text><Text style={styles.muted}>Tap “Study my reading” to turn highlights or pasted text into tests. Related books can share a learning group.</Text></View>} renderItem={({ item }) => <View style={styles.card}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${item.front}`} onPress={() => { setEditing(item); setEditor(true); }}><Text style={styles.muted}>{item.deckName} · {item.promptKind ?? 'recall'}</Text><Text style={styles.question}>{item.front}</Text>{item.sourceLabel ? <Text style={styles.muted}>{item.sourceLabel}</Text> : null}</Pressable>
    <View style={styles.wrap}>{action(item.archived ? 'Restore' : 'Archive', () => { void archive(item); })}{item.archived ? action('Delete', () => Alert.alert('Delete this flashcard?', 'Its review history will also be removed.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { void deleteLearningCard(item.id).then(reload).catch(() => Alert.alert('Could not delete card', 'Please try again.')); } }])) : null}</View>
  </View>} /><FlashcardEditor visible={editor} initial={editing} cardId={editing?.id} topics={topics} onClose={() => setEditor(false)} onSaved={() => { void reload(); }} /></SafeAreaView>;
}
