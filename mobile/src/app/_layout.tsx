import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/context/auth';
import { LedgerProvider } from '@/context/ledger';
import { ThemeProvider, useTheme } from '@/context/theme';
import Toaster from '@/components/Toast';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { ready, user } = useAuth();
  const { colors, dark } = useTheme();

  // Keep the native splash up until the stored session has been read.
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
        <Stack.Protected guard={Boolean(user)}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="pay" />
          <Stack.Screen name="qr" />
          <Stack.Screen name="scan" options={{ animation: 'fade' }} />
          <Stack.Screen name="activity/[key]" />
        </Stack.Protected>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="auth" options={{ animation: 'fade' }} />
        </Stack.Protected>
      </Stack>
      <Toaster />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <LedgerProvider>
            <RootNavigator />
          </LedgerProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
