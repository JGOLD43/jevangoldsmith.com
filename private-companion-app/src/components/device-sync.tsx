import { flushPendingSaves } from "@/services/save-queue";
import type { ReactNode } from "react";
import { SyncRecovery, snapshotDescription } from "@/components/sync-recovery";
import { readableSyncValue } from "@/domain/readable-sync";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  AppState,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button } from "@/components/ui";
import { useTheme } from "@/hooks/use-theme";
import { Fonts } from "@/constants/theme";
import { type SyncResolutions } from "@/domain/device-sync";
import {
  deviceSyncStatus,
  subscribeDeviceSync,
  loadDeviceSyncStatus,
  previewDeviceSync,
  startDeviceSync,
  joinDeviceSync,
  pairingCode,
  disconnectDeviceSync,
  syncDevices,
  pauseDeviceSync,
} from "@/services/device-sync";

export function AutomaticDeviceSync() {
  useEffect(() => {
    let mounted = true;
    const sync = () => {
      if (mounted && AppState.currentState === "active")
        void flushPendingSaves()
          .then(() => {
            if (mounted && AppState.currentState === "active") return syncDevices();
          })
          .catch(() => {});
    };
    void loadDeviceSyncStatus()
      .then(sync)
      .catch(() => {});
    const interval = setInterval(sync, 60_000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") sync();
      else pauseDeviceSync();
    });
    return () => {
      mounted = false;
      clearInterval(interval);
      subscription.remove();
      pauseDeviceSync();
    };
  }, []);
  return null;
}

