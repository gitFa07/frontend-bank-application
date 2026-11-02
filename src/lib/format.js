const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export function formatINR(amount) {
  return inr.format(Number(amount) || 0);
}

// Plain grouped digits, for the large amount display next to a separate ₹ sign.
export function formatAmountDigits(amount) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Number(amount) || 0);
}

export const ACCOUNT_ID_PATTERN = /^[a-f0-9]{24}$/i;

export function isAccountId(value) {
  return ACCOUNT_ID_PATTERN.test(String(value).trim());
}

export function shortId(id) {
  return id ? `•••• ${String(id).slice(-4).toUpperCase()}` : "";
}

export function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

// Avatar fills from the kit's contact list (pink, green, blue, purple, orange, teal).
const AVATAR_COLORS = ["#b5164e", "#0f5132", "#0b57d0", "#5b3cc4", "#b3541e", "#00696b"];

export function avatarColor(seed = "") {
  let hash = 0;
  for (const ch of String(seed)) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function formatDateTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDay(value) {
  const d = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API needs a secure origin; fall back to a hidden textarea.
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    el.remove();
    return ok;
  }
}
