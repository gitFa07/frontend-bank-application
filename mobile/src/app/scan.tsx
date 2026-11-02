import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from '@/components/Toast';
import { Button, IconButton, Txt } from '@/components/ui';
import { extractAccountId } from '@/lib/format';

const WINDOW = 268;

/** Kit: "Scanner". Reads a Ledger Pay QR code and opens the payment flow. */
export default function Scan() {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const handled = useRef(false);
  const line = useSharedValue(0);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) requestPermission();
  }, [permission, requestPermission]);

  useEffect(() => {
    if (!reduced) line.set(withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [line, reduced]);

  const lineStyle = useAnimatedStyle(() => ({ transform: [{ translateY: line.value * (WINDOW - 40) }] }));

  const onScanned = ({ data }: BarcodeScanningResult) => {
    if (handled.current) return;
    const id = extractAccountId(data);
    if (!id) {
      handled.current = true;
      toast("That QR code isn't a Ledger Pay account.");
      setTimeout(() => (handled.current = false), 2500); // avoid repeating the toast every frame
      return;
    }
    handled.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace(`/pay?to=${id}`);
  };

  const granted = permission?.granted;

  return (
    <View style={styles.root}>
      {granted ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={onScanned}
        />
      ) : null}

      {/* Dimmed surround with a clear square window. */}
      <View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="box-none">
        <View style={[styles.dim, { height: insets.top + 110 }]} />
        <View style={{ flexDirection: 'row', height: WINDOW }}>
          <View style={[styles.dim, { flex: 1 }]} />
          <View style={styles.window}>
            {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
              <View key={c} style={[styles.corner, styles[c]]} />
            ))}
            {granted ? <Animated.View style={[styles.line, lineStyle]} /> : null}
          </View>
          <View style={[styles.dim, { flex: 1 }]} />
        </View>
        <View style={[styles.dim, { flex: 1, alignItems: 'center', paddingTop: 24, paddingHorizontal: 32 }]}>
          <Txt color="rgba(255,255,255,0.85)" variant="bodySm" style={{ textAlign: 'center' }}>
            {granted
              ? 'Point your camera at a Ledger Pay QR code'
              : permission && !permission.canAskAgain
                ? 'Camera access is turned off. Allow it in Settings, or paste the account ID instead.'
                : 'Ledger Pay needs the camera to scan QR codes.'}
          </Txt>
          {permission && !granted && permission.canAskAgain ? (
            <Button variant="tonal" onPress={requestPermission} style={{ marginTop: 16 }}>
              Allow camera
            </Button>
          ) : null}
        </View>
      </View>

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <IconButton icon="close" label="Close" color="#fff" onPress={() => router.back()} />
        <View style={{ flexDirection: 'row' }}>
          {granted ? (
            <IconButton icon="flashlight_on" label={torch ? 'Turn flashlight off' : 'Turn flashlight on'} color={torch ? '#fbbc04' : '#fff'} onPress={() => setTorch((t) => !t)} />
          ) : null}
          <IconButton icon="qr_code" label="Your QR code" color="#fff" onPress={() => router.replace('/qr')} />
        </View>
      </View>

      <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
        <Button variant="tonal" icon="content_paste" onPress={() => router.replace('/pay')} style={{ height: 52 }}>
          Enter or paste an account ID
        </Button>
      </View>
    </View>
  );
}

const C = 48;
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  overlay: { flexDirection: 'column' },
  dim: { backgroundColor: 'rgba(0,0,0,0.55)' },
  window: { width: WINDOW, height: WINDOW },
  corner: { position: 'absolute', width: C, height: C, borderColor: '#fff' },
  tl: { left: 0, top: 0, borderLeftWidth: 4, borderTopWidth: 4, borderTopLeftRadius: 28 },
  tr: { right: 0, top: 0, borderRightWidth: 4, borderTopWidth: 4, borderTopRightRadius: 28 },
  bl: { left: 0, bottom: 0, borderLeftWidth: 4, borderBottomWidth: 4, borderBottomLeftRadius: 28 },
  br: { right: 0, bottom: 0, borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: 28 },
  line: { position: 'absolute', left: 24, right: 24, top: 20, height: 2, borderRadius: 1, backgroundColor: '#8ab4f8' },
  topBar: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#1e1f20', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 20 },
});
