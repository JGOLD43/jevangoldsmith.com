import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, type AppColors } from '@/constants/theme';
import { ContactAtlasMap } from '@/components/contact-atlas-map';
import { useTheme } from '@/hooks/use-theme';
import { mappableContact } from '@/services/contact-locations';
import { useApp } from '@/state/app-context';

function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?'; }

export default function ContactMapScreen() {
  const router = useRouter();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { contacts } = useApp();
  const [mapTouching, setMapTouching] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selected = contacts.filter(contact => selectedIds.includes(contact.id));
  const mapped = useMemo(() => contacts.map(mappableContact).filter((item): item is NonNullable<typeof item> => Boolean(item)), [contacts]);
  const unmapped = contacts.filter((contact) => !mappableContact(contact));
  const points = useMemo(() => mapped.map(({ contact, latitude, longitude }) => ({ id: contact.id, name: contact.name, location: contact.location, latitude, longitude })), [mapped]);
  return <SafeAreaView edges={['top']} style={styles.safe}><ScrollView scrollEnabled={!mapTouching} contentContainerStyle={styles.content}>
    <View style={styles.header}><Pressable accessibilityLabel="Back to people" onPress={() => router.back()} style={styles.back}><SymbolView name={{ ios: 'chevron.left', android: 'arrow_back' }} size={22} tintColor={colors.action} /></Pressable><View style={styles.headerCopy}><Text style={styles.eyebrow}>CONTACT ATLAS</Text><Text style={styles.title}>Your people, around the world</Text><Text style={styles.intro}>Where everyone is based, from their latest saved city. Tap a marker to see your people.</Text></View></View>
    <View style={styles.map} onTouchStart={() => setMapTouching(true)} onTouchEnd={() => setMapTouching(false)} onTouchCancel={() => setMapTouching(false)}><ContactAtlasMap points={points} onSelect={setSelectedIds} /></View>
    {!mapped.length ? <Text style={styles.intro}>Add a city to a contact to place them on the map.</Text> : null}
    {selected.map(person => <Pressable key={person.id} accessibilityRole="button" onPress={() => router.push(`/contacts/${person.id}`)} style={styles.selected}><View style={styles.avatar}><Text style={styles.avatarText}>{initials(person.name)}</Text></View><View style={styles.selectedCopy}><Text style={styles.selectedName}>{person.name}</Text><Text style={styles.selectedLocation}>{person.location}</Text>{person.role || person.company ? <Text style={styles.selectedLocation}>{[person.role, person.company].filter(Boolean).join(' · ')}</Text> : null}{person.notes ? <Text numberOfLines={3} style={styles.selectedLocation}>{person.notes}</Text> : null}</View><SymbolView name={{ ios: 'chevron.right', android: 'chevron_right' }} size={18} tintColor={colors.textSecondary} /></Pressable>)}
    <Text style={styles.intro}>Pinch to zoom · Drag to explore · Numbers show people in the same city</Text>
    <Text style={styles.intro}>Contact names and addresses are never sent to a map service. Map imagery needs an internet connection.</Text>
    <View style={styles.summary}><Text style={styles.summaryStrong}>{mapped.length}</Text><Text style={styles.summaryText}>mapped</Text><View style={styles.divider} /><Text style={styles.summaryStrong}>{unmapped.length}</Text><Text style={styles.summaryText}>need a recognised city</Text></View>
    {mapped.length ? <View style={styles.section}><Text style={styles.sectionTitle}>People on the map</Text>{mapped.map(({ contact }) => <Pressable key={contact.id} accessibilityRole="button" onPress={() => router.push(`/contacts/${contact.id}`)} style={styles.row}><View style={styles.rowCopy}><Text style={styles.rowName}>{contact.name}</Text><Text style={styles.rowLocation}>{contact.location}{contact.role ? ` · ${contact.role}` : ''}</Text></View><SymbolView name={{ ios: 'chevron.right', android: 'chevron_right' }} size={18} tintColor={colors.textSecondary} /></Pressable>)}</View> : null}
    {unmapped.length ? <View style={styles.section}><Text style={styles.sectionTitle}>Needs a clearer location</Text>{unmapped.map((contact) => <Pressable key={contact.id} onPress={() => router.push(`/contacts/edit?id=${contact.id}`)} style={styles.row}><View style={styles.rowCopy}><Text style={styles.rowName}>{contact.name}</Text><Text style={styles.rowLocation}>{contact.location || 'No city saved'}</Text></View><Text style={styles.edit}>Edit</Text></Pressable>)}</View> : null}
  </ScrollView></SafeAreaView>;
}

function createStyles(colors: AppColors) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, paddingBottom: 100, gap: 17, maxWidth: 760, width: '100%', alignSelf: 'center' }, header: { flexDirection: 'row', gap: 8 }, back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }, headerCopy: { flex: 1, gap: 3 }, eyebrow: { color: colors.accent, fontFamily: Fonts.extraBold, fontSize: 10, letterSpacing: 1 }, title: { color: colors.text, fontFamily: Fonts.bold, fontSize: 25, lineHeight: 30 }, intro: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18 }, map: { height: 430, overflow: 'hidden', borderRadius: 20, backgroundColor: '#17202a', borderWidth: 1, borderColor: colors.line }, selected: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, borderRadius: 14, borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.backgroundElement }, avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft }, avatarText: { color: colors.action, fontFamily: Fonts.bold, fontSize: 13 }, selectedCopy: { flex: 1 }, selectedName: { color: colors.text, fontFamily: Fonts.bold, fontSize: 15 }, selectedLocation: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 12 }, summary: { flexDirection: 'row', alignItems: 'baseline', gap: 5, padding: 13, borderRadius: 12, backgroundColor: colors.backgroundElement }, summaryStrong: { color: colors.text, fontFamily: Fonts.bold, fontSize: 18 }, summaryText: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 12 }, divider: { width: 1, height: 18, backgroundColor: colors.line, marginHorizontal: 8 }, section: { gap: 8 }, sectionTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 18 }, row: { flexDirection: 'row', alignItems: 'center', padding: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line }, rowCopy: { flex: 1 }, rowName: { color: colors.text, fontFamily: Fonts.bold, fontSize: 14 }, rowLocation: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 11 }, edit: { color: colors.action, fontFamily: Fonts.bold, fontSize: 12 },
}); }
