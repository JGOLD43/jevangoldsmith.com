import { type PropsWithChildren, type ReactNode, useMemo } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, type AppColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function FoodSheet({ title, subtitle, visible, onDismiss, children, footer }: PropsWithChildren<{
  title: string;
  subtitle?: string;
  visible: boolean;
  onDismiss: () => void;
  footer?: ReactNode;
}>) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const desktop = Platform.OS === 'web';
  return (
    <Modal
      animationType={desktop ? 'fade' : 'slide'}
      transparent={desktop}
      presentationStyle="pageSheet"
      visible={visible}
      onRequestClose={onDismiss}
    >
      <SafeAreaView style={[styles.safe, desktop && styles.backdrop]}>
        <KeyboardAvoidingView style={[styles.flex, desktop && styles.desktopSheet]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <View style={styles.copy}>
              <Text accessibilityRole="header" style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onDismiss} style={({ pressed }) => [styles.close, pressed && { backgroundColor: colors.backgroundSelected }]}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    backdrop: { backgroundColor: 'rgba(0,0,0,0.3)', padding: 24, alignItems: 'center', justifyContent: 'center' },
    desktopSheet: { flex: 0, width: '100%', maxWidth: 720, maxHeight: '90%', backgroundColor: colors.background, borderRadius: 10, overflow: 'hidden' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12, borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth },
    copy: { flex: 1, minWidth: 0, gap: 4 },
    title: { color: colors.text, fontFamily: Fonts.bold, fontSize: Platform.OS === 'web' ? 24 : 31, lineHeight: Platform.OS === 'web' ? 30 : 38 },
    subtitle: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21 },
    close: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    closeText: { color: colors.text, fontFamily: Fonts.sans, fontSize: 28, lineHeight: 32 },
    content: { padding: 20, gap: 18, width: '100%', maxWidth: 760, alignSelf: 'center' },
    footer: { padding: 16, borderTopColor: colors.line, borderTopWidth: StyleSheet.hairlineWidth, backgroundColor: colors.background },
  });
}
