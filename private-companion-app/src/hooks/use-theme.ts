/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useAppTheme } from '@/state/theme-context';

export function useTheme() {
  return useAppTheme().colors;
}
