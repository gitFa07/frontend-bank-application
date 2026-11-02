import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLedger } from '@/context/ledger';
import { useTheme } from '@/context/theme';
import BottomSheet from '@/components/BottomSheet';
import ResultBadge, { type BadgeTone } from '@/components/ResultBadge';
import { toast } from '@/components/Toast';
import { Avatar, Button, Enter, Icon, IconButton, TextField, TopBar, Txt } from '@/components/ui';
import { newIdempotencyKey, transfer, ApiError, type Transaction } from '@/lib/api';
import { recentRecipients } from '@/lib/activity';
import { copyText, extractAccountId, formatDateTime, formatINR, isAccountId, shortId } from '@/lib/format';

const AMOUNT_PATTERN = /^\d{0,7}(\.\d{0,2})?$/;

type Recipient = { accountId: string; name: string | null };
type Outcome = {
  status: 'COMPLETED' | 'PENDING' | 'REVERSED' | 'FAILED';
  message?: string;
  transaction?: Transaction | null;
  retrySameKey?: boolean;
};

// ---------------------------------------------------------------- recipient

function RecipientStep({ selfMode, onPick }: { selfMode: boolean; onPick: (r: Recipient) => void }) {
  const ledger = useLedger();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [accountId, setAccountId] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const people = recentRecipients(ledger.activity, ledger.ownIds);

  const paste = async () => {
    const text = (await Clipboard.getStringAsync()).trim();
    if (!text) return toast('Nothing to paste.');
    setAccountId(extractAccountId(text) ?? text);
    setError('');
  };

  const submit = () => {
    const id = accountId.trim();
    if (!isAccountId(id)) {
      setError('An account ID is 24 characters, using 0-9 and a-f');
      return;
    }
    onPick({ accountId: id.toLowerCase(), name: name.trim() || null });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title={selfMode ? 'Self transfer' : 'Pay to account'} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {selfMode ? (
          <>
            <Txt variant="bodySm" color={colors.muted} style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
              Choose the account to move money into.
            </Txt>
            {ledger.activeAccounts.map((a, i) => (
              <Enter key={a._id} index={i}>
                <Pressable
                  onPress={() => onPick({ accountId: a._id, name: ledger.accountName(a._id) })}
                  android_ripple={{ color: colors.surface2 }}
                  style={styles.pickRow}
                >
                  <Avatar account size={44} />
                  <View style={{ flex: 1 }}>
                    <Txt>{ledger.accountName(a._id)}</Txt>
                    <Txt variant="caption" mono color={colors.muted}>
                      {shortId(a._id)}
                    </Txt>
                  </View>
                  <Txt variant="bodySm" color={colors.muted}>
                    {formatINR(ledger.balances[a._id] ?? 0)}
                  </Txt>
                </Pressable>
              </Enter>
            ))}
          </>
        ) : (
          <View style={{ paddingHorizontal: 20, gap: 16, paddingTop: 8 }}>
            <Enter index={0}>
              <TextField
                label="Recipient account ID"
                value={accountId}
                onChangeText={(t) => {
                  setAccountId(t);
                  setError('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
                mono
                error={error}
                hint="Ask them for the ID on their QR code or profile"
                trailing={
                  <View style={{ flexDirection: 'row' }}>
                    <IconButton icon="content_paste" label="Paste" color={colors.muted} onPress={paste} />
                    <IconButton icon="qr_code_scanner" label="Scan QR code" color={colors.muted} onPress={() => router.replace('/scan')} />
                  </View>
                }
              />
            </Enter>
            <Enter index={1}>
              <TextField
                label="Name (optional)"
                value={name}
                onChangeText={setName}
                hint="Only saved on this phone, to recognise them later"
                onSubmitEditing={submit}
              />
            </Enter>
            <Enter index={2}>
              <Button onPress={submit} style={{ height: 52 }}>
                Continue
              </Button>
            </Enter>

            {people.length > 0 ? (
              <Enter index={3}>
                <Txt variant="subtitle" style={{ paddingTop: 16, paddingBottom: 4 }}>
                  Recent
                </Txt>
                {people.map((p) => (
                  <Pressable key={p.accountId} onPress={() => onPick(p)} style={[styles.pickRow, { paddingHorizontal: 0 }]}>
                    <Avatar name={p.name ?? '?'} seed={p.accountId} size={44} />
                    <View>
                      <Txt>{p.name ?? 'Unnamed'}</Txt>
                      <Txt variant="caption" mono color={colors.muted}>
                        {shortId(p.accountId)}
                      </Txt>
                    </View>
                  </Pressable>
                ))}
              </Enter>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------- amount

function AmountStep(props: {
  recipient: Recipient;
  fromId: string | null;
  setFromId: (id: string) => void;
  amount: string;
  setAmount: (a: string) => void;
  note: string;
  setNote: (n: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const { recipient, fromId, setFromId, amount, setAmount, note, setNote, onSubmit, onBack } = props;
  const ledger = useLedger();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(Boolean(note));
  const [error, setError] = useState('');
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  const isSelf = ledger.ownIds.has(recipient.accountId);
  const sources = ledger.activeAccounts.filter((a) => a._id !== recipient.accountId);
  const balance = fromId ? ledger.balances[fromId] : undefined;
  const value = Number(amount);

  const submit = () => {
    let problem = '';
    if (!fromId) problem = 'Open an active account to pay from';
    else if (!value || value <= 0) problem = 'Enter an amount';
    else if (balance !== undefined && value > balance) problem = `You only have ${formatINR(balance)} in this account`;
    setError(problem);
    if (problem) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      shakeX.set(
        withSequence(
          withTiming(-10, { duration: 50 }),
          withTiming(10, { duration: 80 }),
          withTiming(-6, { duration: 70 }),
          withTiming(0, { duration: 60 }),
        ),
      );
      return;
    }
    onSubmit();
  };

  const onAmountChange = (text: string) => {
    const next = text.replace(/,/g, '');
    if (AMOUNT_PATTERN.test(next)) {
      setAmount(next.replace(/^0+(?=\d)/, ''));
      setError('');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TopBar back="close" onBack={onBack} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.amountBody}>
        <Enter index={0}>{isSelf ? <Avatar account size={64} /> : <Avatar name={recipient.name ?? '?'} seed={recipient.accountId} size={64} />}</Enter>
        <Enter index={1}>
          <Txt variant="body" style={{ fontSize: 18, marginTop: 12, textAlign: 'center' }}>
            {isSelf ? `To ${ledger.accountName(recipient.accountId)}` : `Paying ${recipient.name ?? 'account'}`}
          </Txt>
        </Enter>
        <Enter index={2} style={styles.idLine}>
          <Icon name="account_balance" size={14} color={colors.muted} />
          <Txt variant="caption" mono color={colors.muted}>
            {recipient.accountId}
          </Txt>
        </Enter>

        <Animated.View style={[styles.amountRow, shakeStyle]}>
          <Txt variant="display" style={{ fontSize: 36 }}>
            ₹
          </Txt>
          <TextInput
            value={amount}
            onChangeText={onAmountChange}
            onSubmitEditing={submit}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.subtle}
            autoFocus
            accessibilityLabel="Amount in rupees"
            selectionColor={colors.primary}
            style={[styles.amountInput, { color: colors.ink }]}
          />
        </Animated.View>
        {amount ? (
          <Txt variant="caption" color={colors.muted}>
            {formatINR(value)}
          </Txt>
        ) : null}

        <View style={{ marginTop: 16 }}>
          {editingNote ? (
            <TextInput
              value={note}
              onChangeText={(t) => setNote(t.slice(0, 60))}
              placeholder="Add a note"
              placeholderTextColor={colors.subtle}
              accessibilityLabel="Note"
              autoFocus
              style={[styles.noteInput, { backgroundColor: colors.surface, color: colors.ink }]}
            />
          ) : (
            <Pressable onPress={() => setEditingNote(true)} style={[styles.noteChip, { backgroundColor: colors.surface }]}>
              <Icon name="edit_note" size={16} color={colors.muted} />
              <Txt variant="caption" color={colors.muted}>
                Add note
              </Txt>
            </Pressable>
          )}
        </View>

        {error ? (
          <Txt variant="bodySm" color={colors.danger} style={{ marginTop: 16, textAlign: 'center' }}>
            {error}
          </Txt>
        ) : null}
      </ScrollView>

      <View style={[styles.payBar, { paddingBottom: insets.bottom + 16, backgroundColor: colors.bg }]}>
        <Pressable
          onPress={() => setSheetOpen(true)}
          disabled={sources.length === 0}
          style={[styles.source, { backgroundColor: colors.surface, opacity: sources.length ? 1 : 0.6 }]}
        >
          <Avatar account size={36} />
          <View style={{ flex: 1 }}>
            <Txt variant="bodySm" numberOfLines={1}>
              {fromId ? `${ledger.accountName(fromId)} ${shortId(fromId)}` : 'No account to pay from'}
            </Txt>
            <Txt variant="caption" color={colors.muted}>
              {fromId ? `Balance ${balance === undefined ? '…' : formatINR(balance)}` : 'Open one on the Money tab'}
            </Txt>
          </View>
          <Icon name="expand_more" color={colors.muted} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Pay" onPress={submit} style={[styles.fab, { backgroundColor: colors.primary }]}>
          <Icon name="arrow_forward" size={28} color={colors.onPrimary} />
        </Pressable>
      </View>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Pay from">
        {sources.map((a) => (
          <Pressable
            key={a._id}
            onPress={() => {
              setFromId(a._id);
              setSheetOpen(false);
              setError('');
            }}
            android_ripple={{ color: colors.surface2 }}
            style={[styles.pickRow, { paddingHorizontal: 24 }]}
          >
            <Avatar account size={40} />
            <View style={{ flex: 1 }}>
              <Txt>{ledger.accountName(a._id)}</Txt>
              <Txt variant="caption" mono color={colors.muted}>
                {shortId(a._id)}
              </Txt>
            </View>
            <Txt variant="bodySm" color={colors.muted}>
              {formatINR(ledger.balances[a._id] ?? 0)}
            </Txt>
            {a._id === fromId ? <Icon name="check_circle" color={colors.primary} /> : null}
          </Pressable>
        ))}
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------- processing

// Mirrors the backend's steps, which take 5s or more.
const STAGES = ['Checking both accounts', 'Debiting your account', 'Crediting the receiver', 'Confirming with the ledger'];

function Packet({ delay }: { delay: number }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    p.set(withDelay(delay, withRepeat(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }), -1, false)));
  }, [p, delay, reduced]);
  const style = useAnimatedStyle(() => ({
    opacity: Math.sin(p.value * Math.PI),
    transform: [{ translateX: p.value * 120 }],
  }));
  return <Animated.View style={[styles.packet, { backgroundColor: colors.primary }, style]} />;
}

function ProcessingStep({ recipient, amount, fromId }: { recipient: Recipient; amount: number; fromId: string | null }) {
  const ledger = useLedger();
  const { colors } = useTheme();
  const [stage, setStage] = useState(0);
  const bar = useSharedValue(0);

  useEffect(() => {
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 1700);
    bar.set(withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, false));
    return () => clearInterval(t);
  }, [bar]);

  const barStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -90 + bar.value * 314 }] }));

  return (
    <View style={[styles.center, { backgroundColor: colors.bg }]} accessibilityState={{ busy: true }}>
      <Enter index={0} style={styles.transferRow}>
        <Avatar account size={56} />
        <View style={styles.packetLane}>
          {[0, 400, 800].map((d) => (
            <Packet key={d} delay={d} />
          ))}
        </View>
        {ledger.ownIds.has(recipient.accountId) ? <Avatar account size={56} /> : <Avatar name={recipient.name ?? '?'} seed={recipient.accountId} size={56} />}
      </Enter>
      <Enter index={1}>
        <Txt variant="display" style={{ fontSize: 40, lineHeight: 48, marginTop: 32 }}>
          {formatINR(amount)}
        </Txt>
      </Enter>
      <Enter index={2}>
        <Txt variant="bodySm" color={colors.muted}>
          {`${fromId ? ledger.accountName(fromId) : ''} → ${recipient.name ?? shortId(recipient.accountId)}`}
        </Txt>
      </Enter>
      <View style={[styles.track, { backgroundColor: colors.tonal }]}>
        <Animated.View style={[styles.trackBar, { backgroundColor: colors.primary }, barStyle]} />
      </View>
      <Txt style={{ marginTop: 16 }} accessibilityLiveRegion="polite">{`${STAGES[stage]}…`}</Txt>
      <Txt variant="caption" color={colors.muted} style={{ marginTop: 4 }}>
        Please keep this screen open.
      </Txt>
    </View>
  );
}

