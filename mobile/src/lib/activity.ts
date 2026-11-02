// The backend has no transaction history endpoint, so payments made from this
// device are recorded locally, per user.
import type { TransactionStatus } from './api';
import { getJSON, removeKey, setJSON } from './storage';

export type ActivityItem = {
  idempotencyKey: string;
  kind: 'payment' | 'self';
  fromAccount: string;
  toAccount: string;
  toName: string | null;
  amount: number;
  note: string | null;
  status: TransactionStatus;
  transactionId?: string | null;
  message?: string | null;
  createdAt: string;
};

const key = (userId: string) => `ledger.activity.${userId}`;
const MAX_ITEMS = 200;

export async function loadActivity(userId?: string): Promise<ActivityItem[]> {
  if (!userId) return [];
  const items = await getJSON<ActivityItem[]>(key(userId), []);
  return Array.isArray(items) ? items : [];
}

/** Inserts or updates an entry, matched by idempotencyKey. Returns the new list. */
export function upsert(items: ActivityItem[], entry: Partial<ActivityItem> & { idempotencyKey: string }) {
  const index = items.findIndex((i) => i.idempotencyKey === entry.idempotencyKey);
  const next = [...items];
  if (index >= 0) next[index] = { ...next[index], ...entry };
  else next.unshift(entry as ActivityItem);
  return next.slice(0, MAX_ITEMS);
}

export function saveActivity(userId: string, items: ActivityItem[]) {
  return setJSON(key(userId), items);
}

export function clearActivity(userId: string) {
  return removeKey(key(userId));
}

/** Distinct people paid recently (excluding the user's own accounts). */
export function recentRecipients(items: ActivityItem[], ownIds: Set<string>) {
  const seen = new Map<string, { accountId: string; name: string | null }>();
  for (const item of items) {
    if (item.status !== 'COMPLETED' || ownIds.has(item.toAccount) || seen.has(item.toAccount)) continue;
    seen.set(item.toAccount, { accountId: item.toAccount, name: item.toName || null });
  }
  return [...seen.values()];
}
