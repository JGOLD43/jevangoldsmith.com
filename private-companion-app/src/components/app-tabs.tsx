import { Slot, type Href, usePathname, useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts, type AppColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TabButtonProps = {
  bottomInset: number;
  icon: SymbolViewProps['name'];
  isFocused: boolean;
  label: string;
  onPress: () => void;
};

function TabButton({ bottomInset, icon, isFocused, label, onPress }: TabButtonProps) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const color = isFocused ? colors.text : colors.textSecondary;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="tab"
      onPress={onPress}
      style={[
        styles.tab,
        { marginTop: 8, marginBottom: Math.max(8, bottomInset + 6) },
        isFocused ? styles.tabActive : null,
      ]}>
      <SymbolView name={icon} size={21} tintColor={color} />
      <Text style={[styles.tabLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

export default function AppTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const immersive = pathname.endsWith('/reader') || pathname === '/learning/session' || pathname.endsWith('/practice');
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const go = (href: Href) => router.navigate(href);

  return (
    <View style={styles.container}>
      <View style={styles.slot}><Slot /></View>
      {!immersive ? (
        <View style={[styles.nav, { height: 80 + insets.bottom }]}> 
          <TabButton bottomInset={insets.bottom} isFocused={pathname === '/' || pathname.startsWith('/learning')} label="Home" icon={{ ios: 'house', android: 'home' }} onPress={() => go('/')} />
          <TabButton bottomInset={insets.bottom} isFocused={pathname.startsWith('/contacts')} label="People" icon={{ ios: 'person.2.fill', android: 'group' }} onPress={() => go('/contacts')} />
          <TabButton bottomInset={insets.bottom} isFocused={pathname.startsWith('/books') || pathname.startsWith('/movies') || pathname.startsWith('/essays') || pathname.startsWith('/skills') || pathname === '/insights'} label="Library" icon={{ ios: 'books.vertical.fill', android: 'library_books' }} onPress={() => go('/books')} />
          <TabButton bottomInset={insets.bottom} isFocused={pathname === '/website'} label="Studio" icon={{ ios: 'square.and.pencil', android: 'edit_note' }} onPress={() => go('/website')} />
          <TabButton bottomInset={insets.bottom} isFocused={pathname === '/ai'} label="Site" icon={{ ios: 'globe', android: 'language' }} onPress={() => go('/ai')} />
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  slot: { flex: 1 },
  nav: {
    zIndex: 100,
    flexDirection: 'row',
    paddingTop: 5,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.navBackground,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 7,
    elevation: 10,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    borderRadius: 10,
    paddingVertical: 3,
  },
  tabActive: {
    backgroundColor: colors.backgroundElement,
  },
  tabLabel: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.1,
  },
});
}
