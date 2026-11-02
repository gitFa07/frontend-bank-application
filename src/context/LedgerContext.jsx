import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { accounts as accountsApi } from "../lib/api";
import { clearActivity, loadActivity, upsertActivity } from "../lib/activity";
import { shortId } from "../lib/format";
import { useAuth } from "./AuthContext";

const LedgerContext = createContext(null);

export function LedgerProvider({ children }) {
  const { user } = useAuth();
  const userId = user?._id;

  const [accounts, setAccounts] = useState([]);
  // accountId -> number, or undefined while loading
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activity, setActivity] = useState(() => loadActivity(userId));

  const refreshBalances = useCallback(async (ids) => {
    const results = await Promise.allSettled(ids.map((id) => accountsApi.balance(id)));
    setBalances((prev) => {
      const next = { ...prev };
      results.forEach((r, i) => {
        if (r.status === "fulfilled") next[ids[i]] = r.value;
      });
      return next;
    });
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await accountsApi.list();
      list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setAccounts(list);
      await refreshBalances(list.map((a) => a._id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [refreshBalances]);

  const createAccount = useCallback(async () => {
    const account = await accountsApi.create();
    setAccounts((prev) => [...prev, account]);
    setBalances((prev) => ({ ...prev, [account._id]: 0 }));
    return account;
  }, []);

  const recordActivity = useCallback(
    (entry) => {
      if (userId) setActivity(upsertActivity(userId, entry));
    },
    [userId],
  );

  const clearHistory = useCallback(() => {
    clearActivity(userId);
    setActivity([]);
  }, [userId]);

  useEffect(() => {
    setAccounts([]);
    setBalances({});
    setActivity(loadActivity(userId));
    if (userId) refresh();
  }, [userId, refresh]);

  const value = useMemo(() => {
    const ownIds = new Set(accounts.map((a) => a._id));
    const indexOf = new Map(accounts.map((a, i) => [a._id, i]));
    const totalBalance = accounts.reduce((sum, a) => sum + (balances[a._id] ?? 0), 0);

    return {
      accounts,
      activeAccounts: accounts.filter((a) => a.status === "ACTIVE"),
      balances,
      totalBalance,
      balancesReady: accounts.every((a) => balances[a._id] !== undefined),
      loading,
      error,
      activity,
      ownIds,
      accountName: (id) => (indexOf.has(id) ? `Account ${indexOf.get(id) + 1}` : shortId(id)),
      refresh,
      refreshBalances,
      createAccount,
      recordActivity,
      clearHistory,
    };
  }, [accounts, balances, loading, error, activity, refresh, refreshBalances, createAccount, recordActivity, clearHistory]);

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
}

export function useLedger() {
  return useContext(LedgerContext);
}
