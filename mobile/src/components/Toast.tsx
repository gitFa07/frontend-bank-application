import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/theme';

type Item = { id: number; message: string; tone: 'default' | 'error' };

const listeners = new Set<(item: Item) => void>();
let nextId = 1;

/** Shows a Material snackbar from anywhere in the app. */
export function toast(message: string, { tone = 'default' }: { tone?: Item['tone'] } = {}) {
  const item = { id: nextId++, message, tone };
  listeners.forEach((fn) => fn(item));
}

export default function Toaster() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    const add = (item: Item) => {
      setItems((prev) => [...prev.slice(-2), item]);
      setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== item.id)), 3500);
    };
    listeners.add(add);
    return () => {
      listeners.delete(add);
    };
  }, []);

  return (
    <View pointerEvents="none" style={[styles.wrap, { bottom: insets.bottom + 96 }]}>
      {items.map((item) => (
        <Animated.View
          key={item.id}
          entering={FadeInDown.duration(250)}
          exiting={FadeOutDown.duration(200)}
          accessibilityLiveRegion="polite"
          style={[styles.snack, { backgroundColor: item.tone === 'error' ? colors.dangerTonal : colors.ink }]}
        >
          <Text style={{ color: item.tone === 'error' ? colors.ink : colors.bg, fontSize: 14 }}>{item.message}</Text>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, gap: 8, zIndex: 100 },
  snack: { borderRadius: 8, paddingHorizontal: 16, paddingVertical: 14, elevation: 6 },
});
