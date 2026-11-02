import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth';
import { useLedger } from '@/context/ledger';
import { useTheme } from '@/context/theme';
import CoinScene from '@/components/CoinScene';
import BannerGradient from '@/components/Gradient';
import { AccountCard, ActivityList, EmptyState } from '@/components/LedgerItems';
import { toast } from '@/components/Toast';
import { Avatar, Button, Enter, FeatureTile, Icon, ListRow, SectionHeader, Txt } from '@/components/ui';
import { recentRecipients } from '@/lib/activity';
import { copyText, formatINR, shortId } from '@/lib/format';
import { getJSON, setJSON } from '@/lib/storage';

const HIDE_BALANCE_KEY = 'ledger.hideBalance';

export default function Home() {
  const { user } = useAuth();
  const ledger = useLedger();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [hidden, setHidden] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    getJSON(HIDE_BALANCE_KEY, false).then(setHidden);
  }, []);

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const primary = ledger.activeAccounts[0];
  const people = recentRecipients(ledger.activity, ledger.ownIds).slice(0, 6);

  const toggleHidden = () => {
    setJSON(HIDE_BALANCE_KEY, !hidden);
    setHidden(!hidden);
  };

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

  const selfTransfer = () => {
    if (ledger.activeAccounts.length < 2) {
      toast('Open a second account to move money between your own accounts.');
      return;
    }
    router.push('/pay?mode=self');
  };

  const copyPrimaryId = async () => {
    if (primary && (await copyText(primary._id))) toast('Account ID copied');
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={ledger.loading} onRefresh={ledger.refresh} colors={[colors.primary]} />}
    >
      {/* Search bar, profile and banner share one gradient, as in the kit's homepage. */}
      <View style={[styles.banner, { paddingTop: insets.top + 12 }]}>
        <BannerGradient />
        <CoinScene variant="banner" style={styles.coins} />

        <View style={styles.searchRow}>
          <Pressable
            accessibilityRole="search"
            onPress={() => router.push('/pay')}
            style={[styles.search, { backgroundColor: colors.bg }]}
          >
            <Icon name="search" color={colors.muted} />
            <Txt color={colors.muted}>Pay by account ID</Txt>
          </Pressable>
          <Pressable accessibilityLabel="Your profile" onPress={() => router.navigate('/you')}>
            <Avatar name={user?.name} seed={user?._id} size={40} />
          </Pressable>
        </View>

        <View style={styles.bannerText}>
          <Enter index={0}>
            <Txt variant="headline" style={{ fontSize: 24, lineHeight: 32 }}>
              {`Hi ${firstName},\nyour money, simply.`}
            </Txt>
          </Enter>
          <Enter index={1} style={[styles.row, { marginTop: 16 }]}>
            <Txt variant="bodySm" color={colors.muted}>
              Total balance
            </Txt>
            <Pressable accessibilityLabel={hidden ? 'Show balance' : 'Hide balance'} hitSlop={10} onPress={toggleHidden}>
              <Icon name={hidden ? 'visibility' : 'visibility_off'} size={20} color={colors.muted} />
            </Pressable>
          </Enter>
          <Enter index={2}>
            <Txt variant="display" style={{ fontSize: 32 }}>
              {hidden ? '₹ ••••••' : ledger.balancesReady ? formatINR(ledger.totalBalance) : '…'}
            </Txt>
          </Enter>
          <Enter index={3}>
            <Pressable onPress={() => router.push('/pay')} style={[styles.row, { marginTop: 8 }]}>
              <Txt variant="label" color={colors.primary}>
                Pay now
              </Txt>
              <View style={[styles.arrow, { backgroundColor: colors.primary }]}>
                <Icon name="arrow_forward" size={18} color={colors.onPrimary} />
              </View>
            </Pressable>
          </Enter>
        </View>
      </View>

      <Enter index={4} style={styles.tiles}>
        <FeatureTile icon="qr_code_scanner" label="Scan QR code" onPress={() => router.push('/scan')} />
        <FeatureTile icon="payments" label="Pay account" onPress={() => router.push('/pay')} />
        <FeatureTile icon="swap_horiz" label="Self transfer" onPress={selfTransfer} />
        <FeatureTile icon="qr_code" label="Your QR" onPress={() => router.push('/qr')} />
      </Enter>

      <Enter index={5}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Pressable onPress={copyPrimaryId} disabled={!primary} style={[styles.chip, { borderColor: colors.line, opacity: primary ? 1 : 0.5 }]}>
            <Icon name="content_copy" size={20} color={colors.primary} />
            <View>
              <Txt variant="caption" color={colors.muted}>
                Your account ID
              </Txt>
              <Txt variant="caption" mono>
                {primary ? shortId(primary._id) : 'No account yet'}
              </Txt>
            </View>
          </Pressable>
          <Pressable onPress={() => router.navigate('/money')} style={[styles.chip, { borderColor: colors.line }]}>
            <Icon name="account_balance_wallet" size={20} color={colors.primary} />
            <View>
              <Txt variant="caption" color={colors.muted}>
                Accounts
              </Txt>
              <Txt variant="caption">{`${ledger.accounts.length} open`}</Txt>
            </View>
          </Pressable>
        </ScrollView>
      </Enter>

      <SectionHeader title="People" index={6} />
      <Enter index={7} style={styles.people}>
        <Pressable onPress={selfTransfer} style={styles.person}>
          <View style={[styles.personIcon, { backgroundColor: colors.tonal }]}>
            <Icon name="swap_horiz" color={colors.onTonal} />
          </View>
          <Txt variant="caption">Self transfer</Txt>
        </Pressable>
        {people.map((p) => (
          <Pressable key={p.accountId} onPress={() => router.push(`/pay?to=${p.accountId}`)} style={styles.person}>
            <Avatar name={p.name ?? '?'} seed={p.accountId} size={56} />
            <Txt variant="caption" numberOfLines={1}>
              {p.name ?? shortId(p.accountId)}
            </Txt>
          </Pressable>
        ))}
        <Pressable onPress={() => router.push('/pay')} style={styles.person}>
          <View style={[styles.personIcon, { borderWidth: 1, borderColor: colors.line }]}>
            <Icon name="add" color={colors.primary} />
          </View>
          <Txt variant="caption">New payment</Txt>
        </Pressable>
      </Enter>
      {people.length === 0 ? (
        <Txt variant="bodySm" color={colors.muted} style={{ paddingHorizontal: 20, paddingTop: 4 }}>
          People you pay from this phone will show up here.
        </Txt>
      ) : null}

      <SectionHeader title="Your accounts" action="Manage" onAction={() => router.navigate('/money')} index={8} />
      {ledger.accounts.length === 0 ? (
        ledger.loading ? (
          <View style={[styles.row, { paddingHorizontal: 16, gap: 12 }]}>
            {[0, 1].map((i) => (
              <View key={i} style={[styles.cardSkeleton, { backgroundColor: colors.surface }]} />
            ))}
          </View>
        ) : (
          <EmptyState
            icon="account_balance"
            title={ledger.error ? "Couldn't load your accounts" : 'Open your first account'}
            body={ledger.error ?? 'You need an account to send and receive money.'}
            action={
              ledger.error ? (
                <Button variant="tonal" onPress={ledger.refresh}>
                  Try again
                </Button>
              ) : (
                <Button onPress={openAccount} loading={creating}>
                  Open account
                </Button>
              )
            }
          />
        )
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
          {ledger.accounts.map((a) => (
            <AccountCard key={a._id} account={a} compact onPress={() => router.push(`/qr?account=${a._id}`)} />
          ))}
          <Pressable
            onPress={openAccount}
            disabled={creating}
            style={[styles.addCard, { borderColor: colors.line, opacity: creating ? 0.5 : 1 }]}
          >
            <Icon name="add" size={28} color={colors.primary} />
            <Txt variant="label" color={colors.primary}>
              {creating ? 'Opening…' : 'Open account'}
            </Txt>
          </Pressable>
        </ScrollView>
      )}
      {ledger.balancesReady && ledger.accounts.length > 0 && ledger.totalBalance === 0 ? (
        <View style={[styles.note, { backgroundColor: colors.warnTonal }]}>
          <Txt variant="bodySm">New accounts start at ₹0. Share your QR code or account ID so someone can send you money.</Txt>
        </View>
      ) : null}

      {ledger.activity.length > 0 ? (
        <>
          <SectionHeader title="Recent activity" action="See all" onAction={() => router.navigate('/money')} />
          <ActivityList items={ledger.activity} limit={3} />
        </>
      ) : null}

      <SectionHeader title="Manage your money" />
      <ListRow icon="history" title="See transaction history" onPress={() => router.navigate('/money')} />
      <ListRow icon="account_balance" title="Check account balance" onPress={() => router.navigate('/money')} />
      <ListRow icon="qr_code" title="Receive money with your QR" onPress={() => router.push('/qr')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  banner: { overflow: 'hidden', paddingBottom: 24 },
  coins: { position: 'absolute', right: 0, top: 72, bottom: 0, width: '50%' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  search: { flex: 1, height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, elevation: 1 },
  bannerText: { paddingHorizontal: 20, paddingTop: 28, maxWidth: '62%' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  arrow: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tiles: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 24 },
  chips: { paddingHorizontal: 16, gap: 12, paddingTop: 20 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  people: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, rowGap: 20 },
  person: { width: '25%', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  personIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  cardSkeleton: { width: 176, height: 160, borderRadius: 24 },
  addCard: { width: 144, borderRadius: 24, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8 },
  note: { marginHorizontal: 20, marginTop: 12, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
});
