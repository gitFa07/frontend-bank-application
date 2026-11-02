// The backend has no transaction history endpoint, so payments made from this
// device are recorded here, per user.

const key = (userId) => `ledger.activity.${userId}`;
const MAX_ITEMS = 200;

export function loadActivity(userId) {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(key(userId));
    const items = raw ? JSON.parse(raw) : [];
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function save(userId, items) {
  try {
    localStorage.setItem(key(userId), JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // Storage full or blocked: history is a convenience, so ignore.
  }
}

/** Inserts or updates an entry, matched by idempotencyKey. */
export function upsertActivity(userId, entry) {
  const items = loadActivity(userId);
  const index = items.findIndex((i) => i.idempotencyKey === entry.idempotencyKey);
  if (index >= 0) items[index] = { ...items[index], ...entry };
  else items.unshift(entry);
  save(userId, items);
  return items;
}

export function clearActivity(userId) {
  try {
    localStorage.removeItem(key(userId));
  } catch {
    // ignore
  }
}

/** Distinct people paid recently (excluding the user's own accounts). */
export function recentRecipients(items, ownIds = new Set()) {
  const seen = new Map();
  for (const item of items) {
    if (item.status !== "COMPLETED" || ownIds.has(item.toAccount) || seen.has(item.toAccount)) continue;
    seen.set(item.toAccount, { accountId: item.toAccount, name: item.toName || null });
  }
  return [...seen.values()];
}
