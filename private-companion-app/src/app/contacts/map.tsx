import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, type AppColors } from '@/constants/theme';
import type { RelationshipContact } from '@/domain/models';
import { useTheme } from '@/hooks/use-theme';
import { mappableContact } from '@/services/contact-locations';
import { useApp } from '@/state/app-context';

function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?'; }

export default function ContactMapScreen() {
  const router = useRouter();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { contacts } = useApp();
  const [size, setSize] = useState({ width: 320, height: 220 });
  const [selected, setSelected] = useState<RelationshipContact | null>(null);
  const mapped = useMemo(() => contacts.map(mappableContact).filter((item): item is NonNullable<typeof item> => Boolean(item)), [contacts]);
  const unmapped = contacts.filter((contact) => contact.location && !mappableContact(contact));
  const measure = (event: LayoutChangeEvent) => setSize(event.nativeEvent.layout);
  return <SafeAreaView edges={['top']} style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.header}><Pressable accessibilityLabel="Back to people" onPress={() => router.back()} style={styles.back}><SymbolView name={{ ios: 'chevron.left', android: 'arrow_back' }} size={22} tintColor={colors.action} /></Pressable><View style={styles.headerCopy}><Text style={styles.eyebrow}>CONTACT ATLAS</Text><Text style={styles.title}>Your people, around the world</Text><Text style={styles.intro}>Locations are placed privately on this phone. Addresses are never sent to a map service.</Text></View></View>
    <View onLayout={measure} style={styles.map}>
      <View style={[styles.land, styles.americas]} /><View style={[styles.land, styles.europe]} /><View style={[styles.land, styles.asia]} /><View style={[styles.land, styles.australia]} />
      {mapped.map(({ contact, latitude, longitude }) => {
        const left = Math.max(10, Math.min(size.width - 42, ((longitude + 180) / 360) * size.width - 18));
        const top = Math.max(10, Math.min(size.height - 42, ((90 - latitude) / 180) * size.height - 18));
        return <Pressable key={contact.id} accessibilityLabel={`${contact.name} in ${contact.location}`} onPress={() => setSelected(contact)} style={[styles.pin, { left, top }, selected?.id === contact.id && styles.pinSelected]}><Text style={styles.pinText}>{initials(contact.name)}</Text></Pressable>;
      })}
      {!mapped.length ? <View style={styles.mapEmpty}><SymbolView name={{ ios: 'mappin.and.ellipse', android: 'location_on' }} size={30} tintColor={colors.accent} /><Text style={styles.mapEmptyTitle}>Add a city to place someone here</Text><Text style={styles.mapEmptyBody}>Brisbane, Sydney, London, New York and other major cities work immediately.</Text></View> : null}
    </View>
    {selected ? <Pressable accessibilityRole="button" onPress={() => router.push(`/contacts/${selected.id}`)} style={styles.selected}><View style={styles.avatar}><Text style={styles.avatarText}>{initials(selected.name)}</Text></View><View style={styles.selectedCopy}><Text style={styles.selectedName}>{selected.name}</Text><Text style={styles.selectedLocation}>{selected.location}</Text></View><SymbolView name={{ ios: 'chevron.right', android: 'chevron_right' }} size={18} tintColor={colors.textSecondary} /></Pressable> : null}
    <View style={styles.summary}><Text style={styles.summaryStrong}>{mapped.length}</Text><Text style={styles.summaryText}>mapped</Text><View style={styles.divider} /><Text style={styles.summaryStrong}>{unmapped.length}</Text><Text style={styles.summaryText}>need a recognised city</Text></View>
    {unmapped.length ? <View style={styles.section}><Text style={styles.sectionTitle}>Needs a clearer location</Text>{unmapped.map((contact) => <Pressable key={contact.id} onPress={() => router.push(`/contacts/edit?id=${contact.id}`)} style={styles.row}><View style={styles.rowCopy}><Text style={styles.rowName}>{contact.name}</Text><Text style={styles.rowLocation}>{contact.location}</Text></View><Text style={styles.edit}>Edit</Text></Pressable>)}</View> : null}
  </ScrollView></SafeAreaView>;
}

function createStyles(colors: AppColors) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, paddingBottom: 100, gap: 17, maxWidth: 760, width: '100%', alignSelf: 'center' }, header: { flexDirection: 'row', gap: 8 }, back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }, headerCopy: { flex: 1, gap: 3 }, eyebrow: { color: colors.accent, fontFamily: Fonts.extraBold, fontSize: 10, letterSpacing: 1 }, title: { color: colors.text, fontFamily: Fonts.bold, fontSize: 25, lineHeight: 30 }, intro: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18 }, map: { height: 260, overflow: 'hidden', borderRadius: 20, backgroundColor: '#17202a', borderWidth: 1, borderColor: colors.line }, land: { position: 'absolute', backgroundColor: '#37483b', opacity: .8, borderRadius: 60, transform: [{ rotate: '-9deg' }] }, americas: { width: 75, height: 170, left: '15%', top: 30 }, europe: { width: 62, height: 65, left: '45%', top: 45 }, asia: { width: 110, height: 105, right: '9%', top: 42 }, australia: { width: 65, height: 44, right: '8%', bottom: 24 }, pin: { position: 'absolute', zIndex: 2, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.action, borderWidth: 3, borderColor: '#17202a' }, pinSelected: { transform: [{ scale: 1.15 }], borderColor: colors.accent }, pinText: { color: colors.onAction, fontFamily: Fonts.bold, fontSize: 11 }, mapEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 38, gap: 8 }, mapEmptyTitle: { color: '#fff', fontFamily: Fonts.bold, fontSize: 16, textAlign: 'center' }, mapEmptyBody: { color: '#aab2bd', fontFamily: Fonts.sans, fontSize: 11, lineHeight: 16, textAlign: 'center' }, selected: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, borderRadius: 14, borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.backgroundElement }, avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft }, avatarText: { color: colors.action, fontFamily: Fonts.bold, fontSize: 13 }, selectedCopy: { flex: 1 }, selectedName: { color: colors.text, fontFamily: Fonts.bold, fontSize: 15 }, selectedLocation: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 12 }, summary: { flexDirection: 'row', alignItems: 'baseline', gap: 5, padding: 13, borderRadius: 12, backgroundColor: colors.backgroundElement }, summaryStrong: { color: colors.text, fontFamily: Fonts.bold, fontSize: 18 }, summaryText: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 12 }, divider: { width: 1, height: 18, backgroundColor: colors.line, marginHorizontal: 8 }, section: { gap: 8 }, sectionTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 18 }, row: { flexDirection: 'row', alignItems: 'center', padding: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line }, rowCopy: { flex: 1 }, rowName: { color: colors.text, fontFamily: Fonts.bold, fontSize: 14 }, rowLocation: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 11 }, edit: { color: colors.action, fontFamily: Fonts.bold, fontSize: 12 },
}); }
