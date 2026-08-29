import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { VaultComposer } from '@/components/composers';
import { Button, Card, Chip, EmptyState, Screen } from '@/components/ui';
import { Fonts, type AppColors } from '@/constants/theme';
import type { VaultKind } from '@/domain/models';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/app-context';

const labels: Record<VaultKind, string> = { note: 'Note', finance: 'Finance', photo: 'Photo' };

export default function VaultScreen() {
  const router = useRouter();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { vaultItems, createVaultItem, deleteVaultItem, createDraftFromVault } = useApp();
  const [composerOpen, setComposerOpen] = useState(false);
  const [filter, setFilter] = useState<VaultKind | 'all'>('all');
  const visibleItems = filter === 'all' ? vaultItems : vaultItems.filter((item) => item.kind === filter);

  return (
    <>
      <Screen
        eyebrow="Encrypted on device"
        title="Private vault"
        intro="Notes, money, memories, and files kept together without becoming website or AI context."
        action={<Button label="Add" onPress={() => setComposerOpen(true)} />}>
        <View style={styles.filters}>
          <Chip label="Everything" selected={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip label="Notes" selected={filter === 'note'} onPress={() => setFilter('note')} />
          <Chip label="Finances" selected={filter === 'finance'} onPress={() => setFilter('finance')} />
          <Chip label="Photos" selected={filter === 'photo'} onPress={() => setFilter('photo')} />
        </View>

        <Card style={styles.booksCard}>
          <View style={styles.itemCopy}>
            <Text style={styles.kind}>Private reading</Text>
            <Text style={styles.title}>Reading Room</Text>
            <Text style={styles.body}>Your encrypted EPUB and PDF library, notes, highlights, and website bookshelf.</Text>
          </View>
          <Button label="Open Books" onPress={() => router.push('/books')} />
        </Card>

        {visibleItems.length ? visibleItems.map((item) => (
          <Card key={item.id}>
            <View style={styles.itemHeader}>
              <View style={styles.itemCopy}>
                <Text style={styles.kind}>{labels[item.kind]}</Text>
                <Text style={styles.title}>{item.title}</Text>
              </View>
              {item.amount !== null ? <Text style={styles.amount}>${item.amount.toFixed(2)}</Text> : null}
            </View>
            {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
            {item.attachmentUri ? <Text style={styles.encrypted}>Encrypted attachment stored locally</Text> : null}
            <View style={styles.actions}>
              {item.kind !== 'finance' ? (
                <Button
                  label="Make public draft"
                  variant="quiet"
                  onPress={async () => {
                    await createDraftFromVault(item);
                    Alert.alert('Public copy created', 'The original remains unchanged in your private vault.');
                  }}
                  style={styles.actionButton}
                />
              ) : null}
              <Button
                label="Delete"
                variant="danger"
                onPress={() => Alert.alert('Delete private item?', 'This cannot be recovered without a backup.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteVaultItem(item.id) },
                ])}
              />
            </View>
          </Card>
        )) : (
          <EmptyState title="Nothing here yet" body="Add a private note, finance entry, or encrypted photo. It remains on this phone." />
        )}
      </Screen>
      <VaultComposer visible={composerOpen} onDismiss={() => setComposerOpen(false)} onSave={createVaultItem} />
    </>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  itemCopy: { flex: 1, gap: 3 },
  kind: { color: colors.accent, fontFamily: Fonts.extraBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { color: colors.text, fontFamily: Fonts.bold, fontSize: 22 },
  amount: { color: colors.success, fontFamily: Fonts.extraBold, fontSize: 19 },
  body: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22 },
  encrypted: { color: colors.success, fontFamily: Fonts.bold, fontSize: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  actionButton: { flex: 1 },
  booksCard: { backgroundColor: colors.accentSoft },
});
}
