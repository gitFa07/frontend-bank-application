// Client for backend-ledger, ported from the web app (../src/lib/api.js).
// See the "Backend" section of the root CLAUDE.md for the quirks handled here.
import * as Crypto from 'expo-crypto';
import { secure } from './storage';

// Native apps aren't subject to CORS, so the app talks to Render directly.
const BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://bank-transaction-system-wdkl.onrender.com').replace(
  /\/+$/,
  '',
);
const TOKEN_KEY = 'ledger.token';

// Render's free tier can take close to a minute to wake up.
const DEFAULT_TIMEOUT = 60_000;
// Transfers include a 5s server-side delay plus an email send.
const TRANSFER_TIMEOUT = 90_000;

export type User = { _id: string; name: string; email: string };
export type AccountStatus = 'ACTIVE' | 'FROZEN' | 'CLOSED';
export type Account = {
  _id: string;
  user: string;
  status: AccountStatus;
  currency: string;
  createdAt: string;
  updatedAt: string;
};
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
export type Transaction = {
  _id: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  status: TransactionStatus;
  idempotencyKey: string;
  createdAt?: string;
};
export type Session = { user: User; token: string };

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status = 0, body: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }

  // True when we never got an answer, so a retry with the same idempotency key is safe.
  get isNetwork() {
    return this.status === 0;
  }
}

// The token is read from SecureStore once at startup and kept in memory.
let token: string | null = null;
const unauthorizedListeners = new Set<() => void>();

export async function loadToken() {
  token = await secure.get(TOKEN_KEY);
  return token;
}

export async function saveToken(next: string | null) {
  token = next;
  if (next) await secure.set(TOKEN_KEY, next);
  else await secure.remove(TOKEN_KEY);
}

export function onUnauthorized(listener: () => void) {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

type Json = Record<string, any>;

async function request<T = Json>(
  path: string,
  { method = 'GET', body, timeout = DEFAULT_TIMEOUT }: { method?: string; body?: Json; timeout?: number } = {},
): Promise<T> {
  const sentToken = token;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  let res: Response;
  try {
    res = await fetch(BASE_URL + path, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(sentToken ? { Authorization: `Bearer ${sentToken}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      // The backend reads its cookie before the Bearer header; never send one.
      credentials: 'omit',
      signal: controller.signal,
    });
  } catch (err) {
    throw new ApiError(
      (err as Error).name === 'AbortError'
        ? 'The server took too long to respond. Please try again.'
        : "Can't reach the server. Check your connection.",
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let data: Json = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    // Unhandled backend errors come back as an HTML page.
  }

  if (!res.ok) {
    if (res.status === 401 && sentToken) unauthorizedListeners.forEach((fn) => fn());
    const message =
      data.message ??
      data.response ??
      (res.status >= 500 ? 'Something went wrong on the server.' : `Request failed (${res.status})`);
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}

export const auth = {
  async register(details: { name: string; email: string; password: string }): Promise<Session> {
    const data = await request('/api/auth/register', { method: 'POST', body: details });
    if (!data.token) throw new ApiError(data.message ?? "Couldn't create your account.", 400, data);
    return data as Session;
  },

  async login(credentials: { email: string; password: string }): Promise<Session> {
    const data = await request('/api/auth/login', { method: 'POST', body: credentials });
    // A wrong password comes back as HTTP 200 without a token.
    if (!data.token) throw new ApiError(data.message ?? 'Email or password is invalid', 401, data);
    return data as Session;
  },

  async logout() {
    // The route crashes when called without a token.
    if (!token) return;
    await request('/api/auth/logout', { method: 'POST' });
  },
};

export const accounts = {
  async list(): Promise<Account[]> {
    const data = await request<{ accounts?: Account[] }>('/api/accounts');
    return data.accounts ?? [];
  },

  async create(): Promise<Account> {
    const data = await request<{ account: Account }>('/api/accounts', { method: 'POST' });
    return data.account;
  },

  async balance(accountId: string): Promise<number> {
    const data = await request<{ balance?: number }>(`/api/accounts/balance/${accountId}`);
    return Number(data.balance ?? 0);
  },
};

export type TransferResult = {
  status: 'COMPLETED' | 'PENDING' | 'REVERSED';
  transaction: Transaction | null;
  message?: string;
};

/** Sends money. Throws ApiError when the backend rejects it. */
export async function transfer(input: {
  fromAccount: string;
  toAccount: string;
  amount: number;
  idempotencyKey: string;
}): Promise<TransferResult> {
  const data = await request<{ message?: string; transaction?: Transaction }>('/api/transaction', {
    method: 'POST',
    body: input,
    timeout: TRANSFER_TIMEOUT,
  });

  // A 200 can mean "already processed", "still processing" or "reversed".
  if (data.transaction?.status === 'COMPLETED') {
    return { status: 'COMPLETED', transaction: data.transaction, message: data.message };
  }
  if (/reversed/i.test(data.message ?? '')) {
    return { status: 'REVERSED', transaction: data.transaction ?? null, message: data.message };
  }
  return { status: 'PENDING', transaction: data.transaction ?? null, message: data.message };
}

export function newIdempotencyKey() {
  return Crypto.randomUUID();
}
