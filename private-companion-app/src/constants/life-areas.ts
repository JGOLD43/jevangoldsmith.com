import type { SymbolViewProps } from 'expo-symbols';

import type { LifeArea } from '@/domain/models';

export type LifeAreaDefinition = {
  key: LifeArea;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  icon: SymbolViewProps['name'];
};

export const LIFE_AREAS: LifeAreaDefinition[] = [
  { key: 'goal', label: 'Goals', shortLabel: 'Goals', description: 'The outcomes you are actively moving toward.', color: '#D4B87A', icon: { ios: 'flag.fill', android: 'flag' } },
  { key: 'fucket', label: 'Fucket List', shortLabel: 'Fucket', description: 'Things worth doing simply because you want to.', color: '#E07A5F', icon: { ios: 'sparkles', android: 'explore' } },
  { key: 'learning', label: 'Learning', shortLabel: 'Learning', description: 'Skills, ideas and subjects you are developing.', color: '#5B8DEF', icon: { ios: 'graduationcap.fill', android: 'school' } },
  { key: 'interest', label: 'Interests', shortLabel: 'Interests', description: 'The curiosities you want to keep close.', color: '#A77BD8', icon: { ios: 'heart.fill', android: 'favorite' } },
  { key: 'trip', label: 'Trips', shortLabel: 'Trips', description: 'Places, dates and adventures taking shape.', color: '#55A77A', icon: { ios: 'airplane', android: 'flight' } },
];

export function lifeAreaDefinition(area: LifeArea) {
  return LIFE_AREAS.find((definition) => definition.key === area) ?? LIFE_AREAS[0];
}
