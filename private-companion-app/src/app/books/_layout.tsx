import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function BooksLayout() {
  const colors = useTheme();
  return (
    <Stack screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: colors.background },
      animation: 'slide_from_right',
    }} />
  );
}
