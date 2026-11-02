import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// SecureStore (Android Keystore) for secrets; it isn't available on web,
// where the app only runs for previews.
const hasSecureStore = Platform.OS !== 'web';

export const secure = {
  get: (key: string) => (hasSecureStore ? SecureStore.getItemAsync(key) : AsyncStorage.getItem(key)),
  set: (key: string, value: string) =>
    hasSecureStore ? SecureStore.setItemAsync(key, value) : AsyncStorage.setItem(key, value),
  remove: (key: string) => (hasSecureStore ? SecureStore.deleteItemAsync(key) : AsyncStorage.removeItem(key)),
};

export async function getJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function setJSON(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is a convenience here; ignore failures.
  }
}

export async function removeKey(key: string) {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // ignore
  }
}
