import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Chip } from '@/components/ui';
import { Fonts, type AppColors } from '@/constants/theme';
import type { NewRelationshipContact } from '@/domain/models';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/app-context';

export default function EditContactScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { contacts, editContact } = useApp();
  const contact = contacts.find((candidate) => candidate.id === id);
  const [name, setName] = useState(contact?.name ?? '');
  const [company, setCompany] = useState(contact?.company ?? '');
  const [role, setRole] = useState(contact?.role ?? '');
  const [email, setEmail] = useState(contact?.email ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [website, setWebsite] = useState(contact?.website ?? '');
  const [location, setLocation] = useState(contact?.location ?? '');
  const [tags, setTags] = useState(contact?.tags.join(', ') ?? '');
  const [notes, setNotes] = useState(contact?.notes ?? '');
  const [cadence, setCadence] = useState(String(contact?.cadenceDays ?? 30));
  const [nextFollowUpAt, setNextFollowUpAt] = useState(contact?.nextFollowUpAt ?? new Date().toISOString());
  const [saving, setSaving] = useState(false);
  if (!contact) return <SafeAreaView style={styles.safe}><View style={styles.empty}><Text style={styles.title}>Person not found</Text><Button label="Back to people" onPress={() => router.replace('/contacts')} /></View></SafeAreaView>;
  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const input: NewRelationshipContact = { name, company, role, email, phone, website, location, tags: tags.split(','), notes, cadenceDays: Number(cadence) || 30, nextFollowUpAt };
    const result = await editContact(contact.id, input);
    setSaving(false);
    if (result) router.replace(`/contacts/${contact.id}`);
  };
  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View style={styles.header}><Text style={styles.title}>Edit {contact.name}</Text><Button label="Cancel" variant="quiet" onPress={() => router.back()} /></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
    <Text style={styles.label}>Name</Text><TextInput value={name} onChangeText={setName} style={styles.input} placeholderTextColor={colors.textSecondary} />
    <Text style={styles.label}>Work</Text><View style={styles.row}><TextInput value={company} onChangeText={setCompany} placeholder="Company" placeholderTextColor={colors.textSecondary} style={[styles.input, styles.flex]} /><TextInput value={role} onChangeText={setRole} placeholder="Role" placeholderTextColor={colors.textSecondary} style={[styles.input, styles.flex]} /></View>
    <Text style={styles.label}>Contact details</Text><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email" placeholderTextColor={colors.textSecondary} style={styles.input} /><View style={styles.row}><TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Phone" placeholderTextColor={colors.textSecondary} style={[styles.input, styles.flex]} /><TextInput value={website} onChangeText={setWebsite} autoCapitalize="none" placeholder="Website / LinkedIn" placeholderTextColor={colors.textSecondary} style={[styles.input, styles.flex]} /></View>
    <Text style={styles.label}>Location</Text><TextInput value={location} onChangeText={setLocation} placeholder="City or timezone" placeholderTextColor={colors.textSecondary} style={styles.input} />
    <Text style={styles.label}>Groups</Text><TextInput value={tags} onChangeText={setTags} placeholder="Friend, investor, school…" placeholderTextColor={colors.textSecondary} style={styles.input} />
    <Text style={styles.label}>Keep-in-touch rhythm</Text><View style={styles.row}><TextInput value={cadence} onChangeText={setCadence} keyboardType="number-pad" placeholder="30" placeholderTextColor={colors.textSecondary} style={[styles.input, styles.cadence]} /><Text style={styles.hint}>days after a conversation</Text></View>
    <Text style={styles.label}>Next follow-up</Text><View style={styles.chips}><Chip label="Today" selected={Boolean(nextFollowUpAt) && new Date(nextFollowUpAt).getTime() < Date.now() + 2 * 86_400_000} onPress={() => setNextFollowUpAt(new Date().toISOString())} /><Chip label="In 1 week" onPress={() => setNextFollowUpAt(new Date(Date.now() + 7 * 86_400_000).toISOString())} /><Chip label="In 1 month" onPress={() => setNextFollowUpAt(new Date(Date.now() + 30 * 86_400_000).toISOString())} /><Chip label="None" selected={!nextFollowUpAt} onPress={() => setNextFollowUpAt('')} /></View>
    <Text style={styles.label}>What matters</Text><TextInput value={notes} onChangeText={setNotes} multiline textAlignVertical="top" placeholder="How you met, family, projects, gift ideas…" placeholderTextColor={colors.textSecondary} style={[styles.input, styles.notes]} />
    <Button label="Save changes" onPress={save} busy={saving} disabled={!name.trim() || saving} />
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

function createStyles(colors: AppColors) { return StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 6 }, title: { color: colors.text, fontFamily: Fonts.bold, fontSize: 25 }, form: { padding: 20, paddingTop: 8, paddingBottom: 60, gap: 9 }, label: { color: colors.text, fontFamily: Fonts.bold, fontSize: 14, marginTop: 7 }, input: { minHeight: 47, color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.line, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, fontFamily: Fonts.sans, fontSize: 15 }, row: { flexDirection: 'row', gap: 9, alignItems: 'center' }, cadence: { width: 84 }, hint: { flex: 1, color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 13 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, notes: { minHeight: 130, paddingTop: 12 }, empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 15 } }); }
