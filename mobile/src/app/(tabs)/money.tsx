import { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLedger } from '@/context/ledger';
import { useTheme } from '@/context/theme';
import BottomSheet from '@/components/BottomSheet';
import BannerGradient from '@/components/Gradient';
import { AccountCard, ActivityList, EmptyState } from '@/components/LedgerItems';
import { toast } from '@/components/Toast';
import { Button, Enter, IconButton, ListRow, SectionHeader, StatusBadge, Txt } from '@/components/ui';
import type { Account } from '@/lib/api';
import { copyText, formatDateTime, formatINR } from '@/lib/format';

function AccountSheet({ account, open, onClose }: { account: Account | null; open: boolean; onClose: () => void }) {
  const ledger = useLedger();
  const { colors } = useTheme();
  const [checking, setChecking] = useState(false);
  if (!account) return null;

  const balance = ledger.balances[account._id];
  const go = (href: string) => {
    onClose();
    router.push(href as never);
  };

  const recheck = async () => {
    setChecking(true);
    await ledger.refreshBalances([account._id]);
    setChecking(false);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={ledger.accountName(account._id)}>
      <View style={{ paddingHorizontal: 24 }}>
        <Txt variant="bodySm" color={colors.muted}>
          Balance
        </Txt>
        <View style={styles.row}>
          <Txt variant="display" style={{ fontSize: 32 }}>
            {balance === undefined ? '…' : formatINR(balance)}
          </Txt>
          {checking ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <IconButton icon="refresh" label="Refresh balance" onPress={recheck} />
          )}
        </View>
        <View style={{ gap: 8, marginTop: 16 }}>
          {[
            ['Account ID', <Txt key="id" variant="bodySm" mono selectable>{account._id}</Txt>],
            ['Status', <StatusBadge key="s" status={account.status} />],
            ['Currency', <Txt key="c" variant="bodySm">{account.currency}</Txt>],
            ['Opened', <Txt key="o" variant="bodySm">{formatDateTime(account.createdAt)}</Txt>],
          ].map(([label, value]) => (
            <View key={label as string} style={styles.detail}>
              <Txt variant="bodySm" color={colors.muted} style={{ width: 96 }}>
                {label as string}
              </Txt>
              <View style={{ flex: 1, alignItems: 'flex-start' }}>{value}</View>
            </View>
          ))}
        </View>
      </View>
      <View style={[styles.divider, { borderColor: colors.line }]}>
        <ListRow icon="content_copy" title="Copy account ID" onPress={async () => (await copyText(account._id)) && toast('Account ID copied')} />
        <ListRow icon="qr_code" title="Show QR code" onPress={() => go(`/qr?account=${account._id}`)} />
        {account.status === 'ACTIVE' ? <ListRow icon="payments" title="Pay from this account" onPress={() => go(`/pay?from=${account._id}`)} /> : null}
      </View>
    </BottomSheet>
  );
}

export default function Money() {
  const ledger = useLedger();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // Kept after closing so the sheet keeps its content while it fades out.
  const [selected, setSelected] = useState<Account | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const openAccount = async () => {
    setCreating(true);
    try {
      await ledger.createAccount();
      toast('New account opened');
    } catch (err) {
      toast((err as Error).message, { tone: 'error' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={ledger.loading} onRefresh={ledger.refresh} colors={[colors.primary]} />}
    >
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <BannerGradient />
        <Enter index={0}>
          <Txt variant="headline">Money</Txt>
        </Enter>
        <Enter index={1}>
          <Txt variant="bodySm" color={colors.muted} style={{ marginTop: 24 }}>
            {`Total across ${ledger.accounts.length} ${ledger.accounts.length === 1 ? 'account' : 'accounts'}`}
          </Txt>
        </Enter>
        <Enter index={2}>
          <Txt variant="display" style={{ fontSize: 40, lineHeight: 48 }}>
            {ledger.balancesReady ? formatINR(ledger.totalBalance) : '…'}
          </Txt>
        </Enter>
      </View>

      <SectionHeader title="Accounts" index={3} />
      {ledger.error && ledger.accounts.length === 0 ? (
        <EmptyState
          icon="error"
          title="Couldn't load your accounts"
          body={ledger.error}
          action={
            <Button variant="tonal" onPress={ledger.refresh}>
              Try again
            </Button>
          }
        />
      ) : (
        <View style={{ gap: 12, paddingHorizontal: 16 }}>
          {ledger.accounts.map((a, i) => (
            <Enter key={a._id} index={4 + i}>
              <AccountCard
                account={a}
                onPress={() => {
                  setSelected(a);
                  setSheetOpen(true);
                }}
              />
            </Enter>
          ))}
          <Button variant="outline" onPress={openAccount} loading={creating} style={{ height: 48 }}>
            Open another account
          </Button>
        </View>
      )}

      <SectionHeader title="Transaction history" />
      <Txt variant="bodySm" color={colors.muted} style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        {"Payments sent from this phone. Money you receive isn't listed: the server doesn't share history yet."}
      </Txt>
      {ledger.activity.length === 0 ? (
        <EmptyState icon="history" title="No payments yet" body="Your payments will appear here." />
      ) : (
        <ActivityList items={ledger.activity} />
      )}

      <AccountSheet account={selected} open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { overflow: 'hidden', paddingHorizontal: 20, paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detail: { flexDirection: 'row', alignItems: 'flex-start' },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 16, paddingTop: 8 },
});
