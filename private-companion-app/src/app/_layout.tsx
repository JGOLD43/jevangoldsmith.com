import {
  Chivo_400Regular,
  Chivo_500Medium,
  Chivo_600SemiBold,
  Chivo_700Bold,
  Chivo_800ExtraBold,
  Chivo_900Black,
  useFonts,
} from '@expo-google-fonts/chivo';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as Updates from 'expo-updates';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import AppTabs from '@/components/app-tabs';
import { LockGate } from '@/components/lock-gate';
import { AppProvider } from '@/state/app-context';
import { BooksProvider } from '@/state/books-context';
import { LearningProvider } from '@/state/learning-context';
import { AppThemeProvider, useAppTheme } from '@/state/theme-context';
import { retryPendingPublications } from '@/services/publication-outbox';
import { checkForRemoteUpdate } from '@/services/remote-updates';

function AutomaticRemoteUpdates() {
  const { isUpdatePending } = Updates.useUpdates();
  const reloading = useRef(false);
  const previousAppState = useRef(AppState.currentState);

  const applyPendingUpdate = () => {
    if (reloading.current) return;
    reloading.current = true;
    void Updates.reloadAsync().catch(() => {
      reloading.current = false;
    });
  };

  // ON_LOAD downloads in the background. As soon as expo-updates reports the
  // compatible bundle is complete, restart into it without requiring a cable,
  // laptop command, or a second manual launch.
  useEffect(() => {
    if (isUpdatePending) applyPendingUpdate();
  }, [isUpdatePending]);

  // A long-running Android app may not cold-start for days. Check once when it
  // returns from the background; never poll repeatedly or touch vault data.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const becameActive = previousAppState.current !== 'active' && nextState === 'active';
      previousAppState.current = nextState;
      if (!becameActive || reloading.current) return;
      void checkForRemoteUpdate().then((result) => {
        if (result === 'downloaded') applyPendingUpdate();
      }).catch(() => undefined);
    });
    return () => subscription.remove();
  }, []);

  return null;
}

function AutomaticPublicSync() {
  useEffect(() => {
    const sync = () => { void retryPendingPublications(); };
    sync();
    const interval = setInterval(sync, 60_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);
  return null;
}

function ThemedApp() {
  const { colors, mode } = useAppTheme();
  const navigationTheme = {
    ...(mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(mode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.accent,
      background: colors.background,
      card: colors.backgroundElement,
      text: colors.text,
      border: colors.line,
      notification: colors.danger,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <LockGate>
        <BooksProvider>
          <LearningProvider>
            <AutomaticRemoteUpdates />
            <AutomaticPublicSync />
            <AppTabs />
          </LearningProvider>
        </BooksProvider>
      </LockGate>
    </ThemeProvider>
  );
}

export default function TabLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Chivo_400Regular,
    Chivo_500Medium,
    Chivo_600SemiBold,
    Chivo_700Bold,
    Chivo_800ExtraBold,
    Chivo_900Black,
  });

  // A damaged or unavailable font asset must never strand the installed app
  // on an empty native surface. Android can fall back to its system face and
  // the rest of the app remains fully usable.
  if (!fontsLoaded && !fontError) return null;

  return (
    <AppThemeProvider>
      <AppProvider>
        <ThemedApp />
      </AppProvider>
    </AppThemeProvider>
  );
}
