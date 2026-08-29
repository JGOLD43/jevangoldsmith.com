import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LIFE_AREAS, lifeAreaDefinition } from '@/constants/life-areas';
import { Fonts, type AppColors } from '@/constants/theme';
import type { LifeArea, LifeItem, NewLifeItem } from '@/domain/models';
import { useTheme } from '@/hooks/use-theme';

const PROGRESS_OPTIONS = [0, 25, 50, 75, 100];

export function LifeItemComposer({ visible, initialArea, item, onDismiss, onSave, onDelete }: {
  visible: boolean;
  initialArea: LifeArea;
  item: LifeItem | null;
  onDismiss: () => void;
  onSave: (input: NewLifeItem) => Promise<void>;
  onDelete: (item: LifeItem) => Promise<void>;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [area, setArea] = useState<LifeArea>(initialArea);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setArea(item?.area ?? initialArea);
    setTitle(item?.title ?? '');
    setNote(item?.note ?? '');
    setTargetDate(item?.targetDate ?? '');
    setProgress(item?.progress ?? 0);
  }, [initialArea, item, visible]);

  const save = async () => {
    if (!title.trim()) {
      Alert.alert('Add a title', `What do you want to ${area === 'trip' ? 'plan' : 'keep track of'}?`);
      return;
    }
    setSaving(true);
    try {
      await onSave({ area, title, note, targetDate, progress });
      onDismiss();
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!item) return;
    Alert.alert('Delete this item?', item.title, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { void onDelete(item).then(onDismiss); } },
    ]);
  };

  const definition = lifeAreaDefinition(area);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onDismiss}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
          <View style={styles.topbar}>
            <Pressable accessibilityRole="button" onPress={onDismiss} style={styles.topButton}><Text style={styles.cancel}>Cancel</Text></Pressable>
            <Text style={styles.modalTitle}>{item ? 'Edit item' : 'Add to your life'}</Text>
            <Pressable accessibilityRole="button" disabled={saving} onPress={() => { void save(); }} style={styles.topButton}><Text style={styles.save}>{saving ? 'Saving' : 'Save'}</Text></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.areaRow}>
              {LIFE_AREAS.map((candidate) => {
                const selected = candidate.key === area;
                return (
                  <Pressable key={candidate.key} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setArea(candidate.key)} style={[styles.areaChip, selected && { backgroundColor: candidate.color, borderColor: candidate.color }]}>
                    <SymbolView name={candidate.icon} size={17} tintColor={selected ? '#121212' : colors.textSecondary} />
                    <Text style={[styles.areaChipText, selected && styles.areaChipTextSelected]}>{candidate.shortLabel}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={[styles.hero, { borderLeftColor: definition.color }]}>
              <Text style={styles.heroEyebrow}>{definition.label}</Text>
              <Text style={styles.heroCopy}>{definition.description}</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Title</Text>
              <TextInput autoFocus value={title} onChangeText={setTitle} placeholder={area === 'trip' ? 'e.g. Hike in Patagonia' : 'What matters to you?'} placeholderTextColor={colors.textSecondary} style={styles.input} />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Notes</Text>
              <TextInput multiline value={note} onChangeText={setNote} placeholder="Why this matters, next steps, ideas…" placeholderTextColor={colors.textSecondary} style={[styles.input, styles.notes]} />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Target date <Text style={styles.optional}>optional</Text></Text>
              <TextInput value={targetDate} onChangeText={setTargetDate} placeholder="e.g. December 2026" placeholderTextColor={colors.textSecondary} style={styles.input} />
            </View>
            <View style={styles.field}>
              <View style={styles.progressHeading}><Text style={styles.label}>Progress</Text><Text style={styles.progressValue}>{progress}%</Text></View>
              <View style={styles.progressOptions}>
                {PROGRESS_OPTIONS.map((value) => (
                  <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: value === progress }} onPress={() => setProgress(value)} style={[styles.progressOption, value === progress && { backgroundColor: definition.color, borderColor: definition.color }]}>
                    <Text style={[styles.progressOptionText, value === progress && styles.progressOptionTextSelected]}>{value}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {item ? <Pressable accessibilityRole="button" onPress={remove} style={styles.deleteButton}><Text style={styles.deleteText}>Delete item</Text></Pressable> : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    keyboard: { flex: 1 },
    topbar: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.line, paddingHorizontal: 12 },
    topButton: { minWidth: 68, minHeight: 44, justifyContent: 'center' },
    cancel: { color: colors.textSecondary, fontFamily: Fonts.semibold, fontSize: 14 },
    save: { color: colors.accent, fontFamily: Fonts.bold, fontSize: 14, textAlign: 'right' },
    modalTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 16 },
    content: { padding: 20, paddingBottom: 60, gap: 22, width: '100%', maxWidth: 680, alignSelf: 'center' },
    areaRow: { gap: 8, paddingRight: 20 },
    areaChip: { minHeight: 40, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.line, borderRadius: 20, backgroundColor: colors.backgroundElement },
    areaChipText: { color: colors.textSecondary, fontFamily: Fonts.bold, fontSize: 12 },
    areaChipTextSelected: { color: '#121212' },
    hero: { padding: 16, gap: 5, borderLeftWidth: 3, backgroundColor: colors.backgroundElement, borderRadius: 12 },
    heroEyebrow: { color: colors.text, fontFamily: Fonts.bold, fontSize: 16 },
    heroCopy: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 },
    field: { gap: 8 },
    label: { color: colors.text, fontFamily: Fonts.bold, fontSize: 13 },
    optional: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 11 },
    input: { minHeight: 52, color: colors.text, fontFamily: Fonts.sans, fontSize: 16, paddingHorizontal: 15, paddingVertical: 12, backgroundColor: colors.backgroundElement, borderWidth: 1, borderColor: colors.line, borderRadius: 12 },
    notes: { minHeight: 116, textAlignVertical: 'top' },
    progressHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    progressValue: { color: colors.accent, fontFamily: Fonts.bold, fontSize: 13 },
    progressOptions: { flexDirection: 'row', gap: 8 },
    progressOption: { flex: 1, minHeight: 43, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: colors.backgroundElement },
    progressOptionText: { color: colors.textSecondary, fontFamily: Fonts.bold, fontSize: 12 },
    progressOptionTextSelected: { color: '#121212' },
    deleteButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    deleteText: { color: colors.danger, fontFamily: Fonts.bold, fontSize: 14 },
  });
}
