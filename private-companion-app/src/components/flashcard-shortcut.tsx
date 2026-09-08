import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getCardDashboard } from '@/storage/learning-cards-repository';
export function FlashcardShortcut() {
  const colors = useTheme(), router = useRouter();
  const [summary, setSummary] = useState('Turn your reading into topic decks and spaced practice.');
  useFocusEffect(useCallback(() => { let active = true; void getCardDashboard().then(stats => { if (active) setSummary(stats.totalCount ? `${stats.dueCount} due · ${stats.newCount} new · ${stats.reviewedToday} reviews today` : 'Turn your reading into topic decks and spaced practice.'); }).catch(() => { if (active) setSummary('Open your topic decks and refresh your memory.'); }); return () => { active = false; }; }, []));
  return <Pressable accessibilityRole="button" onPress={() => router.push('/learning/cards' as Href)} style={{ padding: 18, borderRadius: 18, gap: 6, backgroundColor: colors.backgroundElement, borderWidth: 1, borderColor: colors.line }}><Text style={{ color: colors.text, fontFamily: Fonts.bold, fontSize: 19 }}>Flashcards →</Text><Text style={{ color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18 }}>{summary}</Text></Pressable>;
}
