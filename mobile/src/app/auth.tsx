import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/context/theme';
import CoinScene from '@/components/CoinScene';
import BannerGradient from '@/components/Gradient';
import { Button, Enter, Icon, IconButton, TextField, Txt } from '@/components/ui';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type Mode = 'login' | 'register';
type Form = { name: string; email: string; password: string };

// Mirrors the backend's Mongoose rules, whose failures otherwise surface as a bare 500.
function validate(mode: Mode, { name, email, password }: Form) {
  const errors: Partial<Form> = {};
  if (mode === 'register' && !name.trim()) errors.name = 'Enter your name';
  if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address';
  if (mode === 'register' && password.length < 6) errors.password = 'Use at least 6 characters';
  if (mode === 'login' && !password) errors.password = 'Enter your password';
  return errors;
}

export default function AuthScreen() {
  const { login, register } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('login');
  const [form, setForm] = useState<Form>({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Partial<Form>>({});
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [slow, setSlow] = useState(false);

  // Render's free tier sleeps; say so if the first request is slow.
  useEffect(() => {
    if (!submitting) return;
    const t = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(t);
  }, [submitting]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrors({});
    setServerError('');
  };

  const update = (field: keyof Form) => (value: string) => setForm((f) => ({ ...f, [field]: value }));

  const submit = async () => {
    const found = validate(mode, form);
    setErrors(found);
    setServerError('');
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      const payload = { email: form.email.trim(), password: form.password };
      if (mode === 'register') await register({ ...payload, name: form.name.trim() });
      else await login(payload);
      // The root Stack's protected routes take over from here.
    } catch (err) {
      setServerError((err as Error).message);
      setSubmitting(false);
      setSlow(false);
    }
  };

  const isRegister = mode === 'register';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}>
        <View style={[styles.hero, { paddingTop: insets.top }]}>
          <BannerGradient />
          <CoinScene variant="hero" style={StyleSheet.absoluteFill} />
        </View>

        <View style={styles.body}>
          <Enter index={0}>
            <Txt variant="headline">{isRegister ? 'Create your account' : 'Welcome back'}</Txt>
            <Txt variant="bodySm" color={colors.muted} style={{ marginTop: 4 }}>
              {isRegister ? 'Open a ledger account and start sending money.' : 'Sign in to Ledger Pay to continue.'}
            </Txt>
          </Enter>

          <Enter index={1} style={[styles.segmented, { backgroundColor: colors.surface }]}>
            {(['login', 'register'] as const).map((m) => (
              <Pressable
                key={m}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === m }}
                onPress={() => switchMode(m)}
                style={[styles.segment, mode === m && { backgroundColor: colors.tonal }]}
              >
                <Txt variant="label" color={mode === m ? colors.onTonal : colors.muted}>
                  {m === 'login' ? 'Sign in' : 'Create account'}
                </Txt>
              </Pressable>
            ))}
          </Enter>

          <View style={{ gap: 16, marginTop: 24 }}>
            {isRegister ? (
              <Enter index={2}>
                <TextField label="Full name" autoComplete="name" textContentType="name" value={form.name} onChangeText={update('name')} error={errors.name} />
              </Enter>
            ) : null}
            <Enter index={3}>
              <TextField
                label="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                value={form.email}
                onChangeText={update('email')}
                error={errors.email}
              />
            </Enter>
            <Enter index={4}>
              <TextField
                label="Password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                textContentType={isRegister ? 'newPassword' : 'password'}
                value={form.password}
                onChangeText={update('password')}
                onSubmitEditing={submit}
                returnKeyType="go"
                error={errors.password}
                hint={isRegister ? 'At least 6 characters' : undefined}
                trailing={
                  <IconButton
                    icon={showPassword ? 'visibility_off' : 'visibility'}
                    label={showPassword ? 'Hide password' : 'Show password'}
                    color={colors.muted}
                    onPress={() => setShowPassword((s) => !s)}
                  />
                }
              />
            </Enter>

            {serverError ? (
              <View accessibilityRole="alert" style={[styles.alert, { backgroundColor: colors.dangerTonal }]}>
                <Icon name="error" size={20} color={colors.danger} />
                <Txt variant="bodySm" style={{ flex: 1 }}>
                  {serverError}
                </Txt>
              </View>
            ) : null}

            <Enter index={5}>
              <Button onPress={submit} loading={submitting} style={{ height: 52, marginTop: 8 }}>
                {isRegister ? 'Create account' : 'Sign in'}
              </Button>
            </Enter>
            {slow ? (
              <Txt variant="caption" color={colors.muted} style={{ textAlign: 'center' }}>
                Waking up the server, this can take up to a minute…
              </Txt>
            ) : null}
          </View>

          <View style={styles.footer}>
            <Icon name="lock" size={16} color={colors.subtle} />
            <Txt variant="caption" color={colors.subtle}>
              Secured with JWT and an immutable ledger
            </Txt>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { height: 280, overflow: 'hidden', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  segmented: { flexDirection: 'row', borderRadius: 999, padding: 4, marginTop: 24 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 999 },
  alert: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', borderRadius: 12, padding: 12 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 'auto', paddingTop: 32 },
});
