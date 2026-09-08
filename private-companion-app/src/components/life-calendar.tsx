import { randomUUID } from 'expo-crypto';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, AppState, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/state/app-context';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { LIFE_AREAS, lifeAreaDefinition } from '@/constants/life-areas';
import { addDays, blockDates, dayKey, EMPTY_CALENDAR, eventLinkKey, gentleReview, occupiedMinutes, occurrenceKey, weekStart, type CalendarPreferences, type TimeEvent } from '@/domain/life-calendar';
import { readCalendarPreferences, saveCalendarPreferences } from '@/storage/life-calendar';
import { calendarAccess, calendarEvents, createTimeBlock, openTimeEvent, phoneCalendars, setWeeklyReview, weeklyReviewEnabled, type PhoneCalendar } from '@/services/life-calendar';

export function LifeCalendar() {
  const colors = useTheme();
  const { lifeItems } = useApp();
  const [day, setDay] = useState(() => new Date());
  const [preferences, setPreferences] = useState<CalendarPreferences>(EMPTY_CALENDAR);
  const prefsRef = useRef(preferences);
  const [events, setEvents] = useState<TimeEvent[]>([]);
  const [calendars, setCalendars] = useState<PhoneCalendar[]>([]);
  const [connected, setConnected] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [refreshed, setRefreshed] = useState<Date | null>(null);
  const [modal, setModal] = useState<'connect' | 'plan' | 'link' | null>(null);
  const [linkingEvent, setLinkingEvent] = useState<TimeEvent | null>(null);
  const [itemId, setItemId] = useState('');
  const [time, setTime] = useState('18:00');
  const [duration, setDuration] = useState('30');
  const [target, setTarget] = useState('60');
  const [why, setWhy] = useState('');
  const [cost, setCost] = useState('');
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const operation = useRef(false);
  const start = useMemo(() => weekStart(day), [day]);
  const end = useMemo(() => addDays(start, 7), [start]);
  const currentWeek = dayKey(start) === dayKey(weekStart(new Date()));
  const requestNumber = useRef(0);
  const refresh = useCallback(async () => {
    const number = ++requestNumber.current;
    try {
      const prefs = await readCalendarPreferences();
      const access = await calendarAccess();
      const available = access ? await phoneCalendars() : [];
      const ids = prefs.calendarIds.filter(id => available.some(c => c.id === id));
      const next = access ? await calendarEvents(ids, start, end) : [];
      const notification = await weeklyReviewEnabled();
      if (number !== requestNumber.current) return;
      prefsRef.current = prefs; setPreferences(prefs); setConnected(access); setCalendars(available); setEvents(next.map(event => ({ ...event, lifeItemId: prefs.links?.[eventLinkKey(event)] ?? event.lifeItemId }))); setReview(notification); setLoaded(true); setError(''); setRefreshed(new Date());
    } catch (cause) { if (number === requestNumber.current) { setError(cause instanceof Error ? cause.message : 'Calendar could not refresh. Try again.'); setLoaded(true); } }
  }, [start, end]);
  useFocusEffect(useCallback(() => {
    void refresh();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    const timer = setInterval(() => { if (AppState.currentState === 'active' && !operation.current) void refresh(); }, 60000);
    return () => { requestNumber.current++; subscription.remove(); clearInterval(timer); };
  }, [refresh]));
  async function persist(next: CalendarPreferences) { ++requestNumber.current; await saveCalendarPreferences(next); prefsRef.current = next; setPreferences(next); }
  async function perform(action: () => Promise<void>) {
    if (operation.current || !loaded) return;
    operation.current = true; setBusy(true);
    try { await action(); } catch (cause) { Alert.alert('Calendar', cause instanceof Error ? cause.message : 'Please try again.'); }
    finally { operation.current = false; setBusy(false); }
  }
  const text = { color: colors.text, fontFamily: Fonts.sans, fontSize: 14 };
  const muted = { ...text, color: colors.textSecondary, fontSize: 12, lineHeight: 18 };
  const titleStyle = { ...text, fontFamily: Fonts.bold, fontSize: 20 };
  const button = (label: string, action: () => void, selected = false) => <Pressable key={label} disabled={busy || !loaded} accessibilityRole="button" accessibilityState={{ selected, disabled: busy || !loaded }} onPress={action} style={[s.button, { backgroundColor: selected ? colors.accentSoft : colors.backgroundSelected, borderColor: selected ? colors.accent : colors.line }]}><Text style={[text, { fontFamily: Fonts.bold }]}>{label}</Text></Pressable>;
  function selectItem(id: string) { setItemId(id); const intention = preferences.intentions[id]; setTarget(String(intention?.weeklyMinutes ?? 60)); setWhy(intention?.why ?? ''); setCost(intention?.cost ?? ''); }
  async function saveIntention() {
    if (!itemId || !lifeItems.some(i => i.id === itemId)) throw new Error('Choose an item from your lists first.');
    const minutes = Number(target);
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 10080) throw new Error('Choose a weekly aim of 5–10,080 minutes.');
    await persist({ ...prefsRef.current, intentions: { ...prefsRef.current.intentions, [itemId]: { weeklyMinutes: minutes, why: why.trim(), cost: cost.trim() } } });
  }
  async function createBlock() {
    const item = lifeItems.find(i => i.id === itemId);
    if (!item) throw new Error('Choose an item from your lists first.');
    if (!preferences.writeCalendarId) throw new Error('Connect and choose a calendar for new time blocks first.');
    const dates = blockDates(day, time, Number(duration));
    if (+dates.start <= Date.now()) throw new Error('Choose a future time for this time block.');
    const conflicts = events.filter(e => !e.allDay && +new Date(e.start) < +dates.end && +new Date(e.end) > +dates.start);
    await saveIntention();
    if (conflicts.length) {
      Alert.alert('This time overlaps', `You already have ${conflicts.map(e => e.title).join(', ')}. Create the block anyway?`, [{ text: 'Choose another time', style: 'cancel' }, { text: 'Create block', onPress: () => { void perform(() => submitBlock(item, dates)); } }]);
      return;
    }
    await submitBlock(item, dates);
  }
  async function submitBlock(item: { id: string; title: string }, dates: { start: Date; end: Date }) {
    await createTimeBlock(prefsRef.current.writeCalendarId, item, dates.start, dates.end);
    // Close immediately after the native write succeeds; a failed refresh must not invite a duplicate write.
    setModal(null); await refresh();
    Alert.alert('Time block added', 'Saved to your selected calendar. If it’s a Google calendar, your phone’s account sync carries it to Google.');
  }
  const selectedEvents = events.filter(e => +new Date(e.start) < +addDays(new Date(day.getFullYear(), day.getMonth(), day.getDate()), 1) && +new Date(e.end) > +new Date(day.getFullYear(), day.getMonth(), day.getDate()));
  const confirmed = Object.values(preferences.confirmations);
  const linkedEvents = events.filter(e => e.lifeItemId && lifeItems.some(i => i.id === e.lifeItemId));
  return <View style={[s.card, { backgroundColor: colors.backgroundElement, borderColor: colors.line }]}>
    <View style={s.row}><Text style={[titleStyle, s.flex]}>Time for what matters</Text>{button('＋ Plan', () => { selectItem(lifeItems.find(i => i.progress < 100)?.id ?? ''); setModal('plan'); })}</View>
    <Text style={muted}>Make room for your goals, learning, interests, trips and Fucket List.</Text>
    <View style={s.row}>{button('‹', () => setDay(addDays(day, -7)))}<Text style={[text, s.flex, s.center]}>{start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {addDays(end, -1).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</Text>{button('›', () => setDay(addDays(day, 7)))}</View>
    <View style={s.row}>{Array.from({ length: 7 }, (_, index) => { const date = addDays(start, index); const selected = dayKey(date) === dayKey(day); const hasEvents = events.some(e => +new Date(e.start) < +addDays(date, 1) && +new Date(e.end) > +date); return <Pressable accessibilityRole="button" accessibilityLabel={date.toDateString()} accessibilityState={{ selected }} key={index} onPress={() => setDay(date)} style={[s.day, { backgroundColor: selected ? colors.accentSoft : colors.backgroundElement, borderColor: selected ? colors.accent : colors.line }]}><Text style={muted}>{date.toLocaleDateString(undefined, { weekday: 'narrow' })}</Text><Text style={[text, { fontFamily: Fonts.bold }]}>{date.getDate()}</Text><Text style={{ color: hasEvents ? colors.accent : 'transparent', fontSize: 10 }}>●</Text></Pressable>; })}</View>
    <View style={s.row}>{button('Today', () => setDay(new Date()))}{button('Calendars', () => setModal('connect'))}{button('Refresh', () => { void refresh(); })}</View>
    {error ? <Text accessibilityRole="alert" style={[muted, { color: colors.danger }]}>{error} Calendar totals may be out of date.</Text> : null}
    {!loaded ? <Text style={muted}>Loading your calendar…</Text> : !connected || !preferences.calendarIds.length ? <>{button('Connect phone calendars', () => setModal('connect'))}<Text style={muted}>Choose your Google calendars after allowing access. Add your Google account in Android calendar settings if it isn’t listed.</Text></> : <>
      <Text style={muted}>{refreshed ? `Read from phone at ${refreshed.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}. Google sync is managed by your phone.` : ''}</Text>
      {!selectedEvents.length ? <Text style={muted}>No events on this day. Unscheduled time doesn’t mean you did nothing.</Text> : selectedEvents.map(event => {
        const item = lifeItems.find(i => i.id === event.lifeItemId); const key = occurrenceKey(event); const done = !!preferences.confirmations[key];
        return <View key={key} style={[s.event, { borderColor: item ? lifeAreaDefinition(item.area).color : colors.line }]}>
          <Pressable accessibilityRole="button" onPress={() => { void perform(() => openTimeEvent(event.id)); }}><Text style={[text, { fontFamily: Fonts.bold }]}>{event.title}</Text><Text style={muted}>{event.allDay ? 'All day' : `${new Date(event.start).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} – ${new Date(event.end).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`}{item ? ` · ${lifeAreaDefinition(item.area).label}` : ''}</Text></Pressable>
          {button(item ? 'Change goal' : 'Link to a goal', () => { setLinkingEvent(event); selectItem(item?.id ?? lifeItems[0]?.id ?? ''); setModal('link'); })}
          {item && !event.allDay && +new Date(event.end) <= Date.now() ? button(done ? '✓ Done · undo' : 'I did this', () => { void perform(async () => { const confirmations = { ...prefsRef.current.confirmations }; if (done) delete confirmations[key]; else confirmations[key] = { lifeItemId: item.id, start: event.start, end: event.end }; await persist({ ...prefsRef.current, confirmations }); }); }) : null}
        </View>;
      })}
      <Text style={[text, { fontFamily: Fonts.bold }]}>This week · minutes</Text>
      <Text style={muted}>{occupiedMinutes(events, start, end)} scheduled across your calendars · {occupiedMinutes(linkedEvents, start, end)} for your lists · {occupiedMinutes(confirmed, start, end)} confirmed done</Text>
      <Text style={muted}>Overlapping time counts once. All-day events aren’t counted as hours. “I did this” confirms the full block.</Text>
    </>}
    {Object.entries(preferences.confirmations).filter(([key, entry]) => key.startsWith('manual:') && dayKey(new Date(entry.start)) === dayKey(day)).map(([key, entry]) => <View style={s.review} key={key}><Text style={text}>{lifeItems.find(i => i.id === entry.lifeItemId)?.title ?? 'Activity'} · {Math.round((+new Date(entry.end) - +new Date(entry.start)) / 60000)} min logged</Text>{button('Remove log', () => { void perform(async () => { const confirmations = { ...prefsRef.current.confirmations }; delete confirmations[key]; await persist({ ...prefsRef.current, confirmations }); }); })}</View>)}
    {LIFE_AREAS.map(area => { const items = lifeItems.filter(i => i.area === area.key && i.progress < 100 && preferences.intentions[i.id]); if (!items.length) return null; return <View key={area.key} style={s.review}><Text style={[text, { color: area.color, fontFamily: Fonts.bold }]}>{area.label}</Text>{items.map(item => { const intention = preferences.intentions[item.id]; const planned = occupiedMinutes(events.filter(e => e.lifeItemId === item.id), start, end); const done = occupiedMinutes(confirmed.filter(c => c.lifeItemId === item.id), start, end); return <Pressable key={item.id} accessibilityRole="button" onPress={() => { selectItem(item.id); setModal('plan'); }}><Text style={text}>{item.title}</Text><Text style={muted}>{error || !connected || !preferences.calendarIds.length ? 'Calendar unavailable' : `${planned} planned`} · {done} done · {intention.weeklyMinutes} min aim</Text>{currentWeek && !error && connected && preferences.calendarIds.length ? <Text style={muted}>{gentleReview(item.title, intention, planned, done)}</Text> : null}</Pressable>; })}</View>; })}
    {button(review ? 'Weekly check-in on · turn off' : 'Remind me to check in weekly', () => { void perform(async () => { await setWeeklyReview(!review); setReview(!review); }); })}
    <Text style={muted}>A gentle Sunday check-in at 6 pm. Your private reasons appear here, not on your lock screen.</Text>
    <Modal visible={modal !== null} animationType="slide" onRequestClose={() => { if (!busy) setModal(null); }}>
      <SafeAreaView style={[s.flex, { backgroundColor: colors.background }]}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.modal}>
        <View style={s.row}><Text style={[titleStyle, s.flex]}>{modal === 'connect' ? 'Your calendars' : modal === 'link' ? 'Link to your life' : 'Make time'}</Text>{button('Close', () => setModal(null))}</View>
        {modal === 'connect' ? <>
          <Text style={muted}>JGOLD reads selected calendars on this phone and creates blocks in the calendar you choose. Google’s device sync carries changes between your phone and Google Calendar.</Text>
          {!connected ? button('Allow calendar access', () => { void perform(async () => { if (!await calendarAccess(true)) { Alert.alert('Calendar access needed', 'Allow Calendar access in JGOLD’s phone settings.', [{ text: 'Cancel' }, { text: 'Open settings', onPress: () => { void Linking.openSettings(); } }]); return; } await refresh(); }); }) : null}
          {connected && !calendars.length ? <Text style={muted}>No calendars found. Add your Google account to the phone’s calendar app, enable Calendar sync, then return here.</Text> : null}
          {calendars.map(calendar => <View style={s.review} key={calendar.id}><Text style={text}>{calendar.title}</Text><Text style={muted}>{calendar.source?.type === 'com.google' ? 'Google · ' : ''}{calendar.ownerAccount || calendar.source?.name}{!calendar.allowsModifications ? ' · read only' : ''}</Text>{button(preferences.calendarIds.includes(calendar.id) ? '✓ Show events' : 'Show events', () => { void perform(async () => { const ids = preferences.calendarIds.includes(calendar.id) ? preferences.calendarIds.filter(id => id !== calendar.id) : [...preferences.calendarIds, calendar.id]; await persist({ ...prefsRef.current, calendarIds: ids, writeCalendarId: ids.includes(preferences.writeCalendarId) ? preferences.writeCalendarId : '' }); await refresh(); }); })}{calendar.allowsModifications ? button(preferences.writeCalendarId === calendar.id ? '✓ New blocks go here' : 'Use for new blocks', () => { void perform(async () => { await persist({ ...prefsRef.current, writeCalendarId: calendar.id, calendarIds: [...new Set([...preferences.calendarIds, calendar.id])] }); await refresh(); }); }, preferences.writeCalendarId === calendar.id) : null}</View>)}
          {button('Refresh calendars', () => { void refresh(); })}
        </> : modal === 'link' ? <>
          <Text style={text}>{linkingEvent?.title}</Text><Text style={muted}>Link this event to a goal, learning item, interest, trip or Fucket List item. Repeating occurrences use the same link. This association stays private and doesn’t change the calendar event.</Text>
          {!lifeItems.length ? <Text style={text}>Add an item to your lists on Home first.</Text> : null}
          <View style={s.wrap}>{lifeItems.map(item => button(item.title, () => selectItem(item.id), itemId === item.id))}</View>
          {itemId ? button('Save link', () => { void perform(async () => { if (!linkingEvent) return; await persist({ ...prefsRef.current, links: { ...prefsRef.current.links, [eventLinkKey(linkingEvent)]: itemId } }); setModal(null); await refresh(); }); }) : null}
          {linkingEvent?.lifeItemId ? button('Remove goal link', () => { void perform(async () => { await persist({ ...prefsRef.current, links: { ...prefsRef.current.links, [eventLinkKey(linkingEvent)]: '' } }); setModal(null); await refresh(); }); }) : null}
        </> : <>
          <Text style={muted}>Choose something from your lists. Your reasons stay private.</Text>
          {!lifeItems.length ? <Text style={text}>Add your first goal, learning item, interest, trip or Fucket List item on Home, then come back to plan time for it.</Text> : null}
          <View style={s.wrap}>{lifeItems.filter(i => i.progress < 100).map(item => button(item.title, () => selectItem(item.id), itemId === item.id))}</View>
          {itemId ? <>
            <Text style={text}>Weekly aim · minutes</Text><TextInput accessibilityLabel="Weekly aim in minutes" value={target} onChangeText={setTarget} keyboardType="number-pad" style={[s.input, text, { borderColor: colors.line }]} />
            <Text style={text}>Why this matters to me</Text><TextInput accessibilityLabel="Why this matters to me" multiline value={why} onChangeText={setWhy} placeholder="What will this make possible?" placeholderTextColor={colors.textSecondary} style={[s.input, text, { borderColor: colors.line }]} />
            <Text style={text}>If I keep putting it off… · optional</Text><TextInput accessibilityLabel="If I keep putting it off" multiline value={cost} onChangeText={setCost} placeholder="In your own words, what might get harder?" placeholderTextColor={colors.textSecondary} style={[s.input, text, { borderColor: colors.line }]} />
            {button('Save weekly aim', () => { void perform(async () => { await saveIntention(); setModal(null); }); })}
            <Text style={[titleStyle, { marginTop: 12 }]}>Plan or log time</Text><Text style={text}>{day.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text><View style={s.row}>{button('Previous day', () => setDay(addDays(day, -1)))}{button('Next day', () => setDay(addDays(day, 1)))}</View>
            <Text style={text}>Start time · 24-hour clock</Text><TextInput accessibilityLabel="Block start time" value={time} onChangeText={setTime} placeholder="18:00" placeholderTextColor={colors.textSecondary} style={[s.input, text, { borderColor: colors.line }]} />
            <Text style={text}>Duration · minutes</Text><TextInput accessibilityLabel="Block duration in minutes" value={duration} onChangeText={setDuration} keyboardType="number-pad" style={[s.input, text, { borderColor: colors.line }]} /><View style={s.wrap}>{[15, 30, 60, 90].map(minutes => button(`${minutes} min`, () => setDuration(String(minutes)), duration === String(minutes)))}</View>
            <Text style={muted}>Calendar: {calendars.find(c => c.id === preferences.writeCalendarId)?.title || 'Choose a calendar first'}. Includes a reminder 10 minutes before. The title and time are visible to anyone who can see that calendar.</Text>
            {button('Log time I spent', () => { void perform(async () => { const dates = blockDates(day, time, Number(duration)); if (+dates.end > Date.now()) throw new Error('Only log time you have already spent. Choose a past time or create a future block instead.'); await saveIntention(); await persist({ ...prefsRef.current, confirmations: { ...prefsRef.current.confirmations, [`manual:${randomUUID()}`]: { lifeItemId: itemId, start: dates.start.toISOString(), end: dates.end.toISOString() } } }); setModal(null); }); })}
            {preferences.writeCalendarId ? button(busy ? 'Saving…' : 'Create time block', () => { void perform(createBlock); }, true) : button('Choose calendar', () => setModal('connect'))}
          </> : null}
        </>}
      </ScrollView></SafeAreaView>
    </Modal>
  </View>;
}
const s = StyleSheet.create({ card: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 14 }, row: { flexDirection: 'row', alignItems: 'center', gap: 8 }, flex: { flex: 1 }, center: { textAlign: 'center' }, button: { paddingHorizontal: 12, paddingVertical: 12, minHeight: 44, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, day: { flex: 1, minHeight: 68, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 3 }, event: { borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 6, gap: 8 }, review: { gap: 12, paddingVertical: 8 }, modal: { padding: 20, gap: 16, paddingBottom: 70 }, input: { borderWidth: 1, borderRadius: 12, padding: 14, minHeight: 48 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } });
