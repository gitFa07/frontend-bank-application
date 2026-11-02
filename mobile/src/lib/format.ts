import * as Clipboard from 'expo-clipboard';
import { AVATAR_COLORS } from '@/constants/theme';

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export function formatINR(amount: number | string | undefined) {
  return inr.format(Number(amount) || 0);
}

export const ACCOUNT_ID_PATTERN = /^[a-f0-9]{24}$/i;

export function isAccountId(value: string) {
  return ACCOUNT_ID_PATTERN.test(String(value).trim());
}

/** Pulls an account ID out of scanned or pasted text. */
export function extractAccountId(text: string) {
  return text.match(/[a-f0-9]{24}/i)?.[0]?.toLowerCase() ?? null;
}

export function shortId(id?: string | null) {
  return id ? `•••• ${id.slice(-4).toUpperCase()}` : '';
}

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function avatarColor(seed = '') {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function formatDateTime(value?: string) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function formatDay(value: string) {
  const d = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export async function copyText(text: string) {
  try {
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}
