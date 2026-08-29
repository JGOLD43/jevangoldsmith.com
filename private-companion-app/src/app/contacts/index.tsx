import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Chip } from '@/components/ui';
import { Fonts, type AppColors } from '@/constants/theme';
import type { NewRelationshipContact, RelationshipContact } from '@/domain/models';
import { useTheme } from '@/hooks/use-theme';
import { enableRelationshipReminders, relationshipRemindersEnabled } from '@/services/relationship-reminders';
import { useApp } from '@/state/app-context';

const DAY = 86_400_000;
const dateLabel = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
type PeopleSection = 'agenda' | 'contacts' | 'groups' | 'views';
type SmartView = 'all' | 'overdue' | 'week' | 'no-follow-up' | 'recent' | 'needs-details' | 'birthdays' | 'favorites';

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
}

function followUpLabel(contact: RelationshipContact) {
  if (!contact.nextFollowUpAt) return 'No follow-up set';
  const difference = Math.floor((new Date(contact.nextFollowUpAt).getTime() - Date.now()) / DAY);
  if (difference < 0) return `${Math.abs(difference)}d overdue`;
  if (difference === 0) return 'Due today';
  if (difference === 1) return 'Due tomorrow';
  return `Due ${dateLabel.format(new Date(contact.nextFollowUpAt))}`;
}

function ContactComposer({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const { createContact } = useApp();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');
  const [birthday, setBirthday] = useState('');
  const [firstMetPlace, setFirstMetPlace] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [cadence, setCadence] = useState('30');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const input: NewRelationshipContact = { name, company, role, email, phone, website, location, birthday, firstMetPlace, favorite, tags: tags.split(','), notes, cadenceDays: Number(cadence) || 30, nextFollowUpAt: new Date().toISOString() };
    const contact = await createContact(input);
    setSaving(false);
    if (contact) {
      setName(''); setCompany(''); setRole(''); setEmail(''); setPhone(''); setWebsite(''); setLocation(''); setBirthday(''); setFirstMetPlace(''); setFavorite(false); setTags(''); setNotes(''); setCadence('30');
      onDismiss();
      router.push(`/contacts/${contact.id}`);
    }
  };
  return <Modal animationType="slide" presentationStyle="pageSheet" visible={visible} onRequestClose={onDismiss}>
    <SafeAreaView style={styles.modalSafe}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.modalHeader}><Text style={styles.modalTitle}>Add a person</Text><Pressable onPress={onDismiss} accessibilityRole="button"><Text style={styles.close}>Close</Text></Pressable></View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
        <Text style={styles.inputLabel}>Name</Text><TextInput autoFocus value={name} onChangeText={setName} placeholder="Who do you want to remember?" placeholderTextColor={colors.textSecondary} style={styles.input} />
        <Text style={styles.inputLabel}>Work</Text><View style={styles.row}><TextInput value={company} onChangeText={setCompany} placeholder="Company" placeholderTextColor={colors.textSecondary} style={[styles.input, styles.flex]} /><TextInput value={role} onChangeText={setRole} placeholder="Role" placeholderTextColor={colors.textSecondary} style={[styles.input, styles.flex]} /></View>
        <Text style={styles.inputLabel}>Contact details</Text><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email" placeholderTextColor={colors.textSecondary} style={styles.input} /><View style={styles.row}><TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Phone" placeholderTextColor={colors.textSecondary} style={[styles.input, styles.flex]} /><TextInput value={website} onChangeText={setWebsite} autoCapitalize="none" placeholder="Website / LinkedIn" placeholderTextColor={colors.textSecondary} style={[styles.input, styles.flex]} /></View>
        <Text style={styles.inputLabel}>Location</Text><TextInput value={location} onChangeText={setLocation} placeholder="City or timezone" placeholderTextColor={colors.textSecondary} style={styles.input} />
        <Text style={styles.inputLabel}>Relationship details</Text><View style={styles.row}><TextInput value={birthday} onChangeText={setBirthday} placeholder="Birthday (YYYY-MM-DD)" placeholderTextColor={colors.textSecondary} style={[styles.input, styles.flex]} /><TextInput value={firstMetPlace} onChangeText={setFirstMetPlace} placeholder="Where you met" placeholderTextColor={colors.textSecondary} style={[styles.input, styles.flex]} /></View><Chip label={favorite ? '★ Favorite' : '☆ Add to favorites'} selected={favorite} onPress={() => setFavorite((value) => !value)} />
        <Text style={styles.inputLabel}>Groups</Text><TextInput value={tags} onChangeText={setTags} placeholder="Friend, investor, school…" placeholderTextColor={colors.textSecondary} style={styles.input} />
        <Text style={styles.inputLabel}>Keep-in-touch rhythm</Text><View style={styles.row}><TextInput value={cadence} onChangeText={setCadence} keyboardType="number-pad" placeholder="30" placeholderTextColor={colors.textSecondary} style={[styles.input, styles.cadenceInput]} /><Text style={styles.inputHint}>days after each conversation</Text></View>
        <Text style={styles.inputLabel}>What matters</Text><TextInput value={notes} onChangeText={setNotes} multiline textAlignVertical="top" placeholder="How you met, family, projects, gift ideas…" placeholderTextColor={colors.textSecondary} style={[styles.input, styles.notesInput]} />
        <Button label="Add privately" onPress={save} busy={saving} disabled={!name.trim() || saving} />
        <Text style={styles.helper}>People and notes stay in JGOLD’s encrypted on-device workspace.</Text>
      </ScrollView>
    </KeyboardAvoidingView></SafeAreaView>
  </Modal>;
}

