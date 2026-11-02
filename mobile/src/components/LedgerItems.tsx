import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useLedger } from '@/context/ledger';
import { useTheme } from '@/context/theme';
import type { Account } from '@/lib/api';
import type { ActivityItem } from '@/lib/activity';
import { formatDay, formatINR, shortId } from '@/lib/format';
import { Avatar, Enter, Icon, StatusBadge, Txt } from './ui';

/** Card for one of the user's own accounts (kit: "Banks" on the Money tab). */
export function AccountCard({ account, compact = false, onPress }: { account: Account; compact?: boolean; onPress?: () => void }) {
  const { colors } = useTheme();
  const { balances, accountName } = useLedger();
  const balance = balances[account._id];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      android_ripple={{ color: colors.surface2 }}
      style={[styles.card, { backgroundColor: colors.surface }, compact && { width: 176 }]}
    >
      <View style={styles.between}>
        <Avatar account size={40} />
        <StatusBadge status={account.status} />
      </View>
      <Txt variant="subtitle" style={{ marginTop: 12 }}>
        {accountName(account._id)}
      </Txt>
      <Txt variant="caption" mono color={colors.muted}>
        {shortId(account._id)}
      </Txt>
      {balance === undefined ? (
        <View style={[styles.skeleton, { backgroundColor: colors.surface2 }]} />
      ) : (
        <Txt variant="title" style={{ marginTop: 8 }}>
          {formatINR(balance)}
        </Txt>
      )}
    </Pressable>
  );
}

/** Payments recorded on this device, newest first. */
export function ActivityList({ items, limit, startIndex = 0 }: { items: ActivityItem[]; limit?: number; startIndex?: number }) {
  const { colors } = useTheme();
  const { accountName } = useLedger();
  const shown = limit ? items.slice(0, limit) : items;

  return (
    <View>
      {shown.map((item, i) => {
        const self = item.kind === 'self';
        const title = self
          ? `To ${accountName(item.toAccount)}`
          : `Paid to ${item.toName ?? shortId(item.toAccount)}`;
        return (
          <Enter key={item.idempotencyKey} index={startIndex + i}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/activity/${item.idempotencyKey}`)}
              android_ripple={{ color: colors.surface2 }}
              style={styles.activityRow}
            >
              {self ? (
                <View style={[styles.circle, { backgroundColor: colors.tonal }]}>
                  <Icon name="swap_horiz" color={colors.onTonal} />
                </View>
              ) : (
                <Avatar name={item.toName ?? '?'} seed={item.toAccount} size={44} />
              )}
              <View style={{ flex: 1 }}>
                <Txt numberOfLines={1}>{title}</Txt>
                <Txt variant="bodySm" color={colors.muted}>
                  {formatDay(item.createdAt)} · from {accountName(item.fromAccount)}
                </Txt>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Txt variant="label" color={item.status === 'COMPLETED' ? colors.ink : colors.muted}>
                  {`${self ? '' : '−'}${formatINR(item.amount)}`}
                </Txt>
                {item.status !== 'COMPLETED' ? <StatusBadge status={item.status} /> : null}
              </View>
            </Pressable>
          </Enter>
        );
      })}
    </View>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: Parameters<typeof Icon>[0]['name']; title: string; body?: string; action?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.empty, { backgroundColor: colors.surface }]}>
      <View style={[styles.circle, { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.tonal }]}>
        <Icon name={icon} size={28} color={colors.onTonal} />
      </View>
      <Txt variant="subtitle" style={{ marginTop: 12, textAlign: 'center' }}>
        {title}
      </Txt>
      {body ? (
        <Txt variant="bodySm" color={colors.muted} style={{ marginTop: 4, textAlign: 'center' }}>
          {body}
        </Txt>
      ) : null}
      {action ? <View style={{ marginTop: 16 }}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: 16, overflow: 'hidden' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  skeleton: { height: 24, width: 80, borderRadius: 6, marginTop: 10 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 12 },
  circle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  empty: { marginHorizontal: 20, borderRadius: 24, paddingHorizontal: 24, paddingVertical: 32, alignItems: 'center' },
});
