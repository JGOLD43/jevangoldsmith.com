/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#333333',
    background: '#F5F3ED',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#ECE8DF',
    textSecondary: '#666666',
    accent: '#C9A86C',
    accentSoft: '#F3EADB',
    action: '#2C3E50',
    onAction: '#FFFFFF',
    line: '#E0E0E0',
    danger: '#E74C3C',
    dangerSoft: '#FBE8E6',
    success: '#386A50',
    navBackground: 'rgba(245, 243, 237, 0.97)',
  },
  dark: {
    text: '#E0E0E0',
    background: '#121212',
    backgroundElement: '#1E1E1E',
    backgroundSelected: '#292929',
    textSecondary: '#AAAAAA',
    accent: '#D4B87A',
    accentSoft: '#30291F',
    action: '#D4B87A',
    onAction: '#121212',
    line: '#333333',
    danger: '#FF6B6B',
    dangerSoft: '#3A2020',
    success: '#83B69B',
    navBackground: 'rgba(28, 28, 28, 0.98)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type AppColors = { [Key in keyof typeof Colors.light]: string };
export type ThemeMode = keyof typeof Colors;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'Chivo_400Regular',
    medium: 'Chivo_500Medium',
    semibold: 'Chivo_600SemiBold',
    bold: 'Chivo_700Bold',
    extraBold: 'Chivo_800ExtraBold',
    black: 'Chivo_900Black',
    serif: 'Chivo_700Bold',
    rounded: 'Chivo_600SemiBold',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
  seven: 80,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
