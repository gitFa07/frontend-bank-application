import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth';
import { useLedger } from '@/context/ledger';
import { useTheme, type ThemePreference } from '@/context/theme';
import BottomSheet from '@/components/BottomSheet';
import BannerGradient from '@/components/Gradient';
import { toast } from '@/components/Toast';
import { Avatar, Button, Enter, Icon, ListRow, Txt } from '@/components/ui';
import { copyText, formatINR } from '@/lib/format';

const THEMES = [
  { value: 'system', label: 'System default', icon: 'contrast' },
  { value: 'light', label: 'Light', icon: 'light_mode' },
  { value: 'dark', label: 'Dark', icon: 'dark_mode' },
] as const;

type Sheet = 'theme' | 'clear' | 'logout';

export default function You() {
  const { user, logout } = useAuth();
  const ledger = useLedger();
  const { colors, preference, setPreference } = useTheme();
  const insets = useSafeAreaInsets();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [lastSheet, setLastSheet] = useState<Sheet>('theme');
  const [signingOut, setSigningOut] = useState(false);

  const primary = ledger.accounts[0];

  const openSheet = (name: Sheet) => {
    setLastSheet(name);
    setSheet(name);
  };

  const chooseTheme = (value: ThemePreference) => {
    setPreference(value);
    setSheet(null);
  };

  const signOut = async () => {
    setSigningOut(true);
    setSheet(null);
    await logout(); // the protected routes send us back to the sign-in screen
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={[styles.header, { paddingTop: insets.top + 32 }]}>
        <BannerGradient />
        <View style={styles.headerRow}>
          <Enter index={0} style={{ flex: 1 }}>
            <Txt variant="headline" numberOfLines={1} style={{ fontSize: 30, lineHeight: 38 }}>
              {user?.name ?? ''}
            </Txt>
            <View style={[styles.row, { marginTop: 4 }]}>
              <Icon name="mail" size={18} color={colors.muted} />
              <Txt variant="bodySm" color={colors.muted} numberOfLines={1}>
                {user?.email ?? ''}
              </Txt>
            </View>
          </Enter>
          <Pressable accessibilityLabel="Your QR code" onPress={() => router.push('/qr')}>
            <View style={[styles.avatarRing, { borderColor: colors.bg }]}>
              <Avatar name={user?.name} seed={user?._id} size={72} />
            </View>
            <View style={[styles.qrBadge, { backgroundColor: colors.bg }]}>
              <Icon name="qr_code" size={18} />
            </View>
          </Pressable>
        </View>

        {primary ? (
          <Enter index={1}>
            <Pressable
              onPress={async () => (await copyText(primary._id)) && toast('Account ID copied')}
              style={[styles.idCard, { backgroundColor: colors.bg }]}
            >
              <View style={{ flex: 1 }}>
                <Txt variant="caption" color={colors.muted}>
                  Primary account ID
                </Txt>
                <Txt variant="bodySm" mono numberOfLines={1}>
                  {primary._id}
                </Txt>
              </View>
              <Icon name="content_copy" color={colors.primary} />
            </Pressable>
          </Enter>
        ) : null}
      </View>

      <Enter index={2} style={styles.stats}>
        <View style={[styles.stat, { backgroundColor: colors.warnTonal }]}>
          <Txt variant="title">{String(ledger.accounts.length)}</Txt>
          <Txt variant="caption" color={colors.muted}>
            {ledger.accounts.length === 1 ? 'Account open' : 'Accounts open'}
          </Txt>
        </View>
        <View style={[styles.stat, { backgroundColor: colors.tonal }]}>
          <Txt variant="title" color={colors.onTonal} numberOfLines={1}>
            {ledger.balancesReady ? formatINR(ledger.totalBalance) : '…'}
          </Txt>
          <Txt variant="caption" color={colors.onTonal}>
            Total balance
          </Txt>
        </View>
      </Enter>

      <Enter index={3} style={{ paddingTop: 12 }}>
        <ListRow icon="qr_code" title="Your QR code" subtitle="Use it to receive money" onPress={() => router.push('/qr')} />
        <ListRow icon="payments" title="Pay to an account" subtitle="Send money with an account ID" onPress={() => router.push('/pay')} />
        <ListRow icon="account_balance" title="Accounts" subtitle={`${ledger.accounts.length} open`} onPress={() => router.navigate('/money')} />
        <ListRow icon="contrast" title="Theme" subtitle={THEMES.find((t) => t.value === preference)?.label} onPress={() => openSheet('theme')} />
        <ListRow icon="delete" title="Clear payment history" subtitle="Removes the history saved on this phone" onPress={() => openSheet('clear')} />
        <ListRow icon="logout" title="Sign out" danger onPress={() => openSheet('logout')} />
      </Enter>

      <BottomSheet
        open={sheet !== null}
        onClose={() => setSheet(null)}
        title={{ theme: 'Theme', clear: 'Clear payment history?', logout: 'Sign out?' }[lastSheet]}
      >
        {lastSheet === 'theme' ? (
          <View accessibilityRole="radiogroup">
            {THEMES.map((t) => (
              <Pressable
                key={t.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: preference === t.value }}
                onPress={() => chooseTheme(t.value)}
                android_ripple={{ color: colors.surface2 }}
                style={styles.option}
              >
                <Icon name={t.icon} color={colors.primary} />
                <Txt style={{ flex: 1 }}>{t.label}</Txt>
                {preference === t.value ? <Icon name="check" color={colors.primary} /> : null}
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={{ paddingHorizontal: 24 }}>
            <Txt variant="bodySm" color={colors.muted}>
              {lastSheet === 'clear'
                ? 'Your payments stay on the ledger. Only the list saved on this phone is removed.'
                : "You'll need your email and password to sign back in."}
            </Txt>
            <View style={styles.actions}>
              <Button variant="text" onPress={() => setSheet(null)}>
                Cancel
              </Button>
              {lastSheet === 'clear' ? (
                <Button
                  onPress={() => {
                    ledger.clearHistory();
                    setSheet(null);
                    toast('Payment history cleared');
                  }}
                >
                  Clear
                </Button>
              ) : (
                <Button onPress={signOut} loading={signingOut}>
                  Sign out
                </Button>
              )}
            </View>
          </View>
        )}
      </BottomSheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { overflow: 'hidden', paddingHorizontal: 20, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatarRing: { borderWidth: 4, borderRadius: 44 },
  qrBadge: { position: 'absolute', right: -2, bottom: -2, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  idCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginTop: 20, opacity: 0.92 },
  stats: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 16 },
  stat: { flex: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 24, paddingVertical: 14 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 24 },
});
