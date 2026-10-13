import { flushPendingSaves } from "@/services/save-queue";
import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { Button } from "@/components/ui";
import { useTheme } from "@/hooks/use-theme";
import {
  listDeviceSyncBackups,
  previewDeviceSyncBackup,
  restoreDeviceSyncBackup,
  deleteDeviceSyncBackup,
  type SnapshotSummary,
} from "@/services/device-sync";

export function snapshotDescription(value: SnapshotSummary) {
  return `${value.books} books · ${value.writing} documents · ${value.people} people · ${value.cards} cards · ${value.plans} plans`;
}
export function SyncRecovery({ connected }: { connected: boolean }) {
  const colors = useTheme();
  const [rows, setRows] = useState<Awaited<
    ReturnType<typeof listDeviceSyncBackups>
  > | null>(null);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ id: string; text: string } | null>(
    null,
  );
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Recovery is unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }
  const refresh = async () => setRows(await listDeviceSyncBackups());
  return (
    <View
      style={{
        gap: 12,
        borderTopWidth: 1,
        borderColor: colors.line,
        paddingTop: 16,
      }}
    >
      <Button
        label={rows ? "Refresh recovery points" : "Review recovery points"}
        variant="secondary"
        disabled={busy}
        onPress={() => void act(refresh)}
      />
      {rows ? (
        <>
          <Text style={{ color: colors.textSecondary }}>
            The latest ten snapshots stay in the database; older ones are kept
            as separate encrypted files. Nothing is removed automatically.
            Restoring first saves your current workspace as another recovery
            point.
          </Text>
          {!rows.length ? (
            <Text style={{ color: colors.textSecondary }}>
              No recovery points yet. One is created before incoming sync
              changes replace local records.
            </Text>
          ) : null}
          {rows.map((row) => (
            <View key={row.id} style={{ gap: 8 }}>
              <Text style={{ color: colors.text }}>
                {new Date(row.created_at).toLocaleString()} · {row.reason}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Button
                  label="Preview"
                  variant="secondary"
                  disabled={busy}
                  onPress={() =>
                    void act(async () =>
                      setPreview({
                        id: row.id,
                        text: snapshotDescription(
                          await previewDeviceSyncBackup(row.id),
                        ),
                      }),
                    )
                  }
                />
                <Button
                  label="Remove recovery point"
                  variant="secondary"
                  disabled={busy}
                  onPress={() =>
                    Alert.alert(
                      "Remove this recovery point?",
                      "This deletes only this saved snapshot. It cannot be undone. Your current workspace stays as it is.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Remove",
                          style: "destructive",
                          onPress: () =>
                            void act(async () => {
                              await deleteDeviceSyncBackup(row.id);
                              setPreview(null);
                              await refresh();
                            }),
                        },
                      ],
                    )
                  }
                />
              </View>
            </View>
          ))}
        </>
      ) : null}
      {preview ? (
        <View
          style={{ gap: 12, padding: 16, backgroundColor: colors.background }}
        >
          <Text style={{ color: colors.text }}>{preview.text}</Text>
          <Text style={{ color: colors.textSecondary }}>
            {connected
              ? "Disconnect this device above before restoring. The phone will remain unchanged."
              : "Restoration replaces this device’s records. Book files that were unloaded may need downloading again. Review the restored data before setting up sync again."}
          </Text>
          <Button
            label="Restore this recovery point"
            disabled={connected || busy}
            onPress={() =>
              Alert.alert(
                "Restore this workspace?",
                preview.text +
                  "\nYour current workspace will be saved first. Sync will remain disconnected.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Restore",
                    onPress: () =>
                      void act(async () => {
                        await flushPendingSaves();
                        await restoreDeviceSyncBackup(preview.id);
                        setPreview(null);
                        await refresh();
                      }),
                  },
                ],
              )
            }
          />
        </View>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
