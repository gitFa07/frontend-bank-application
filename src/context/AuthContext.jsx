import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { auth, getToken, setToken, UNAUTHORIZED_EVENT } from "../lib/api";
import { toast } from "../components/Toaster";

const USER_KEY = "ledger.user";
const AuthContext = createContext(null);

// There is no /me endpoint, so the user from login/register is kept locally.
function readUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeUser(user) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (getToken() ? readUser() : null));

  const startSession = useCallback(({ user: nextUser, token }) => {
    setToken(token);
    writeUser(nextUser);
    setUser(nextUser);
  }, []);

  const endSession = useCallback(() => {
    setToken(null);
    writeUser(null);
    setUser(null);
  }, []);

  const login = useCallback(async (credentials) => startSession(await auth.login(credentials)), [startSession]);

  const register = useCallback(async (details) => startSession(await auth.register(details)), [startSession]);

  const logout = useCallback(async () => {
    try {
      await auth.logout();
    } catch {
      // Signing out locally is what matters; the token expires on its own.
    }
    endSession();
  }, [endSession]);

  useEffect(() => {
    const onUnauthorized = () => {
      endSession();
      toast("Your session has expired. Please sign in again.");
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [endSession]);

  const value = useMemo(() => ({ user, login, register, logout }), [user, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
