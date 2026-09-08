import { useMemo, useRef, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card } from '@/components/ui';
import companions from '@/constants/book-companions.json';
import { Fonts, type AppColors } from '@/constants/theme';
import { findBookCompanion, type CompanionEssay } from '@/domain/book-companions';
import { useTheme } from '@/hooks/use-theme';

const essays: CompanionEssay[] = companions;

function SourceText({ text, fontSize, color, linkColor }: { text: string; fontSize: number; color: string; linkColor: string }) {
  return <Text selectable style={{ color, fontFamily: Fonts.sans, fontSize, lineHeight: fontSize * 1.65 }}>
    {text.split(/(https:\/\/[^\s]+[^\s.,])/g).map((part, index) => part.startsWith('https://')
      ? <Text key={index} accessibilityRole="link" style={{ color: linkColor, textDecorationLine: 'underline' }} onPress={() => {
        void Linking.openURL(part).catch(() => Alert.alert('Could not open source', 'Connect to the internet and try again. The essay is available offline.'));
      }}>{part}</Text>
      : part)}
  </Text>;
}

export function BookCompanion({ book }: { book: { title: string; author: string } }) {
  const matched = findBookCompanion(essays, book);
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selected, setSelected] = useState<CompanionEssay | null>(null);
  const [showCollection, setShowCollection] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const scroll = useRef<ScrollView>(null);
  const sectionPositions = useRef<Record<number, number>>({});
  if (!matched) return null;

  const close = () => { setSelected(null); setShowCollection(false); };
  const openEssay = (essay: CompanionEssay) => {
    sectionPositions.current = {};
    setSelected(essay);
    setShowCollection(false);
  };

  return <>
    <Card style={styles.card}>
      <Text style={styles.eyebrow}>COMPANION ESSAY</Text>
      <Text style={styles.description}>An Adler-style analysis of the ideas, arguments and questions worth returning to.</Text>
      <Button label={`Read companion essay · ${matched.minutes} min`} onPress={() => openEssay(matched)} />
      <Text style={styles.caption}>Available offline · Independent analysis by Codex</Text>
    </Card>
    <Modal visible={selected !== null} animationType="slide" onRequestClose={close}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.toolbar}>
          <Button label={showCollection ? 'Back to essay' : 'All 24 essays'} variant="quiet" onPress={() => setShowCollection(value => !value)} />
          <Button label="Close" variant="quiet" onPress={close} />
        </View>
        {showCollection ? <ScrollView contentContainerStyle={styles.content}>
          <Text accessibilityRole="header" style={styles.title}>Who Am I?</Text>
          <Text style={styles.description}>24 companion essays · All available offline</Text>
          {essays.map(essay => <Pressable key={essay.id} accessibilityRole="button" accessibilityLabel={`Read ${essay.title}`} onPress={() => openEssay(essay)} style={({ pressed }) => [styles.indexItem, pressed && styles.pressed]}>
            <Text style={styles.indexTitle}>{essay.title}</Text>
            <Text style={styles.caption}>{essay.author} · {essay.minutes} min</Text>
          </Pressable>)}
        </ScrollView> : selected ? <ScrollView key={selected.id} ref={scroll} contentContainerStyle={styles.content}>
          <Text style={styles.eyebrow}>WHO AM I? · READING COMPANION</Text>
          <Text accessibilityRole="header" style={styles.title}>{selected.title}</Text>
          <Text style={styles.description}>{selected.author}</Text>
          <Text style={styles.caption}>{selected.wordCount.toLocaleString()} words · {selected.minutes} min · Independent analysis by Codex</Text>
          <Text style={styles.method}>Using Adler and Van Doren’s approach: understand the whole, interpret the parts, judge the argument fairly, and ask what follows. Source coverage is explained at the end of each essay.</Text>
          <View style={styles.fontControls}>
            <Text style={styles.caption}>Text size</Text>
            <Button label="Smaller" variant="secondary" disabled={fontSize <= 16} onPress={() => setFontSize(size => Math.max(16, size - 2))} />
            <Button label="Larger" variant="secondary" disabled={fontSize >= 26} onPress={() => setFontSize(size => Math.min(26, size + 2))} />
          </View>
          <View style={styles.contents}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>In this essay</Text>
            {selected.sections.map((section, index) => <Pressable key={section.heading} accessibilityRole="button" onPress={() => scroll.current?.scrollTo({ y: sectionPositions.current[index] ?? 0, animated: true })} style={styles.sectionLink}>
              <Text style={styles.link}>{section.heading}</Text>
            </Pressable>)}
          </View>
          {selected.sections.map((section, index) => <View key={section.heading} style={styles.section} onLayout={event => { sectionPositions.current[index] = event.nativeEvent.layout.y; }}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>{section.heading}</Text>
            {section.paragraphs.map((paragraph, paragraphIndex) => <SourceText key={paragraphIndex} text={paragraph} fontSize={fontSize} color={colors.text} linkColor={colors.action} />)}
          </View>)}
          <Button label="Explore all 24 essays" variant="secondary" onPress={() => setShowCollection(true)} />
          <Button label="Back to top" variant="quiet" onPress={() => scroll.current?.scrollTo({ y: 0, animated: true })} />
        </ScrollView> : null}
      </SafeAreaView>
    </Modal>
  </>;
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
    content: { padding: 24, paddingBottom: 64, gap: 18, width: '100%', maxWidth: 760, alignSelf: 'center' },
    card: { gap: 12 },
    eyebrow: { color: colors.action, fontFamily: Fonts.bold, fontSize: 11, letterSpacing: 1.2 },
    title: { color: colors.text, fontFamily: Fonts.bold, fontSize: 30, lineHeight: 38 },
    description: { color: colors.text, fontFamily: Fonts.sans, fontSize: 16, lineHeight: 24 },
    caption: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 20 },
    method: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 22 },
    fontControls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
    contents: { paddingVertical: 18, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line, gap: 4 },
    section: { gap: 18, paddingTop: 12 },
    sectionTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 21, lineHeight: 29 },
    sectionLink: { paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
    link: { color: colors.action, fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22 },
    indexItem: { paddingVertical: 18, gap: 6, borderBottomWidth: 1, borderBottomColor: colors.line },
    indexTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 18, lineHeight: 26 },
    pressed: { opacity: 0.65 },
  });
}
