import { useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Chip } from '@/components/ui';
import { Fonts, type AppColors } from '@/constants/theme';
import type { DraftType, NewPublicDraft, NewVaultItem, NowLocation, VaultKind } from '@/domain/models';
import { useTheme } from '@/hooks/use-theme';
import { capturePrivatePhoto, importPrivatePhoto } from '@/storage/attachments';

function useStyles() {
  const colors = useTheme();
  return { colors, styles: useMemo(() => createStyles(colors), [colors]) };
}

function mapTileUrl(location: NowLocation | null): string | null {
  if (!location) return null;
  const { lat, lng, zoom } = location;
  const x = Math.floor(((lng + 180) / 360) * 2 ** zoom);
  const y = Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** zoom);
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}`;
}

function ComposerShell({
  visible,
  title,
  onDismiss,
  children,
}: {
  visible: boolean;
  title: string;
  onDismiss: () => void;
  children: React.ReactNode;
}) {
  const { styles } = useStyles();
  return (
    <Modal animationType="slide" presentationStyle="pageSheet" visible={visible} onRequestClose={onDismiss}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable accessibilityRole="button" onPress={onDismiss} hitSlop={12}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

export function VaultComposer({
  visible,
  onDismiss,
  onSave,
}: {
  visible: boolean;
  onDismiss: () => void;
  onSave: (input: NewVaultItem) => Promise<void>;
}) {
  const { colors, styles } = useStyles();
  const [kind, setKind] = useState<VaultKind>('note');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [amount, setAmount] = useState('');
  const [attachmentUri, setAttachmentUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setKind('note');
    setTitle('');
    setBody('');
    setAmount('');
    setAttachmentUri(null);
  };

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onSave({
      kind,
      title,
      body,
      amount: kind === 'finance' && amount ? Number(amount) : null,
      attachmentUri,
    });
    setSaving(false);
    reset();
    onDismiss();
  };

  const choosePhoto = async (source: 'camera' | 'library') => {
    try {
      const uri = source === 'camera' ? await capturePrivatePhoto() : await importPrivatePhoto();
      if (uri) {
        setAttachmentUri(uri);
        setKind('photo');
        if (!title) setTitle('Private photo');
      }
    } catch (cause) {
      Alert.alert('Could not add photo', cause instanceof Error ? cause.message : 'Please try again.');
    }
  };

  return (
    <ComposerShell visible={visible} title="Add to vault" onDismiss={onDismiss}>
      <Text style={styles.label}>Kind</Text>
      <View style={styles.chips}>
        <Chip label="Note" selected={kind === 'note'} onPress={() => setKind('note')} />
        <Chip label="Finance" selected={kind === 'finance'} onPress={() => setKind('finance')} />
        <Chip label="Photo" selected={kind === 'photo'} onPress={() => setKind('photo')} />
      </View>
      <Text style={styles.label}>Title</Text>
      <TextInput
        accessibilityLabel="Vault item title"
        value={title}
        onChangeText={setTitle}
        placeholder="What do you want to remember?"
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
      />
      {kind === 'finance' ? (
        <>
          <Text style={styles.label}>Amount</Text>
          <TextInput
            accessibilityLabel="Amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
          />
        </>
      ) : null}
      {kind === 'photo' ? (
        <View style={styles.photoActions}>
          <Button label="Take private photo" variant="quiet" onPress={() => choosePhoto('camera')} style={styles.flexButton} />
          <Button label="Import copy" variant="secondary" onPress={() => choosePhoto('library')} style={styles.flexButton} />
        </View>
      ) : null}
      {attachmentUri ? <Text style={styles.success}>Encrypted photo ready</Text> : null}
      <Text style={styles.label}>{kind === 'finance' ? 'Notes' : 'Details'}</Text>
      <TextInput
        accessibilityLabel="Vault item details"
        value={body}
        onChangeText={setBody}
        placeholder="Add anything useful…"
        placeholderTextColor={colors.textSecondary}
        multiline
        textAlignVertical="top"
        style={[styles.input, styles.textArea]}
      />
      <Button label="Save privately" onPress={save} busy={saving} disabled={!title.trim() || saving} />
      <Text style={styles.helper}>This item is stored in the encrypted vault on this phone.</Text>
    </ComposerShell>
  );
}

export function DraftComposer({
  visible,
  onDismiss,
  onSave,
  initial,
  lockedType = false,
}: {
  visible: boolean;
  onDismiss: () => void;
  onSave: (input: NewPublicDraft) => Promise<void>;
  initial?: NewPublicDraft | null;
  lockedType?: boolean;
}) {
  const { colors, styles } = useStyles();
  const [type, setType] = useState<DraftType>(initial?.type ?? 'essay');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [summary, setSummary] = useState(initial?.summary ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [locationLabel, setLocationLabel] = useState(initial?.nowLocation?.label ?? '');
  const [latitude, setLatitude] = useState(initial?.nowLocation ? String(initial.nowLocation.lat) : '');
  const [longitude, setLongitude] = useState(initial?.nowLocation ? String(initial.nowLocation.lng) : '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setType(initial?.type ?? 'essay');
    setTitle(initial?.title ?? '');
    setSummary(initial?.summary ?? '');
    setBody(initial?.body ?? '');
    setLocationLabel(initial?.nowLocation?.label ?? '');
    setLatitude(initial?.nowLocation ? String(initial.nowLocation.lat) : '');
    setLongitude(initial?.nowLocation ? String(initial.nowLocation.lng) : '');
  }, [initial, visible]);

  const nowLocation = useMemo<NowLocation | null>(() => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!locationLabel.trim() || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { label: locationLabel.trim(), lat, lng, zoom: 10 };
  }, [latitude, locationLabel, longitude]);
  const previewUrl = useMemo(() => mapTileUrl(nowLocation), [nowLocation]);
  const isNow = type === 'now';
  const canSave = title.trim().length > 0 && (!isNow || (body.trim().length > 0 && nowLocation !== null));

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onSave({
      type,
      title,
      summary,
      body,
      sourceId: initial?.sourceId ?? null,
      operation: initial?.operation ?? 'create',
      nowLocation: isNow ? nowLocation : null,
    });
    setSaving(false);
    setTitle('');
    setSummary('');
    setBody('');
    onDismiss();
  };

  return (
    <ComposerShell visible={visible} title={isNow ? 'New Now update' : initial?.operation === 'update' ? 'Edit website item' : 'New website draft'} onDismiss={onDismiss}>
      {isNow ? (
        <View style={styles.nowIntro}>
          <View style={styles.nowIntroIcon}><SymbolView name={{ ios: 'clock.fill', android: 'schedule' }} size={19} tintColor={colors.action} /></View>
          <View style={styles.nowIntroCopy}>
            <Text style={styles.nowIntroTitle}>A snapshot of right now</Text>
            <Text style={styles.nowIntroBody}>Publishing replaces the current update, moves the website map, and keeps the previous one in your map history.</Text>
          </View>
        </View>
      ) : null}
      <Text style={styles.label}>Content type</Text>
      {lockedType ? (
        <View style={styles.lockedType}>
          <Text style={styles.lockedTypeText}>{type}</Text>
          <Text style={styles.lockedTypeHint}>Selected in Studio</Text>
        </View>
      ) : (
        <View style={styles.chips}>
          <Chip label="Essay" selected={type === 'essay'} onPress={() => setType('essay')} />
          <Chip label="Adventure" selected={type === 'adventure'} onPress={() => setType('adventure')} />
          <Chip label="Project" selected={type === 'project'} onPress={() => setType('project')} />
          <Chip label="Challenge" selected={type === 'challenge'} onPress={() => setType('challenge')} />
          <Chip label="Product" selected={type === 'product'} onPress={() => setType('product')} />
          <Chip label="Quote" selected={type === 'quote'} onPress={() => setType('quote')} />
          <Chip label="Now" selected={type === 'now'} onPress={() => setType('now')} />
        </View>
      )}
      <Text style={styles.label}>{isNow ? 'Update heading' : 'Title'}</Text>
      <TextInput value={title} onChangeText={setTitle} placeholder={isNow ? 'What are you focused on?' : 'Public title'} placeholderTextColor={colors.textSecondary} style={styles.input} />
      {!isNow ? (
        <>
          <Text style={styles.label}>Summary</Text>
          <TextInput value={summary} onChangeText={setSummary} placeholder="A short public introduction" placeholderTextColor={colors.textSecondary} style={styles.input} />
        </>
      ) : null}
      <Text style={styles.label}>{isNow ? 'What is happening' : 'Draft'}</Text>
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder={isNow ? 'Write a clear snapshot of what you are doing, thinking about, or working toward…' : 'Write the public version here…'}
        placeholderTextColor={colors.textSecondary}
        multiline
        textAlignVertical="top"
        style={[styles.input, isNow ? styles.nowTextArea : styles.largeTextArea]}
      />
      {isNow ? (
        <View style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <View>
              <Text style={styles.locationTitle}>Pin this update</Text>
              <Text style={styles.locationHint}>This becomes the latest location on your website.</Text>
            </View>
            <SymbolView name={{ ios: 'location.fill', android: 'location_on' }} size={22} tintColor={colors.accent} />
          </View>
          <TextInput accessibilityLabel="Now update place" value={locationLabel} onChangeText={setLocationLabel} placeholder="Place name — e.g. Ayr, QLD" placeholderTextColor={colors.textSecondary} style={styles.input} />
          <View style={styles.coordinateRow}>
            <TextInput accessibilityLabel="Latitude" value={latitude} onChangeText={setLatitude} keyboardType="numbers-and-punctuation" placeholder="Latitude" placeholderTextColor={colors.textSecondary} style={[styles.input, styles.coordinateInput]} />
            <TextInput accessibilityLabel="Longitude" value={longitude} onChangeText={setLongitude} keyboardType="numbers-and-punctuation" placeholder="Longitude" placeholderTextColor={colors.textSecondary} style={[styles.input, styles.coordinateInput]} />
          </View>
          {previewUrl ? (
            <View style={styles.mapPreview}>
              <Image source={previewUrl} contentFit="cover" style={styles.mapPreviewImage} transition={120} />
              <View style={styles.mapShade} />
              <View style={styles.mapPin}><View style={styles.mapPinCore} /></View>
              <Text style={styles.mapLabel}>{nowLocation?.label}</Text>
            </View>
          ) : (
            <Text style={styles.coordinateHelp}>Add a place and valid latitude/longitude to preview the map.</Text>
          )}
        </View>
      ) : null}
      <Button label={isNow ? 'Save Now draft' : initial?.operation === 'update' ? 'Save editable copy' : 'Save public draft'} onPress={save} busy={saving} disabled={!canSave || saving} />
      <Text style={styles.helper}>{isNow ? 'The date is added automatically when you publish. Saving still does not publish it.' : 'Saving a draft does not publish it.'}</Text>
    </ComposerShell>
  );
}

function createStyles(color: AppColors) {
  return StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: color.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: color.line },
  modalTitle: { color: color.text, fontFamily: Fonts.bold, fontSize: 25 },
  close: { color: color.accent, fontFamily: Fonts.bold, fontSize: 15 },
  form: { padding: 20, paddingBottom: 60, gap: 12 },
  label: { color: color.text, fontFamily: Fonts.bold, fontSize: 13, marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  lockedType: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, borderWidth: 1, borderColor: color.line, borderRadius: 8, backgroundColor: color.backgroundElement },
  lockedTypeText: { color: color.text, fontFamily: Fonts.bold, fontSize: 15, textTransform: 'capitalize' },
  lockedTypeHint: { color: color.textSecondary, fontFamily: Fonts.sans, fontSize: 11 },
  input: { backgroundColor: color.backgroundElement, borderWidth: 1, borderColor: color.line, color: color.text, borderRadius: 8, minHeight: 50, paddingHorizontal: 15, paddingVertical: 13, fontFamily: Fonts.sans, fontSize: 16 },
  textArea: { minHeight: 130 },
  largeTextArea: { minHeight: 220 },
  nowTextArea: { minHeight: 170 },
  nowIntro: { flexDirection: 'row', gap: 12, padding: 15, borderRadius: 12, backgroundColor: color.accentSoft, marginBottom: 4 },
  nowIntroIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: color.backgroundElement },
  nowIntroCopy: { flex: 1, gap: 3 },
  nowIntroTitle: { color: color.text, fontFamily: Fonts.bold, fontSize: 15 },
  nowIntroBody: { color: color.textSecondary, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 },
  locationCard: { gap: 10, padding: 14, borderWidth: 1, borderColor: color.line, borderRadius: 12, backgroundColor: color.backgroundElement, marginVertical: 4 },
  locationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  locationTitle: { color: color.text, fontFamily: Fonts.bold, fontSize: 16 },
  locationHint: { color: color.textSecondary, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18, marginTop: 2 },
  coordinateRow: { flexDirection: 'row', gap: 10 },
  coordinateInput: { flex: 1 },
  coordinateHelp: { color: color.textSecondary, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18 },
  mapPreview: { height: 132, overflow: 'hidden', borderRadius: 9, backgroundColor: color.backgroundSelected },
  mapPreviewImage: { position: 'absolute', inset: 0 },
  mapShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(10, 18, 24, 0.16)' },
  mapPin: { position: 'absolute', left: '50%', top: '50%', width: 22, height: 22, marginLeft: -11, marginTop: -11, borderRadius: 11, padding: 6, backgroundColor: 'rgba(255, 215, 0, 0.42)' },
  mapPinCore: { flex: 1, borderRadius: 5, backgroundColor: '#FFD700' },
  mapLabel: { position: 'absolute', left: 12, right: 12, bottom: 10, color: '#FFFFFF', fontFamily: Fonts.bold, fontSize: 13, textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  photoActions: { flexDirection: 'row', gap: 9 },
  flexButton: { flex: 1 },
  success: { color: color.success, fontFamily: Fonts.bold, fontSize: 13 },
  helper: { color: color.textSecondary, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
}
