import Constants from 'expo-constants';
import { SymbolView } from 'expo-symbols';
import { type ComponentProps, type ReactNode, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { Fonts, type AppColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isAiConfigured } from '@/services/ai';
import { githubPublishingConfigured, verifyGithubPublishingAccess } from '@/services/github-publishing';
import { retryPendingPublications } from '@/services/publication-outbox';
import { applyDownloadedUpdate, checkForRemoteUpdate, remoteUpdatesEnabled } from '@/services/remote-updates';
import { removePublishingToken, savePublishingToken } from '@/storage/publishing-credentials';
import { useApp } from '@/state/app-context';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

function SectionLabel({ children }: { children: ReactNode }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function SettingsGroup({ children }: { children: ReactNode }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={styles.group}>{children}</View>;
}

function SettingsIcon({ name, tone = 'default' }: { name: SymbolName; tone?: 'default' | 'success' | 'danger' }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const tintColor = tone === 'success' ? colors.success : tone === 'danger' ? colors.danger : colors.accent;
  return (
    <View style={[styles.rowIcon, tone === 'success' && styles.rowIconSuccess, tone === 'danger' && styles.rowIconDanger]}>
      <SymbolView name={name} size={18} tintColor={tintColor} />
    </View>
  );
}

function Status({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <Text style={[styles.status, tone === 'success' && styles.statusSuccess, tone === 'warning' && styles.statusWarning]}>{children}</Text>;
}

function SettingsRow({ icon, iconTone, title, detail, trailing, onPress, last = false }: {
  icon: SymbolName;
  iconTone?: 'default' | 'success' | 'danger';
  title: string;
  detail?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const content = (
    <>
      <SettingsIcon name={icon} tone={iconTone} />
      <View style={[styles.rowBody, last && styles.rowBodyLast]}>
        <View style={styles.rowCopy}>
          <Text style={styles.rowTitle}>{title}</Text>
          {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
        </View>
        {trailing ? <View style={styles.rowTrailing}>{trailing}</View> : null}
        {onPress ? <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right' }} size={16} tintColor={colors.textSecondary} /> : null}
      </View>
    </>
  );
  if (onPress) {
    return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>{content}</Pressable>;
  }
  return <View style={styles.row}>{content}</View>;
}

export default function SettingsScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { lock, screenshotsAllowed, setScreenshotsAllowed, developerAccessEnabled, setDeveloperAccessEnabled } = useApp();
  const [token, setToken] = useState('');
  const [connected, setConnected] = useState(false);
  const [publishingExpanded, setPublishingExpanded] = useState(false);
  const [securityExpanded, setSecurityExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkingForUpdate, setCheckingForUpdate] = useState(false);
  const [changingScreenshotSetting, setChangingScreenshotSetting] = useState(false);
  const [changingDeveloperAccess, setChangingDeveloperAccess] = useState(false);

  useEffect(() => { void githubPublishingConfigured().then(setConnected); }, []);

  const connect = async () => {
    setSaving(true);
    try {
      await savePublishingToken(token);
      await verifyGithubPublishingAccess();
      setToken('');
      setConnected(true);
      setPublishingExpanded(false);
      const jobs = await retryPendingPublications();
      const failed = jobs.filter((job) => job.status === 'failed').length;
      Alert.alert('Website connected', failed
        ? `JGOLD is connected. ${failed} approved ${failed === 1 ? 'change still needs' : 'changes still need'} attention in Studio.`
        : 'JGOLD is connected and any queued approved changes have been processed.');
    } catch (cause) {
      await removePublishingToken();
      setConnected(false);
      Alert.alert('Connection failed', cause instanceof Error ? cause.message : 'Check the token and try again.');
    } finally {
      setSaving(false);
    }
  };

  const disconnect = () => Alert.alert('Disconnect website publishing?', 'This removes the GitHub token from this phone. Your website and drafts are unchanged.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Disconnect', style: 'destructive', onPress: async () => { await removePublishingToken(); setConnected(false); setPublishingExpanded(false); } },
  ]);

  const checkForUpdate = async () => {
    setCheckingForUpdate(true);
    try {
      const result = await checkForRemoteUpdate();
      if (result === 'disabled') Alert.alert('Updates unavailable', 'Remote updates work in the installed release build.');
      else if (result === 'current') Alert.alert('App is up to date', 'This phone already has the newest compatible app update.');
      else Alert.alert('Update ready', 'The update has downloaded. Restart now to apply it?', [
        { text: 'Later', style: 'cancel' },
        { text: 'Restart now', onPress: () => { void applyDownloadedUpdate(); } },
      ]);
    } catch {
      Alert.alert('Could not check for updates', 'Check the internet connection and try again.');
    } finally {
      setCheckingForUpdate(false);
    }
  };

  const changeScreenshotSetting = async (allowed: boolean) => {
    setChangingScreenshotSetting(true);
    try {
      await setScreenshotsAllowed(allowed);
    } catch {
      Alert.alert('Could not change screenshot protection', 'Please try again. Screenshot protection remains in its previous state.');
    } finally {
      setChangingScreenshotSetting(false);
    }
  };

  const toggleScreenshots = (allowed: boolean) => {
    if (!allowed) {
      void changeScreenshotSetting(false);
      return;
    }
    Alert.alert('Allow screenshots?', 'Screenshot images can include private vault, finance, photo, and AI information shown on screen. Only enable this when you intend to capture something.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Allow screenshots', onPress: () => { void changeScreenshotSetting(true); } },
    ]);
  };

  const changeDeveloperAccess = async (enabled: boolean) => {
    setChangingDeveloperAccess(true);
    try {
      await setDeveloperAccessEnabled(enabled);
    } catch {
      Alert.alert('Could not change Developer Access', 'Please try again. Authentication protection remains in its previous state.');
    } finally {
      setChangingDeveloperAccess(false);
    }
  };

  const toggleDeveloperAccess = (enabled: boolean) => {
    if (!enabled) {
      void changeDeveloperAccess(false);
      return;
    }
    Alert.alert('Enable Developer Access?', 'Anyone holding this unlocked phone will be able to open JGOLD without your fingerprint. Private data still stays on the device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Enable', onPress: () => { void changeDeveloperAccess(true); } },
    ]);
  };

  const appVersion = Constants.expoConfig?.version ?? '1.5.0';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.profileCard}>
          <Image source={require('../../assets/images/jgold-icon.png')} style={styles.appIcon} />
          <View style={styles.profileCopy}>
            <Text style={styles.profileTitle}>JGOLD</Text>
            <Text style={styles.profileDetail}>Personal workspace</Text>
          </View>
          <Text style={styles.versionBadge}>v{appVersion}</Text>
        </View>

        <View style={styles.section}>
          <SectionLabel>Website</SectionLabel>
          <SettingsGroup>
            <SettingsRow icon={{ ios: 'globe', android: 'language' }} title="Website content" detail="jevangoldsmith.com" trailing={<Status tone="success">Connected</Status>} />
            <SettingsRow
              icon={{ ios: 'arrow.up.doc.fill', android: 'upload_file' }}
              title="Publishing inbox"
              detail={connected ? 'Approved changes publish securely' : 'Connect GitHub to publish approved changes'}
              trailing={<Status tone={connected ? 'success' : 'warning'}>{connected ? 'Connected' : 'Not connected'}</Status>}
              onPress={() => setPublishingExpanded((value) => !value)}
              last={!publishingExpanded}
            />
            {publishingExpanded ? (
              <View style={styles.expandedPanel}>
                {connected ? (
                  <>
                    <Text style={styles.panelTitle}>Publishing is connected</Text>
                    <Text style={styles.panelCopy}>Approved public changes can move from Studio to your isolated publishing inbox.</Text>
                    <Button label="Disconnect publishing" variant="danger" onPress={disconnect} />
                  </>
                ) : (
                  <>
                    <Text style={styles.panelTitle}>Connect publishing</Text>
                    <Text style={styles.inputLabel}>Fine-grained GitHub token</Text>
                    <TextInput value={token} onChangeText={setToken} autoCapitalize="none" autoCorrect={false} secureTextEntry placeholder="github_pat_…" placeholderTextColor={colors.textSecondary} style={styles.input} />
                    <Button label="Create restricted token" variant="secondary" onPress={() => Linking.openURL('https://github.com/settings/personal-access-tokens/new?name=JGOLD%20Publishing%20Inbox&description=Samsung%20JGOLD%20approved%20public%20manifests%20only&target_name=JGOLD43&expires_in=90&contents=write')} />
                    <Button label="Connect and verify" onPress={connect} busy={saving} disabled={!token.trim() || saving} />
                    <Text style={styles.panelFootnote}>Restrict the token to JGOLD43/jgold-publishing-inbox with Contents read/write access. It cannot modify your website code.</Text>
                  </>
                )}
              </View>
            ) : null}
          </SettingsGroup>
        </View>

        <View style={styles.section}>
          <SectionLabel>Privacy & security</SectionLabel>
          <SettingsGroup>
            <SettingsRow
              icon={{ ios: 'camera.viewfinder', android: 'screenshot' }}
              title="Allow screenshots"
              detail={screenshotsAllowed ? 'Screenshots are currently allowed' : 'Screenshots are blocked'}
              trailing={<Switch value={screenshotsAllowed} onValueChange={toggleScreenshots} disabled={changingScreenshotSetting} trackColor={{ false: colors.line, true: colors.success }} thumbColor={colors.backgroundElement} accessibilityLabel="Allow screenshots" accessibilityHint="Allows screenshots while JGOLD is visible" />}
            />
            <SettingsRow icon={{ ios: 'lock.fill', android: 'lock' }} title="Lock JGOLD now" detail="Require authentication to reopen" onPress={lock} />
            <SettingsRow
              icon={{ ios: 'checkmark.shield.fill', android: 'verified_user' }}
              iconTone="success"
              title="Device protection"
              detail="Encryption, backups and private data"
              trailing={<Status tone="success">Protected</Status>}
              onPress={() => setSecurityExpanded((value) => !value)}
              last={!securityExpanded}
            />
            {securityExpanded ? (
              <View style={styles.securityDetails}>
                <View style={styles.securityLine}><Text style={styles.securityLabel}>Vault database</Text><Text style={styles.securityValue}>Encrypted locally</Text></View>
                <View style={styles.securityLine}><Text style={styles.securityLabel}>Vault key</Text><Text style={styles.securityValue}>Android Keystore</Text></View>
                <View style={styles.securityLine}><Text style={styles.securityLabel}>Private attachments</Text><Text style={styles.securityValue}>AES-GCM encrypted</Text></View>
                <View style={styles.securityLine}><Text style={styles.securityLabel}>Samsung backup</Text><Text style={styles.securityValue}>Excluded</Text></View>
                <View style={styles.securityLine}><Text style={styles.securityLabel}>App switcher preview</Text><Text style={styles.securityValue}>Always protected</Text></View>
                <View style={styles.securityLine}><Text style={styles.securityLabel}>Private data cloud sync</Text><Text style={styles.securityValue}>Off</Text></View>
                <View style={[styles.securityLine, styles.securityLineLast]}><Text style={styles.securityLabel}>Approved public publishing</Text><Text style={styles.securityValue}>{connected ? 'Automatic' : 'Not connected'}</Text></View>
              </View>
            ) : null}
          </SettingsGroup>
          <Text style={styles.sectionFooter}>Private records remain encrypted on this phone and never enter the publishing workflow.</Text>
        </View>

        <View style={styles.section}>
          <SectionLabel>Services</SectionLabel>
          <SettingsGroup>
            <SettingsRow icon={{ ios: 'sparkles', android: 'auto_awesome' }} title="AI gateway" detail="Receives chat and selected public drafts only" trailing={<Status tone={isAiConfigured() ? 'success' : 'warning'}>{isAiConfigured() ? 'Connected' : 'Not set'}</Status>} />
            <SettingsRow
              icon={{ ios: 'arrow.triangle.2.circlepath', android: 'system_update' }}
              title="Software Update"
              detail={remoteUpdatesEnabled() ? 'Compatible updates install automatically' : 'Updates require a signed build'}
              trailing={checkingForUpdate ? <ActivityIndicator color={colors.accent} /> : <Status>{remoteUpdatesEnabled() ? 'Automatic' : 'Build only'}</Status>}
              onPress={() => { if (!checkingForUpdate) void checkForUpdate(); }}
              last
            />
          </SettingsGroup>
          <Text style={styles.sectionFooter}>Compatible updates arrive automatically without a cable. The updater never reads or uploads private vault data.</Text>
        </View>

        {__DEV__ ? <View style={styles.section}>
          <SectionLabel>Developer Access</SectionLabel>
          <SettingsGroup>
            <SettingsRow
              icon={{ ios: 'hammer.fill', android: 'developer_mode' }}
              iconTone={developerAccessEnabled ? 'danger' : 'default'}
              title="Skip fingerprint while developing"
              detail={developerAccessEnabled ? 'Authentication protection is bypassed' : 'Fingerprint protection remains active'}
              trailing={<Switch value={developerAccessEnabled} onValueChange={toggleDeveloperAccess} disabled={changingDeveloperAccess} trackColor={{ false: colors.line, true: colors.danger }} thumbColor={colors.backgroundElement} accessibilityLabel="Developer Access" accessibilityHint="Skips fingerprint authentication while enabled" />}
              last
            />
          </SettingsGroup>
          <Text style={styles.sectionFooter}>Keep this off unless the app is connected for development or design checks.</Text>
        </View> : null}

        <View style={styles.section}>
          <SectionLabel>About</SectionLabel>
          <SettingsGroup>
            <SettingsRow icon={{ ios: 'info.circle.fill', android: 'info' }} title="Version" trailing={<Status>{appVersion}</Status>} />
            <SettingsRow icon={{ ios: 'safari.fill', android: 'open_in_browser' }} title="Jevan Goldsmith website" onPress={() => { void Linking.openURL('https://jevangoldsmith.com'); }} last />
          </SettingsGroup>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 140, gap: 26 },
    title: { color: colors.text, fontFamily: Fonts.bold, fontSize: 34, lineHeight: 41, letterSpacing: -0.5 },
    profileCard: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 13, borderRadius: 16, borderCurve: 'continuous', backgroundColor: colors.backgroundElement },
    appIcon: { width: 56, height: 56, borderRadius: 13 },
    profileCopy: { flex: 1, gap: 2 },
    profileTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 18 },
    profileDetail: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 13 },
    versionBadge: { color: colors.textSecondary, fontFamily: Fonts.semibold, fontSize: 12, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.backgroundSelected },
    section: { gap: 8 },
    sectionLabel: { color: colors.textSecondary, fontFamily: Fonts.semibold, fontSize: 13, lineHeight: 18, marginLeft: 15 },
    group: { overflow: 'hidden', borderRadius: 14, borderCurve: 'continuous', backgroundColor: colors.backgroundElement },
    row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingLeft: 14 },
    rowPressed: { backgroundColor: colors.backgroundSelected },
    rowIcon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 7, borderCurve: 'continuous', backgroundColor: colors.accentSoft },
    rowIconSuccess: { backgroundColor: colors.backgroundSelected },
    rowIconDanger: { backgroundColor: colors.dangerSoft },
    rowBody: { flex: 1, minWidth: 0, minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 9, marginLeft: 12, paddingRight: 13, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
    rowBodyLast: { borderBottomWidth: 0 },
    rowCopy: { flex: 1, minWidth: 0, gap: 2 },
    rowTitle: { color: colors.text, fontFamily: Fonts.medium, fontSize: 16, lineHeight: 20 },
    rowDetail: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 17 },
    rowTrailing: { flexShrink: 1, alignItems: 'flex-end' },
    status: { color: colors.textSecondary, fontFamily: Fonts.semibold, fontSize: 12 },
    statusSuccess: { color: colors.success },
    statusWarning: { color: colors.accent },
    expandedPanel: { gap: 10, paddingHorizontal: 16, paddingTop: 15, paddingBottom: 17, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.backgroundElement },
    panelTitle: { color: colors.text, fontFamily: Fonts.bold, fontSize: 17 },
    panelCopy: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20 },
    inputLabel: { color: colors.text, fontFamily: Fonts.semibold, fontSize: 13, marginTop: 2 },
    input: { minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: 10, borderCurve: 'continuous', backgroundColor: colors.backgroundSelected, color: colors.text, paddingHorizontal: 13, fontFamily: Fonts.sans, fontSize: 15 },
    panelFootnote: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18 },
    securityDetails: { paddingLeft: 56, paddingRight: 14, paddingBottom: 8, backgroundColor: colors.backgroundElement },
    securityLine: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
    securityLineLast: { borderBottomWidth: 0 },
    securityLabel: { flex: 1, color: colors.text, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18 },
    securityValue: { flexShrink: 1, color: colors.textSecondary, fontFamily: Fonts.semibold, fontSize: 12, textAlign: 'right' },
    sectionFooter: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18, marginHorizontal: 15 },
  });
}
