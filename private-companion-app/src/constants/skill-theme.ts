import { Platform } from 'react-native';
import type { AppColors } from './theme';

// A focused, cool-toned workspace for the skill curriculum.
export const SkillColors: AppColors = {
  background: '#F7F9FC', backgroundElement: '#FFFFFF', backgroundSelected: '#EDF1F7',
  text: '#17243B', textSecondary: '#637087', line: '#DEE5EF',
  accent: '#365CF5', accentSoft: '#EDF2FF', action: '#365CF5', onAction: '#FFFFFF',
  success: '#16826D', danger: '#C63B4D', dangerSoft: '#FFF0F2', navBackground: '#FFFFFF',
};
const regular = Platform.OS === 'android' ? 'sans-serif' : 'System';
const medium = Platform.OS === 'android' ? 'sans-serif-medium' : 'System';
export const SkillFonts = { sans: regular, medium, semibold: medium, bold: medium, extraBold: medium, black: medium, mono: Platform.OS === 'android' ? 'monospace' : 'Menlo' };