export function DeviceSyncPanel({
  connected = false,
  connection,
}: {
  connected?: boolean;
  connection?: ReactNode;
}) {
  const colors = useTheme();
  const status = useSyncExternalStore(
    subscribeDeviceSync,
    deviceSyncStatus,
    deviceSyncStatus,
  );
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<Awaited<
    ReturnType<typeof previewDeviceSync>
  > | null>(null);
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState("");
  const [joining, setJoining] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const [resolutions, setResolutions] = useState<SyncResolutions>({});
  useEffect(() => {
    void loadDeviceSyncStatus().catch(() => {});
  }, []);
  const text = {
    color: colors.textSecondary,
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 21,
  };
  async function act(action: () => Promise<unknown>) {
    setMessage("");
    setBusy(true);
    try {
      await action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <View
      style={{
        backgroundColor: colors.backgroundElement,
        padding: Platform.OS === "web" ? 18 : 22,
        borderRadius: Platform.OS === "web" ? 8 : 20,
        gap: Platform.OS === "web" ? 12 : 14,
        borderColor: colors.line,
        borderWidth: 1,
      }}
    >
      <Text
        style={{ color: colors.text, fontFamily: Fonts.bold, fontSize: 20 }}
      >
        Phone & Mac sync
      </Text>
      <Text style={text}>
        Your food diary, books, highlights, writing, plans, People and learning progress,
        together on both devices. Data is encrypted on each device before it
        enters your private GitHub inbox.
      </Text>
      <Text style={{ ...text, color: colors.accent }}>
        {status.running
          ? status.phase || "Syncing… Keep JGOLD open."
          : status.lastSyncedAt
            ? `Last synced ${new Date(status.lastSyncedAt).toLocaleString()}`
            : status.enabled
              ? "Connected · waiting to sync"
              : "Not connected"}
      </Text>
      {!status.enabled ? (
        <>
          <Text style={text}>
            1. Sign in to your private inbox. 2. Enter the connection code from
            your phone. 3. Review and combine both devices. You can keep
            using JGOLD locally without connecting.
          </Text>
          {!connected ? (
            connection
          ) : (
            <Text style={text}>✓ Signed in with GitHub</Text>
          )}
          {Platform.OS !== "web" ? (
            <Button
              label="Enable encrypted sync on this phone"
              disabled={status.running || busy || !connected}
              onPress={() =>
                void act(async () => {
                  await flushPendingSaves();
                  setRevealed(await startDeviceSync());
                })
              }
            />
          ) : null}
          <Button
            label={
              joining ? "Cancel connection" : "Connect using my phone’s code"
            }
            variant="secondary"
            disabled={!connected || busy}
            onPress={() => {
              setJoining(!joining);
              setConfirmed(false);
              setPreview(null);
            }}
          />
          {joining ? (
            <>
              <TextInput
                accessibilityLabel="Phone connection code"
                value={code}
                onChangeText={(value) => {
                  setCode(value);
                  setPreview(null);
                  setConfirmed(false);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                placeholder="JG1.…"
                placeholderTextColor={colors.textSecondary}
                style={{
                  ...text,
                  color: colors.text,
                  borderColor: colors.line,
                  borderWidth: 1,
                  borderRadius: 10,
                  padding: 12,
                }}
              />
              <Button
                label={
                  busy ? "Reading encrypted preview…" : "Preview phone data"
                }
                disabled={!code.trim() || busy || status.running}
                onPress={() =>
                  void act(async () =>
                    setPreview(await previewDeviceSync(code)),
                  )
                }
              />
              {preview ? (
                <View style={{ gap: 8 }}>
                  <Text style={text}>
                    Phone: {snapshotDescription(preview.incoming)}
                  </Text>
                  <Text style={text}>
                    This device: {snapshotDescription(preview.current)}
                  </Text>
                </View>
              ) : null}
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: confirmed }}
                onPress={() => setConfirmed(!confirmed)}
                style={{
                  flexDirection: "row",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <Text style={{ color: colors.accent, fontSize: 20 }}>
                  {confirmed ? "☑" : "☐"}
                </Text>
                <Text style={{ ...text, flex: 1 }}>
                  Combine both devices. Keep the books, writing and
                  progress from both devices, with a recovery backup before
                  merging. I’ll review any differences that need a choice.
                </Text>
              </Pressable>
              <Button
                label="Connect and combine both devices"
                disabled={
                  !confirmed ||
                  !preview ||
                  !code.trim() ||
                  status.running ||
                  busy
                }
                onPress={() =>
                  void act(async () => {
                    await flushPendingSaves();
                    await joinDeviceSync(code, preview?.snapshot);
                    setMessage(
                      "Connected. Information from both devices has been combined.",
                    );
                    setCode("");
                    setJoining(false);
                    setPreview(null);
                  })
                }
              />
            </>
          ) : null}
        </>
      ) : (
        <>
          <Button
            label={status.running ? "Syncing…" : "Sync now"}
            disabled={status.running || busy || !connected}
            onPress={() => void act(async () => { await flushPendingSaves(); await syncDevices(resolutions); })}
          />
          <Button
            label={revealed ? "Hide connection code" : "Show connection code"}
            variant="secondary"
            disabled={status.running || busy || !connected}
            onPress={() =>
              void act(async () =>
                setRevealed(revealed ? "" : ((await pairingCode()) ?? "")),
              )
            }
          />
          <Text style={text}>
            Sync runs while JGOLD is open and unlocked. You can edit offline;
            changes sync after reconnection. Android calendars, phone contacts
            access and reminders are managed on your phone. Website publishing
            stays a separate action.
          </Text>
          <Button
            label="Disconnect this device"
            variant="secondary"
            disabled={status.running || busy || !connected}
            onPress={() =>
              void act(async () => {
                await disconnectDeviceSync();
                setRevealed("");
              })
            }
          />
        </>
      )}
      <SyncRecovery connected={status.enabled} />
      {revealed ? (
        <View
          style={{
            gap: 8,
            padding: 14,
            borderRadius: 12,
            backgroundColor: colors.background,
          }}
        >
          <Text style={text}>
            This code unlocks your synced data. Copy it only to your other JGOLD
            device and keep it somewhere safe.
          </Text>
          <Text
            selectable
            style={{
              color: colors.text,
              fontFamily: "monospace",
              fontSize: 13,
              lineHeight: 22,
            }}
          >
            {revealed}
          </Text>
        </View>
      ) : null}
      {status.error || message ? (
        <Text
          accessibilityRole="alert"
          style={{ ...text, color: colors.danger }}
        >
          {message || status.error}
        </Text>
      ) : null}
      {status.conflicts.map((conflict) => (
        <View
          key={conflict.id}
          style={{
            borderTopWidth: 1,
            borderColor: colors.line,
            paddingTop: 14,
            gap: 9,
          }}
        >
          <Text style={{ color: colors.text, fontFamily: Fonts.bold }}>
            {conflict.label} · {conflict.field.replaceAll("_", " ")}
          </Text>
          {(["local", "remote"] as const).map((choice) => (
            <Pressable
              key={choice}
              accessibilityRole="radio"
              accessibilityState={{
                checked: resolutions[conflict.id]?.choice === choice,
              }}
              onPress={() =>
                setResolutions((current) => ({
                  ...current,
                  [conflict.id]: {
                    local: conflict.local,
                    remote: conflict.remote,
                    choice,
                  },
                }))
              }
              style={{
                borderWidth: 1,
                borderColor:
                  resolutions[conflict.id]?.choice === choice
                    ? colors.accent
                    : colors.line,
                padding: 12,
                borderRadius: 10,
                gap: 5,
              }}
            >
              <Text style={{ color: colors.text, fontFamily: Fonts.bold }}>
                {choice === "local"
                  ? "Keep this device’s version"
                  : "Keep the other device’s version"}
              </Text>
              <Text selectable style={text}>
                {readableSyncValue(conflict[choice])}
              </Text>
            </Pressable>
          ))}
        </View>
      ))}
      {status.conflicts.length ? (
        <Button
          label="Apply my choices and sync"
          disabled={
            status.running || status.conflicts.some((c) => !resolutions[c.id])
          }
          onPress={() => void act(async () => { await flushPendingSaves(); await syncDevices(resolutions); })}
        />
      ) : null}
    </View>
  );
}
