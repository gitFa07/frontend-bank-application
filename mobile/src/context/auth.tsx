import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { auth, loadToken, onUnauthorized, saveToken, type Session, type User } from '@/lib/api';
import { getJSON, removeKey, setJSON } from '@/lib/storage';
import { toast } from '@/components/Toast';

const USER_KEY = 'ledger.user';

type AuthValue = {
  ready: boolean;
  user: User | null;
  login: (c: { email: string; password: string }) => Promise<void>;
  register: (d: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // There is no /me endpoint, so the user from login/register is kept locally.
  useEffect(() => {
    (async () => {
      const token = await loadToken();
      if (token) setUser(await getJSON<User | null>(USER_KEY, null));
      setReady(true);
    })();
  }, []);

  const startSession = useCallback(async ({ user: nextUser, token }: Session) => {
    await saveToken(token);
    await setJSON(USER_KEY, nextUser);
    setUser(nextUser);
  }, []);

  const endSession = useCallback(async () => {
    await saveToken(null);
    await removeKey(USER_KEY);
    setUser(null);
  }, []);

  const login = useCallback(async (c: { email: string; password: string }) => startSession(await auth.login(c)), [startSession]);

  const register = useCallback(
    async (d: { name: string; email: string; password: string }) => startSession(await auth.register(d)),
    [startSession],
  );

  const logout = useCallback(async () => {
    try {
      await auth.logout();
    } catch {
      // Signing out locally is what matters; the token expires on its own.
    }
    await endSession();
  }, [endSession]);

  useEffect(
    () =>
      onUnauthorized(() => {
        endSession();
        toast('Your session has expired. Please sign in again.');
      }),
    [endSession],
  );

  const value = useMemo(() => ({ ready, user, login, register, logout }), [ready, user, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
