import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth';
import { useLedger } from '@/context/ledger';
import { useTheme } from '@/context/theme';
import { EmptyState } from '@/components/LedgerItems';
import { toast } from '@/components/Toast';
import { Avatar, Button, Enter, Icon, TopBar, Txt } from '@/components/ui';
import { copyText, shortId } from '@/lib/format';

/** Kit: "QR Screen". The code holds the plain account ID so it can also be pasted. */
export default function MyQR() {
  const { user } = useAuth();
  const ledger = useLedger();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { account: selectedId } = useLocalSearchParams<{ account?: string }>();
  const account = ledger.accounts.find((a) => a._id === selectedId) ?? ledger.accounts[0];

  const copy = async () => {
    if (account && (await copyText(account._id))) toast('Account ID copied');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title="Your QR code" />
      {!account ? (
        <EmptyState icon="qr_code" title="No account yet" body="Open an account on the Money tab to get a QR code." />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}>
          {ledger.accounts.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
              {ledger.accounts.map((a) => {
                const active = a._id === account._id;
                return (
                  <Pressable
                    key={a._id}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    onPress={() => router.setParams({ account: a._id })}
                    style={[styles.filter, active ? { backgroundColor: colors.tonal, borderColor: colors.tonal } : { borderColor: colors.line }]}
                  >
                    <Txt variant="bodySm" color={active ? colors.onTonal : colors.muted}>
                      {ledger.accountName(a._id)}
                    </Txt>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          <Enter index={0} style={[styles.card, { backgroundColor: colors.surface }]}>
            <Avatar name={user?.name} seed={user?._id} size={56} />
            <Txt variant="title" style={{ marginTop: 12 }}>
              {user?.name ?? ''}
            </Txt>
            <Txt variant="bodySm" color={colors.muted}>
              {`${ledger.accountName(account._id)} · ${shortId(account._id)}`}
            </Txt>
            {/* Dark on white in both themes so every scanner can read it. */}
            <View style={styles.qr}>
              <QRCode value={account._id} size={208} color="#000000" backgroundColor="#ffffff" ecl="M" />
            </View>
            <Txt variant="bodySm" color={colors.muted} style={{ marginTop: 20 }}>
              Scan to pay with Ledger Pay
            </Txt>
            <Pressable onPress={copy} style={styles.idRow}>
              <Txt variant="caption" mono numberOfLines={1}>
                {account._id}
              </Txt>
              <Icon name="content_copy" size={16} color={colors.primary} />
            </Pressable>
          </Enter>

          <Enter index={1} style={styles.actions}>
            <Button variant="outline" icon="share" onPress={() => Share.share({ message: `Pay me on Ledger Pay. My account ID: ${account._id}` })}>
              Share
            </Button>
            <Button icon="content_copy" onPress={copy}>
              Copy ID
            </Button>
          </Enter>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  filter: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  card: { borderRadius: 28, alignItems: 'center', paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 },
  qr: { marginTop: 24, padding: 16, borderRadius: 24, backgroundColor: '#ffffff' },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, maxWidth: '100%', paddingHorizontal: 8, paddingVertical: 4 },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 24 },
});
