import { TabList, TabSlot, Tabs, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';

function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={[styles.tab, isFocused ? styles.tabActive : null]}>
      <Text style={[styles.tabLabel, isFocused ? styles.tabLabelActive : null]}>{children}</Text>
    </Pressable>
  );
}

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <View style={styles.nav}>
          <Text style={styles.brand}>JGOLD</Text>
          <TabTrigger name="home" href="/" asChild><TabButton>Home</TabButton></TabTrigger>
          <TabTrigger name="library" href="/books" asChild><TabButton>Library</TabButton></TabTrigger>
          <TabTrigger name="website" href="/website" asChild><TabButton>Studio</TabButton></TabTrigger>
          <TabTrigger name="site" href="/ai" asChild><TabButton>Site</TabButton></TabTrigger>
          <TabTrigger name="settings" href="/settings" asChild><TabButton>Settings</TabButton></TabTrigger>
        </View>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  slot: { height: '100%' },
  nav: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 18,
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.light.line,
  },
  brand: { color: Colors.light.text, fontWeight: '800', paddingHorizontal: 12 },
  tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  tabActive: { backgroundColor: Colors.light.action },
  tabLabel: { color: Colors.light.textSecondary, fontWeight: '700', fontSize: 13 },
  tabLabelActive: { color: '#FFFDF8' },
});
