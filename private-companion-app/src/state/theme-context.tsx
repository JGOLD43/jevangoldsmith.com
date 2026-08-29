import * as SystemUI from 'expo-system-ui';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { Colors, type AppColors, type ThemeMode } from '@/constants/theme';
import { loadThemePreference, saveThemePreference } from '@/storage/theme-preference';

type AppThemeContextValue = {
  colors: AppColors;
  mode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    let active = true;
    void loadThemePreference().then((stored) => {
      if (active && stored) setMode(stored);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(Colors[mode].background);
  }, [mode]);

  const setThemeMode = useCallback((nextMode: ThemeMode) => {
    setMode((current) => current === nextMode ? current : nextMode);
    void saveThemePreference(nextMode);
  }, []);

  const value = useMemo<AppThemeContextValue>(() => ({
    colors: Colors[mode],
    mode,
    setThemeMode,
  }), [mode, setThemeMode]);

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme(): AppThemeContextValue {
  const context = useContext(AppThemeContext);
  if (!context) throw new Error('useAppTheme must be used inside AppThemeProvider');
  return context;
}
