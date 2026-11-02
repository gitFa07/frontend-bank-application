import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLedger } from '@/context/ledger';
import { useTheme } from '@/context/theme';
import { EmptyState } from '@/components/LedgerItems';
import ResultBadge, { type BadgeTone } from '@/components/ResultBadge';
import { toast } from '@/components/Toast';
import { Button, Icon, StatusBadge, TopBar, Txt } from '@/components/ui';
import { transfer } from '@/lib/api';
import { copyText, formatDateTime, formatINR, shortId } from '@/lib/format';

const TONE: Record<string, BadgeTone> = { COMPLETED: 'success', PENDING: 'pending', FAILED: 'error', REVERSED: 'neutral' };

function Row({ label, value, mono, copy }: { label: string; value: string; mono?: boolean; copy?: boolean }) {
  const { colors } = useTheme();
  const content = (
    <Txt variant={mono ? 'caption' : 'bodySm'} mono={mono} style={{ textAlign: 'right' }}>
      {value}
    </Txt>
  );
  return (
    <View style={styles.row}>
      <Txt variant="bodySm" color={colors.muted}>
        {label}
      </Txt>
      {copy ? (
        <Pressable onPress={async () => (await copyText(value)) && toast(`${label} copied`)} style={styles.copy}>
          <View style={{ flexShrink: 1 }}>{content}</View>
          <Icon name="content_copy" size={16} color={colors.primary} />
        </Pressable>
      ) : (
        <View style={{ flexShrink: 1 }}>{content}</View>
      )}
    </View>
  );
}

/** Details of a payment from this phone's history (kit: "Payment"). */
export default function Receipt() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const ledger = useLedger();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [checking, setChecking] = useState(false);
  const item = ledger.activity.find((i) => i.idempotencyKey === key);

  if (!item) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <TopBar title="Payment" />
        <EmptyState icon="history" title="Payment not found" body="It may have been cleared from this phone." />
      </View>
    );
  }

  const isSelf = item.kind === 'self';
  const toLabel = isSelf ? ledger.accountName(item.toAccount) : (item.toName ?? shortId(item.toAccount));

  // Re-sending with the same idempotency key returns the stored transaction
  // rather than paying twice.
  const checkStatus = async () => {
    setChecking(true);
    try {
      const res = await transfer({
        fromAccount: item.fromAccount,
        toAccount: item.toAccount,
        amount: item.amount,
        idempotencyKey: item.idempotencyKey,
      });
      ledger.recordActivity({
        idempotencyKey: item.idempotencyKey,
        status: res.status,
        transactionId: res.transaction?._id ?? item.transactionId,
        message: res.status === 'COMPLETED' ? null : (res.message ?? null),
      });
      toast(res.status === 'COMPLETED' ? 'Payment completed' : (res.message ?? 'Still processing'));
    } catch (err) {
      toast((err as Error).message, { tone: 'error' });
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <View style={{ alignItems: 'center', paddingHorizontal: 24 }}>
          <ResultBadge tone={TONE[item.status] ?? 'neutral'} size={72} animate={false} />
          <Txt variant="display" style={{ fontSize: 40, lineHeight: 48, marginTop: -8 }}>
            {formatINR(item.amount)}
          </Txt>
          <Txt>{isSelf ? `Moved to ${toLabel}` : `Paid to ${toLabel}`}</Txt>
          <View style={{ marginTop: 8 }}>
            <StatusBadge status={item.status} />
          </View>
          {item.message ? (
            <Txt variant="bodySm" color={colors.muted} style={{ marginTop: 8, textAlign: 'center' }}>
              {item.message}
            </Txt>
          ) : null}
        </View>

        <View style={[styles.details, { backgroundColor: colors.surface }]}>
          <Row label="Date" value={formatDateTime(item.createdAt)} />
          <Row label="From" value={`${ledger.accountName(item.fromAccount)} ${shortId(item.fromAccount)}`} />
          <Row label="To account" value={item.toAccount} mono copy />
          {item.note ? <Row label="Note" value={item.note} /> : null}
          {item.transactionId ? <Row label="Transaction ID" value={item.transactionId} mono copy /> : null}
          <Row label="Reference" value={item.idempotencyKey} mono />
        </View>

        <View style={styles.actions}>
          {item.status === 'PENDING' ? (
            <Button icon="refresh" onPress={checkStatus} loading={checking}>
              Check status
            </Button>
          ) : null}
          {!isSelf ? (
            <Button variant={item.status === 'PENDING' ? 'outline' : 'filled'} onPress={() => router.push(`/pay?to=${item.toAccount}`)}>
              Pay again
            </Button>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  details: { marginHorizontal: 20, marginTop: 32, borderRadius: 24, paddingHorizontal: 20, paddingVertical: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, paddingVertical: 12 },
  copy: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, flexShrink: 1 },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 32, paddingHorizontal: 24 },
});