export default function ContactsScreen() {
  const router = useRouter();
  const { contacts, phoneSyncMode, syncContacts } = useApp();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('All');
  const [section, setSection] = useState<PeopleSection>('agenda');
  const [smartView, setSmartView] = useState<SmartView>('all');
  const [composerOpen, setComposerOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  useEffect(() => { void relationshipRemindersEnabled().then(setRemindersEnabled).catch(() => undefined); }, []);
  const tags = useMemo(() => [...new Set(contacts.flatMap((contact) => contact.tags))].sort(), [contacts]);
  const shown = useMemo(() => contacts.filter((contact) => {
    const query = search.trim().toLowerCase();
    const matchesQuery = !query || [contact.name, contact.company, contact.role, contact.email, contact.phone, contact.location, contact.notes, ...contact.tags].join(' ').toLowerCase().includes(query);
    const dueNow = Boolean(contact.nextFollowUpAt && new Date(contact.nextFollowUpAt).getTime() <= Date.now() + DAY);
    const followUpTime = contact.nextFollowUpAt ? new Date(contact.nextFollowUpAt).getTime() : null;
    const matchesSmartView = smartView === 'all'
      || (smartView === 'overdue' && followUpTime !== null && followUpTime < Date.now())
      || (smartView === 'week' && followUpTime !== null && followUpTime >= Date.now() && followUpTime <= Date.now() + 7 * DAY)
      || (smartView === 'no-follow-up' && followUpTime === null)
      || (smartView === 'recent' && Boolean(contact.lastContactedAt && new Date(contact.lastContactedAt).getTime() >= Date.now() - 30 * DAY))
      || (smartView === 'needs-details' && (!contact.email || !contact.phone))
      || (smartView === 'birthdays' && Boolean(contact.birthday))
      || (smartView === 'favorites' && contact.favorite);
    return matchesQuery && (activeTag === 'All' || contact.tags.includes(activeTag)) && matchesSmartView && (section !== 'agenda' || dueNow);
  }), [activeTag, contacts, search, section, smartView]);
  const due = contacts.filter((contact) => contact.nextFollowUpAt && new Date(contact.nextFollowUpAt).getTime() <= Date.now() + DAY).length;
  const smartViews: { key: SmartView; label: string; detail: string; count: number }[] = [
    { key: 'overdue', label: 'Overdue', detail: 'Follow-ups that need attention now', count: contacts.filter((contact) => contact.nextFollowUpAt && new Date(contact.nextFollowUpAt).getTime() < Date.now()).length },
    { key: 'week', label: 'Due this week', detail: 'People coming up in the next seven days', count: contacts.filter((contact) => contact.nextFollowUpAt && new Date(contact.nextFollowUpAt).getTime() >= Date.now() && new Date(contact.nextFollowUpAt).getTime() <= Date.now() + 7 * DAY).length },
    { key: 'recent', label: 'Recently contacted', detail: 'Conversations logged in the last 30 days', count: contacts.filter((contact) => contact.lastContactedAt && new Date(contact.lastContactedAt).getTime() >= Date.now() - 30 * DAY).length },
    { key: 'no-follow-up', label: 'No follow-up', detail: 'Relationships without a reminder', count: contacts.filter((contact) => !contact.nextFollowUpAt).length },
    { key: 'needs-details', label: 'Needs details', detail: 'Missing an email or phone number', count: contacts.filter((contact) => !contact.email || !contact.phone).length },
    { key: 'birthdays', label: 'Birthdays', detail: 'Dates worth remembering', count: contacts.filter((contact) => contact.birthday).length },
    { key: 'favorites', label: 'Favorites', detail: 'The people closest to you', count: contacts.filter((contact) => contact.favorite).length },
  ];
  const importContacts = async () => {
    setImporting(true);
    try {
      const result = await syncContacts('two-way', true);
      if (!result) return;
      Alert.alert('Phone contacts synced', `${result.imported} added, ${result.updated} refreshed and ${result.exported} added to your phone. Future changes sync automatically.`);
    } catch (cause) {
      Alert.alert('Could not import contacts', cause instanceof Error ? cause.message : 'Please try again.');
    } finally { setImporting(false); }
  };
  const turnOnReminders = async () => {
    const enabled = await enableRelationshipReminders().catch(() => false);
    setRemindersEnabled(enabled);
    Alert.alert(enabled ? 'Reminders are on' : 'Reminders are off', enabled ? 'JGOLD will notify you for future relationship follow-ups.' : 'You can enable notifications for JGOLD in Android settings.');
  };
  const openSmartView = (key: SmartView) => { setSmartView(key); setActiveTag('All'); setSection('contacts'); };
  return <>
    <SafeAreaView edges={['top']} style={styles.safe}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <View style={styles.header}><View style={styles.headerCopy}><Text style={styles.eyebrow}>PERSONAL CRM</Text><Text style={styles.title}>People</Text><Text style={styles.intro}>{due ? `${due} relationship${due === 1 ? '' : 's'} need a little attention.` : 'A quieter way to stay close to the people who matter.'}</Text></View><View style={styles.headerActions}><Pressable accessibilityLabel="Sync phone contacts" accessibilityRole="button" onPress={() => void importContacts()} style={styles.iconButton}><SymbolView name={{ ios: 'arrow.triangle.2.circlepath', android: 'sync' }} size={21} tintColor={colors.action} /></Pressable><Pressable accessibilityLabel="Open contact map" accessibilityRole="button" onPress={() => router.push('/contacts/map')} style={styles.iconButton}><SymbolView name={{ ios: 'map.fill', android: 'map' }} size={21} tintColor={colors.action} /></Pressable><Pressable accessibilityLabel="Add a person" accessibilityRole="button" onPress={() => setComposerOpen(true)} style={styles.addButton}><SymbolView name={{ ios: 'plus', android: 'add' }} size={27} tintColor={colors.onAction} /></Pressable></View></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sections}><Chip label={`Agenda${due ? ` · ${due}` : ''}`} selected={section === 'agenda'} onPress={() => { setSection('agenda'); setSmartView('all'); setActiveTag('All'); }} /><Chip label="Contacts" selected={section === 'contacts'} onPress={() => { setSection('contacts'); setSmartView('all'); }} /><Chip label="Groups" selected={section === 'groups'} onPress={() => setSection('groups')} /><Chip label="Views" selected={section === 'views'} onPress={() => setSection('views')} /></ScrollView>
      <View style={styles.search}><SymbolView name={{ ios: 'magnifyingglass', android: 'search' }} size={19} tintColor={colors.textSecondary} /><TextInput value={search} onChangeText={setSearch} placeholder="Search people, notes or groups" placeholderTextColor={colors.textSecondary} style={styles.searchInput} /></View>
      {section === 'contacts' ? <Pressable accessibilityRole="button" onPress={importContacts} disabled={importing} style={({ pressed }) => [styles.importButton, pressed && styles.pressed, importing && styles.disabled]}><SymbolView name={{ ios: 'arrow.triangle.2.circlepath', android: 'sync' }} size={17} tintColor={colors.action} /><Text style={styles.importLabel}>{importing ? 'Syncing contacts…' : phoneSyncMode === 'two-way' ? 'Phone sync is on' : 'Turn on phone sync'}</Text></Pressable> : null}
      {section === 'contacts' && tags.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}><Chip label="Everyone" selected={activeTag === 'All'} onPress={() => setActiveTag('All')} />{tags.map((tag) => <Chip key={tag} label={tag} selected={activeTag === tag} onPress={() => setActiveTag(tag)} />)}</ScrollView> : null}
      {section === 'agenda' && !remindersEnabled ? <Pressable accessibilityRole="button" onPress={turnOnReminders} style={({ pressed }) => [styles.reminderBanner, pressed && styles.pressed]}><SymbolView name={{ ios: 'bell.badge', android: 'notifications_active' }} size={22} tintColor={colors.action} /><View style={styles.contactCopy}><Text style={styles.reminderTitle}>Turn on keep-in-touch reminders</Text><Text style={styles.reminderBody}>Get a private Android alert when a relationship is due.</Text></View><Text style={styles.reminderLink}>Enable</Text></Pressable> : null}
      {section === 'agenda' && contacts.length ? <Pressable accessibilityRole="button" onPress={() => { const person = contacts[Math.floor(Math.random() * contacts.length)]; router.push(`/contacts/${person.id}`); }} style={({ pressed }) => [styles.shuffleCard, pressed && styles.pressed]}><View style={styles.groupIcon}><SymbolView name={{ ios: 'dice.fill', android: 'casino' }} size={21} tintColor={colors.action} /></View><View style={styles.contactCopy}><Text style={styles.reminderTitle}>Rediscover someone</Text><Text style={styles.reminderBody}>Surface a relationship you may not have thought about lately.</Text></View><Text style={styles.reminderLink}>Shuffle</Text></Pressable> : null}
      {section === 'groups' ? <><View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Groups</Text><Text style={styles.sectionDetail}>{tags.length}</Text></View>{tags.length ? tags.map((tag) => { const count = contacts.filter((contact) => contact.tags.includes(tag)).length; return <Pressable key={tag} accessibilityRole="button" onPress={() => { setActiveTag(tag); setSmartView('all'); setSection('contacts'); }} style={({ pressed }) => [styles.viewCard, pressed && styles.pressed]}><View style={styles.groupIcon}><Text style={styles.groupIconText}>#</Text></View><View style={styles.contactCopy}><Text style={styles.viewName}>{tag}</Text><Text style={styles.viewDetail}>{count} {count === 1 ? 'contact' : 'contacts'}</Text></View><SymbolView name={{ ios: 'chevron.right', android: 'chevron_right' }} size={18} tintColor={colors.textSecondary} /></Pressable>; }) : <View style={styles.empty}><Text style={styles.emptyTitle}>No groups yet</Text><Text style={styles.emptyBody}>Add groups such as Friends, Family, Coworkers, or Networking when you create or edit a contact.</Text><Button label="Add a person" onPress={() => setComposerOpen(true)} /></View>}</> : null}
      {section === 'views' ? <><View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Smart views</Text><Text style={styles.sectionDetail}>Always up to date</Text></View>{smartViews.map((item) => <Pressable key={item.key} accessibilityRole="button" onPress={() => openSmartView(item.key)} style={({ pressed }) => [styles.viewCard, pressed && styles.pressed]}><View style={styles.viewCount}><Text style={styles.viewCountText}>{item.count}</Text></View><View style={styles.contactCopy}><Text style={styles.viewName}>{item.label}</Text><Text style={styles.viewDetail}>{item.detail}</Text></View><SymbolView name={{ ios: 'chevron.right', android: 'chevron_right' }} size={18} tintColor={colors.textSecondary} /></Pressable>)}</> : null}
      {(section === 'agenda' || section === 'contacts') ? <><View style={styles.sectionHeading}><Text style={styles.sectionTitle}>{section === 'agenda' ? 'Keep in touch' : smartView === 'all' ? 'Your people' : smartViews.find((item) => item.key === smartView)?.label}</Text><Text style={styles.sectionDetail}>{shown.length} {shown.length === 1 ? 'person' : 'people'}</Text></View>
      {shown.length ? shown.map((contact) => <Pressable key={contact.id} accessibilityRole="button" accessibilityLabel={`Open ${contact.name}`} onPress={() => router.push(`/contacts/${contact.id}`)} style={({ pressed }) => [styles.contactCard, pressed && styles.pressed]}><View style={styles.avatar}><Text style={styles.avatarText}>{initials(contact.name)}</Text></View><View style={styles.contactCopy}><View style={styles.contactTitleRow}><Text numberOfLines={1} style={styles.contactName}>{contact.name}</Text><Text style={[styles.followUp, contact.nextFollowUpAt && new Date(contact.nextFollowUpAt).getTime() <= Date.now() + DAY && styles.followUpDue]}>{followUpLabel(contact)}</Text></View><Text numberOfLines={1} style={styles.contactDetail}>{[contact.role, contact.company].filter(Boolean).join(' · ') || contact.location || 'Add a little context'}</Text>{contact.tags.length ? <Text numberOfLines={1} style={styles.contactTags}>{contact.tags.map((tag) => `#${tag}`).join('  ')}</Text> : null}</View><SymbolView name={{ ios: 'chevron.right', android: 'chevron_right' }} size={18} tintColor={colors.textSecondary} /></Pressable>) : <View style={styles.empty}><SymbolView name={{ ios: 'person.crop.circle.badge.plus', android: 'person_add' }} size={35} tintColor={colors.accent} /><Text style={styles.emptyTitle}>{contacts.length ? (section === 'agenda' ? 'You’re all caught up' : 'No people match this view') : 'Start with one person'}</Text><Text style={styles.emptyBody}>{contacts.length ? (section === 'agenda' ? 'No follow-ups need attention today. JGOLD will keep watch.' : 'Try another search, group, or smart view.') : 'Save the context you want to remember and let JGOLD keep the next follow-up in view.'}</Text><Button label={contacts.length ? 'Browse everyone' : 'Add a person'} onPress={() => contacts.length ? openSmartView('all') : setComposerOpen(true)} /></View>}</> : null}
    </ScrollView></SafeAreaView>
    <ContactComposer visible={composerOpen} onDismiss={() => setComposerOpen(false)} />
  </>;
}

function createStyles(colors: AppColors) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, paddingBottom: 120, gap: 16, maxWidth: 760, width: '100%', alignSelf: 'center' }, flex: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, headerCopy: { flex: 1, minWidth: 0 }, headerActions: { flexDirection: 'row', gap: 7, paddingTop: 2 }, iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.backgroundSelected, alignItems: 'center', justifyContent: 'center' }, eyebrow: { color: colors.accent, fontFamily: Fonts.extraBold, fontSize: 12, letterSpacing: 1.2 }, title: { color: colors.text, fontFamily: Fonts.bold, fontSize: 38, lineHeight: 44 }, intro: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22, maxWidth: 500, marginTop: 3 }, addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.action, alignItems: 'center', justifyContent: 'center' }, sections: { flexDirection: 'row', gap: 8, paddingRight: 8 }, search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.backgroundElement, borderColor: colors.line, borderWidth: 1, borderRadius: 11, paddingHorizontal: 13 }, searchInput: { flex: 1, height: 46, color: colors.text, fontFamily: Fonts.sans, fontSize: 15 }, importButton: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', paddingVertical: 2 }, importLabel: { color: colors.action, fontFamily: Fonts.bold, fontSize: 13 }, disabled: { opacity: .5 }, chips: { gap: 8 }, sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }, sectionTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 20 }, sectionDetail: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 13 }, reminderBanner: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, borderRadius: 12, borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.accentSoft }, shuffleCard: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.backgroundElement }, reminderTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 14 }, reminderBody: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 12 }, reminderLink: { color: colors.action, fontFamily: Fonts.bold, fontSize: 13 }, viewCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.backgroundElement }, groupIcon: { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft }, groupIconText: { color: colors.action, fontFamily: Fonts.bold, fontSize: 20 }, viewCount: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.action }, viewCountText: { color: colors.onAction, fontFamily: Fonts.bold, fontSize: 15 }, viewName: { color: colors.text, fontFamily: Fonts.bold, fontSize: 15 }, viewDetail: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 12 }, contactCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.backgroundElement }, pressed: { opacity: 0.74 }, avatar: { width: 43, height: 43, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft }, avatarText: { color: colors.action, fontFamily: Fonts.bold, fontSize: 15 }, contactCopy: { flex: 1, minWidth: 0, gap: 3 }, contactTitleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 }, contactName: { flex: 1, color: colors.text, fontFamily: Fonts.bold, fontSize: 16 }, followUp: { color: colors.textSecondary, fontFamily: Fonts.semibold, fontSize: 11 }, followUpDue: { color: colors.danger }, contactDetail: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 13 }, contactTags: { color: colors.accent, fontFamily: Fonts.semibold, fontSize: 12 }, empty: { alignItems: 'center', gap: 10, padding: 32, backgroundColor: colors.backgroundElement, borderRadius: 12, borderWidth: 1, borderColor: colors.line }, emptyTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 20 }, emptyBody: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 4 }, modalSafe: { flex: 1, backgroundColor: colors.background }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.line }, modalTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 20 }, close: { color: colors.action, fontFamily: Fonts.bold, fontSize: 15 }, form: { padding: 20, gap: 9, paddingBottom: 44 }, inputLabel: { color: colors.text, fontFamily: Fonts.bold, fontSize: 14, marginTop: 5 }, input: { minHeight: 47, color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.line, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, fontFamily: Fonts.sans, fontSize: 15 }, row: { flexDirection: 'row', gap: 9, alignItems: 'center' }, cadenceInput: { width: 84 }, inputHint: { flex: 1, color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 13 }, notesInput: { minHeight: 130, paddingTop: 12 }, helper: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 12, textAlign: 'center', lineHeight: 18 },
}); }
