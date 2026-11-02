import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { palettes, type Palette } from '@/constants/theme';
import { getJSON, setJSON } from '@/lib/storage';

export type ThemePreference = 'system' | 'light' | 'dark';
const THEME_KEY = 'ledger.theme';

type ThemeValue = {
  colors: Palette;
  dark: boolean;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const [preference, setPref] = useState<ThemePreference>('system');

  useEffect(() => {
    getJSON<ThemePreference>(THEME_KEY, 'system').then((p) => {
      setPref(p);
      Appearance.setColorScheme(p === 'system' ? 'auto' : p);
    });
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPref(p);
    Appearance.setColorScheme(p === 'system' ? 'auto' : p);
    setJSON(THEME_KEY, p);
  }, []);

  const value = useMemo(() => {
    const dark = scheme === 'dark';
    return { colors: dark ? palettes.dark : palettes.light, dark, preference, setPreference };
  }, [scheme, preference, setPreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
