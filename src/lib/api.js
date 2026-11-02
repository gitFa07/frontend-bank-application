// Thin client for backend-ledger. See the "Backend" section of CLAUDE.md for
// the quirks handled here.

const BASE_URL = import.meta.env.VITE_API_URL ?? "";
const TOKEN_KEY = "ledger.token";

// Render's free tier can take close to a minute to wake up.
const DEFAULT_TIMEOUT = 60_000;
// Transfers include a 5s server-side delay plus an email send.
const TRANSFER_TIMEOUT = 90_000;

export const UNAUTHORIZED_EVENT = "ledger:unauthorized";

export class ApiError extends Error {
  constructor(message, status = 0, body = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }

  // True when we never got an answer, so a retry with the same idempotency key is safe.
  get isNetwork() {
    return this.status === 0;
  }
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage unavailable (private mode); the session just won't survive a reload.
  }
}

async function request(path, { method = "GET", body, timeout = DEFAULT_TIMEOUT } = {}) {
  const token = getToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  let res;
  try {
    res = await fetch(BASE_URL + path, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      // The backend reads the cookie before the header, and the cookie it sets
      // can be stale. Send the Bearer token only.
      credentials: "omit",
      signal: controller.signal,
    });
  } catch (err) {
    throw new ApiError(
      err.name === "AbortError"
        ? "The server took too long to respond. Please try again."
        : "Can't reach the server. Check your connection.",
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    // Unhandled backend errors come back as an HTML page.
    data = {};
  }

  if (!res.ok) {
    if (res.status === 401 && token) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    const message =
      data.message ??
      data.response ??
      (res.status >= 500 ? "Something went wrong on the server." : `Request failed (${res.status})`);
    throw new ApiError(message, res.status, data);
  }

  return data;
}

export const auth = {
  async register({ name, email, password }) {
    const data = await request("/api/auth/register", {
      method: "POST",
      body: { name, email, password },
    });
    if (!data.token) throw new ApiError(data.message ?? "Couldn't create your account.", 400, data);
    return data;
  },

  async login({ email, password }) {
    const data = await request("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
    // A wrong password comes back as HTTP 200 without a token.
    if (!data.token) throw new ApiError(data.message ?? "Email or password is invalid", 401, data);
    return data;
  },

  async logout() {
    // The route crashes when called without a token.
    if (!getToken()) return;
    await request("/api/auth/logout", { method: "POST" });
  },
};

export const accounts = {
  async list() {
    const data = await request("/api/accounts");
    return data.accounts ?? [];
  },

  async create() {
    const data = await request("/api/accounts", { method: "POST" });
    return data.account;
  },

  async balance(accountId) {
    const data = await request(`/api/accounts/balance/${accountId}`);
    return Number(data.balance ?? 0);
  },
};

/**
 * Sends money. Resolves to { status, transaction, message } where status is
 * "COMPLETED" | "PENDING" | "REVERSED". Throws ApiError for rejections.
 */
export async function transfer({ fromAccount, toAccount, amount, idempotencyKey }) {
  const data = await request("/api/transaction", {
    method: "POST",
    body: { fromAccount, toAccount, amount, idempotencyKey },
    timeout: TRANSFER_TIMEOUT,
  });

  // A 200 can mean "already processed", "still processing" or "reversed".
  if (data.transaction?.status === "COMPLETED") {
    return { status: "COMPLETED", transaction: data.transaction, message: data.message };
  }
  if (/reversed/i.test(data.message ?? "")) {
    return { status: "REVERSED", transaction: data.transaction ?? null, message: data.message };
  }
  return { status: "PENDING", transaction: data.transaction ?? null, message: data.message };
}

export function newIdempotencyKey() {
  // randomUUID only exists on secure origins; LAN testing on a phone is plain http.
  if (crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {
      // fall through
    }
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
