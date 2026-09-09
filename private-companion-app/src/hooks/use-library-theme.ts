import { Colors, type AppColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const palettes = {
  light: { ...Colors.light, accent: '#355BCC', accentSoft: '#E9EEFC', action: '#355BCC', onAction: '#FFFFFF' },
  dark: { ...Colors.dark, accent: '#A9BEFF', accentSoft: '#242E47', action: '#A9BEFF', onAction: '#111827' },
} satisfies Record<string, AppColors>;

// Keep the user's light/dark preference while giving Library a quieter accent.
export function useLibraryTheme(): AppColors {
  return useTheme().background === Colors.dark.background ? palettes.dark : palettes.light;
}