// ---------------------------------------------------------------- result

const RESULT_COPY: Record<Outcome['status'], { tone: BadgeTone; title: string }> = {
  COMPLETED: { tone: 'success', title: 'Payment successful' },
  PENDING: { tone: 'pending', title: 'Payment processing' },
  REVERSED: { tone: 'neutral', title: 'Payment reversed' },
  FAILED: { tone: 'error', title: 'Payment failed' },
};

function ResultStep(props: {
  result: Outcome;
  recipient: Recipient;
  amount: number;
  fromId: string | null;
  onRetry: () => void;
  onDone: () => void;
  onEdit: () => void;
}) {
  const { result, recipient, amount, fromId, onRetry, onDone, onEdit } = props;
  const ledger = useLedger();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { tone, title } = RESULT_COPY[result.status];
  const tx = result.transaction;

  useEffect(() => {
    Haptics.notificationAsync(
      result.status === 'COMPLETED'
        ? Haptics.NotificationFeedbackType.Success
        : result.status === 'FAILED'
          ? Haptics.NotificationFeedbackType.Error
          : Haptics.NotificationFeedbackType.Warning,
    );
  }, [result.status]);

  const share = () =>
    Share.share({
      message: `Paid ${formatINR(amount)} to ${recipient.name ?? recipient.accountId} via Ledger Pay. Transaction ID: ${tx?._id}`,
    });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar back="close" onBack={onDone} />
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 24 }}>
        <ResultBadge tone={tone} size={96} />
        <Enter index={6}>
          <Txt variant="display" style={{ fontSize: 40, lineHeight: 48, marginTop: -8, textAlign: 'center' }}>
            {formatINR(amount)}
          </Txt>
          <Txt style={{ fontSize: 18, textAlign: 'center' }}>{title}</Txt>
          <Txt variant="bodySm" color={colors.muted} style={{ marginTop: 4, textAlign: 'center' }}>
            {result.status === 'COMPLETED'
              ? `Paid to ${recipient.name ?? shortId(recipient.accountId)} from ${fromId ? ledger.accountName(fromId) : ''}`
              : (result.message ?? '')}
          </Txt>
          {tx?.createdAt ? (
            <Txt variant="caption" color={colors.muted} style={{ marginTop: 4, textAlign: 'center' }}>
              {formatDateTime(tx.createdAt)}
            </Txt>
          ) : null}
        </Enter>
        {tx?._id ? (
          <Enter index={8}>
            <Pressable
              onPress={async () => (await copyText(tx._id)) && toast('Transaction ID copied')}
              style={[styles.txChip, { backgroundColor: colors.surface }]}
            >
              <View>
                <Txt variant="caption" color={colors.muted}>
                  Transaction ID
                </Txt>
                <Txt variant="caption" mono>
                  {tx._id}
                </Txt>
              </View>
              <Icon name="content_copy" size={18} color={colors.primary} />
            </Pressable>
          </Enter>
        ) : null}
      </ScrollView>

      <View style={[styles.resultActions, { paddingBottom: insets.bottom + 24 }]}>
        {result.status === 'COMPLETED' ? (
          <>
            <Button variant="outline" icon="share" onPress={share}>
              Share
            </Button>
            <Button onPress={onDone}>Done</Button>
          </>
        ) : result.status === 'PENDING' ? (
          <>
            <Button variant="outline" onPress={onDone}>
              Close
            </Button>
            <Button icon="refresh" onPress={onRetry}>
              Check status
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onPress={onDone}>
              Close
            </Button>
            <Button onPress={result.retrySameKey ? onRetry : onEdit}>{result.retrySameKey ? 'Retry' : 'Try again'}</Button>
          </>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- flow

export default function Pay() {
  const ledger = useLedger();
  const params = useLocalSearchParams<{ to?: string; from?: string; mode?: string }>();
  const selfMode = params.mode === 'self';
  const initialTo = params.to && isAccountId(params.to) ? params.to.toLowerCase() : null;
  const knownName = initialTo ? (ledger.activity.find((i) => i.toAccount === initialTo && i.toName)?.toName ?? null) : null;

  const [step, setStep] = useState<'recipient' | 'amount' | 'processing' | 'result'>(initialTo ? 'amount' : 'recipient');
  const [recipient, setRecipient] = useState<Recipient | null>(initialTo ? { accountId: initialTo, name: knownName } : null);
  const [chosenFromId, setFromId] = useState<string | null>(params.from ?? null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [result, setResult] = useState<Outcome | null>(null);
  const keyRef = useRef<string | null>(null);

  // The user's pick if it's still a valid source, else the active account with the most money.
  const sources = ledger.activeAccounts.filter((a) => a._id !== recipient?.accountId);
  const fromId = sources.some((a) => a._id === chosenFromId)
    ? chosenFromId
    : ([...sources].sort((a, b) => (ledger.balances[b._id] ?? 0) - (ledger.balances[a._id] ?? 0))[0]?._id ?? null);

  // Don't let the hardware back button leave mid-transfer.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => step === 'processing');
    return () => sub.remove();
  }, [step]);

  const run = useCallback(
    async ({ reuseKey }: { reuseKey: boolean }) => {
      if (!recipient || !fromId) return;
      if (!reuseKey || !keyRef.current) keyRef.current = newIdempotencyKey();
      const idempotencyKey = keyRef.current;
      const value = Number(amount);
      const kind = ledger.ownIds.has(recipient.accountId) ? 'self' : 'payment';
      const base = {
        idempotencyKey,
        kind,
        fromAccount: fromId,
        toAccount: recipient.accountId,
        toName: kind === 'self' ? null : recipient.name,
        amount: value,
        note: note.trim() || null,
        createdAt: new Date().toISOString(),
      } as const;

      setStep('processing');
      ledger.recordActivity({ ...base, status: 'PENDING' });

      let outcome: Outcome;
      try {
        outcome = await transfer({ fromAccount: fromId, toAccount: recipient.accountId, amount: value, idempotencyKey });
      } catch (err) {
        // No answer at all: the payment may have gone through, so retry with the same key.
        // Any answer: the server rejected it, so the next attempt gets a fresh key.
        outcome = { status: 'FAILED', message: (err as Error).message, retrySameKey: err instanceof ApiError && err.isNetwork };
      }

      ledger.recordActivity({
        ...base,
        status: outcome.status,
        transactionId: outcome.transaction?._id ?? null,
        message: outcome.status === 'COMPLETED' ? null : (outcome.message ?? null),
      });
      if (outcome.status === 'COMPLETED') {
        ledger.refreshBalances([fromId, recipient.accountId].filter((id) => ledger.ownIds.has(id)));
      }
      setResult(outcome);
      setStep('result');
    },
    [amount, fromId, note, recipient, ledger],
  );

  if (step === 'recipient' || !recipient) {
    return (
      <RecipientStep
        selfMode={selfMode}
        onPick={(r) => {
          setRecipient(r);
          setStep('amount');
        }}
      />
    );
  }

  if (step === 'amount') {
    return (
      <AmountStep
        recipient={recipient}
        fromId={fromId}
        setFromId={setFromId}
        amount={amount}
        setAmount={setAmount}
        note={note}
        setNote={setNote}
        onSubmit={() => run({ reuseKey: false })}
        onBack={() => (initialTo ? router.back() : setStep('recipient'))}
      />
    );
  }

  if (step === 'processing' || !result) return <ProcessingStep recipient={recipient} amount={Number(amount)} fromId={fromId} />;

  return (
    <ResultStep
      result={result}
      recipient={recipient}
      amount={Number(amount)}
      fromId={fromId}
      onRetry={() => run({ reuseKey: true })}
      onEdit={() => setStep('amount')}
      onDone={() => router.dismissTo('/')}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 12 },
  amountBody: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 },
  idLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 32 },
  amountInput: { fontSize: 56, minWidth: 40, padding: 0 },
  noteInput: { width: 224, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, textAlign: 'center', fontSize: 14 },
  noteChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  payBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8 },
  source: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  fab: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  transferRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  packetLane: { width: 128, height: 8 },
  packet: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  track: { width: 224, height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 40 },
  trackBar: { width: 90, height: 4, borderRadius: 2 },
  txChip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginTop: 24 },
  resultActions: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingHorizontal: 24, paddingTop: 16 },
});
