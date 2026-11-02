import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { accounts as accountsApi, type Account } from '@/lib/api';
import { clearActivity, loadActivity, saveActivity, upsert, type ActivityItem } from '@/lib/activity';
import { shortId } from '@/lib/format';
import { useAuth } from './auth';

type LedgerValue = {
  accounts: Account[];
  activeAccounts: Account[];
  /** accountId -> balance; missing while loading */
  balances: Record<string, number>;
  totalBalance: number;
  balancesReady: boolean;
  loading: boolean;
  error: string | null;
  activity: ActivityItem[];
  ownIds: Set<string>;
  accountName: (id: string) => string;
  refresh: () => Promise<void>;
  refreshBalances: (ids: string[]) => Promise<void>;
  createAccount: () => Promise<Account>;
  recordActivity: (entry: Partial<ActivityItem> & { idempotencyKey: string }) => void;
  clearHistory: () => void;
};

const LedgerContext = createContext<LedgerValue | null>(null);

export function LedgerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?._id;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  const refreshBalances = useCallback(async (ids: string[]) => {
    const results = await Promise.allSettled(ids.map((id) => accountsApi.balance(id)));
    setBalances((prev) => {
      const next = { ...prev };
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') next[ids[i]] = r.value;
      });
      return next;
    });
  }, []);

  // Only touches state after the first await, so it is safe to start from an effect.
  const fetchAccounts = useCallback(async () => {
    try {
      const list = await accountsApi.list();
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setAccounts(list);
      setError(null);
      await refreshBalances(list.map((a) => a._id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [refreshBalances]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    await fetchAccounts();
  }, [fetchAccounts]);

  const createAccount = useCallback(async () => {
    const account = await accountsApi.create();
    setAccounts((prev) => [...prev, account]);
    setBalances((prev) => ({ ...prev, [account._id]: 0 }));
    return account;
  }, []);

  const recordActivity = useCallback(
    (entry: Partial<ActivityItem> & { idempotencyKey: string }) => {
      if (!userId) return;
      setActivity((prev) => {
        const next = upsert(prev, entry);
        saveActivity(userId, next);
        return next;
      });
    },
    [userId],
  );

  const clearHistory = useCallback(() => {
    if (userId) clearActivity(userId);
    setActivity([]);
  }, [userId]);

  // A different user signed in: drop the previous user's data before painting.
  const [loadedFor, setLoadedFor] = useState(userId);
  if (loadedFor !== userId) {
    setLoadedFor(userId);
    setAccounts([]);
    setBalances({});
    setActivity([]);
    setError(null);
    setLoading(Boolean(userId));
  }

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    loadActivity(userId).then((items) => !cancelled && setActivity(items));
    // fetchAccounts only sets state after awaiting the network, never synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAccounts();
    return () => {
      cancelled = true;
    };
  }, [userId, fetchAccounts]);

  const value = useMemo<LedgerValue>(() => {
    const ownIds = new Set(accounts.map((a) => a._id));
    const indexOf = new Map(accounts.map((a, i) => [a._id, i]));
    return {
      accounts,
      activeAccounts: accounts.filter((a) => a.status === 'ACTIVE'),
      balances,
      totalBalance: accounts.reduce((sum, a) => sum + (balances[a._id] ?? 0), 0),
      balancesReady: accounts.every((a) => balances[a._id] !== undefined),
      loading,
      error,
      activity,
      ownIds,
      accountName: (id: string) => (indexOf.has(id) ? `Account ${indexOf.get(id)! + 1}` : shortId(id)),
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
  const value = useContext(LedgerContext);
  if (!value) throw new Error('useLedger must be used inside LedgerProvider');
  return value;
}
