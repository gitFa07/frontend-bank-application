import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/theme';
import { Txt } from './ui';

export default function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={open} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]} onPress={onClose} />
      <View style={styles.dock} pointerEvents="box-none">
        <Animated.View
          entering={SlideInDown.duration(350)}
          accessibilityViewIsModal
          style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 16 }]}
        >
          <View style={[styles.handle, { backgroundColor: colors.subtle }]} />
          {title ? (
            <Txt variant="title" style={{ paddingHorizontal: 24, paddingVertical: 8 }}>
              {title}
            </Txt>
          ) : null}
          <ScrollView bounces={false}>{children}</ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dock: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%' },
  handle: { width: 32, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8, opacity: 0.6 },
});
