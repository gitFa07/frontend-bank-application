import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/theme';
import { avatarColor, initials } from '@/lib/format';
import type { AccountStatus, TransactionStatus } from '@/lib/api';

// ---------------------------------------------------------------- icons & text

type MaterialName = NonNullable<Exclude<SymbolViewProps['name'], string>['android']>;

/** Material Symbol (Android/web). Names match the web app's icon font. */
export function Icon({ name, size = 24, color }: { name: MaterialName; size?: number; color?: string }) {
  const { colors } = useTheme();
  return <SymbolView name={{ android: name, web: name }} size={size} tintColor={color ?? colors.ink} />;
}

const TYPE: Record<string, TextStyle> = {
  display: { fontSize: 36, lineHeight: 44 },
  headline: { fontSize: 28, lineHeight: 36 },
  title: { fontSize: 22, lineHeight: 28 },
  subtitle: { fontSize: 16, lineHeight: 24, fontWeight: '500' },
  body: { fontSize: 16, lineHeight: 24 },
  bodySm: { fontSize: 14, lineHeight: 20 },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  caption: { fontSize: 12, lineHeight: 16 },
};

export function Txt({
  variant = 'body',
  color,
  mono,
  style,
  children,
  ...props
}: Omit<TextProps, 'style' | 'children'> & {
  variant?: keyof typeof TYPE;
  color?: string;
  mono?: boolean;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Text
      style={[TYPE[variant], { color: color ?? colors.ink }, mono && { fontFamily: 'monospace' }, style]}
      {...props}
    >
      {children}
    </Text>
  );
}

/** Staggered fade-up entrance, the native counterpart of the web app's GSAP page enter. */
export function Enter({ index = 0, style, children }: { index?: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 45).duration(450)} style={style}>
      {children}
    </Animated.View>
  );
}

// ---------------------------------------------------------------- buttons

type ButtonVariant = 'filled' | 'tonal' | 'outline' | 'text';

export function Button({
  variant = 'filled',
  loading = false,
  disabled,
  icon,
  children,
  style,
  ...props
}: Omit<PressableProps, 'children' | 'style'> & {
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: MaterialName;
  children: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const look = {
    filled: { bg: colors.primary, fg: colors.onPrimary, border: 'transparent' },
    tonal: { bg: colors.tonal, fg: colors.onTonal, border: 'transparent' },
    outline: { bg: 'transparent', fg: colors.primary, border: colors.line },
    text: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
  }[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      android_ripple={{ color: colors.scrim }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: look.bg, borderColor: look.border, opacity: inactive ? 0.5 : 1 },
        pressed && { transform: [{ scale: 0.98 }] },
        style,
      ]}
      {...props}
    >
      {loading ? <ActivityIndicator size="small" color={look.fg} /> : icon ? <Icon name={icon} size={18} color={look.fg} /> : null}
      <Text style={{ color: look.fg, fontSize: 14, fontWeight: '500' }}>{children}</Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  color,
}: {
  icon: MaterialName;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      android_ripple={{ color: colors.scrim, borderless: true, radius: 22 }}
      style={styles.iconButton}
    >
      <Icon name={icon} color={color} />
    </Pressable>
  );
}

// ---------------------------------------------------------------- avatars & badges

export function Avatar({ name, seed, size = 48, account = false }: { name?: string | null; seed?: string; size?: number; account?: boolean }) {
  const { colors } = useTheme();
  if (account) {
    return (
      <View style={[styles.center, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.tonal }]}>
        <Icon name="account_balance" size={size * 0.46} color={colors.onTonal} />
      </View>
    );
  }
  return (
    <View style={[styles.center, { width: size, height: size, borderRadius: size / 2, backgroundColor: avatarColor(seed ?? name ?? '') }]}>
      <Text style={{ color: '#fff', fontSize: size * 0.4, fontWeight: '500' }}>{initials(name ?? '')}</Text>
    </View>
  );
}

export function StatusBadge({ status }: { status: AccountStatus | TransactionStatus }) {
  const { colors } = useTheme();
  const look = {
    ACTIVE: [colors.successTonal, colors.success],
    COMPLETED: [colors.successTonal, colors.success],
    FROZEN: [colors.tonal, colors.onTonal],
    PENDING: [colors.warnTonal, colors.warn],
    CLOSED: [colors.dangerTonal, colors.danger],
    FAILED: [colors.dangerTonal, colors.danger],
    REVERSED: [colors.surface2, colors.muted],
  }[status];
  return (
    <View style={{ backgroundColor: look[0], borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={{ color: look[1], fontSize: 11, fontWeight: '500' }}>{status.charAt(0) + status.slice(1).toLowerCase()}</Text>
    </View>
  );
}

// ---------------------------------------------------------------- layout

/** App bar for full-screen flows: back/close on the left, actions on the right. */
export function TopBar({
  title,
  back = 'back',
  onBack,
  actions,
}: {
  title?: string;
  back?: 'back' | 'close' | false;
  onBack?: () => void;
  actions?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.topBar, { paddingTop: insets.top }]}>
      {back ? (
        <IconButton
          icon={back === 'close' ? 'close' : 'arrow_back'}
          label={back === 'close' ? 'Close' : 'Back'}
          onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
        />
      ) : null}
      <View style={{ flex: 1, paddingHorizontal: 8 }}>
        {title ? (
          <Txt variant="title" numberOfLines={1}>
            {title}
          </Txt>
        ) : null}
      </View>
      {actions}
    </View>
  );
}

export function SectionHeader({ title, action, onAction, index }: { title: string; action?: string; onAction?: () => void; index?: number }) {
  const { colors } = useTheme();
  return (
    <Enter index={index} style={styles.sectionHeader}>
      <Txt variant="title">{title}</Txt>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8} style={styles.row}>
          <Txt variant="label" color={colors.primary}>
            {action}
          </Txt>
          <Icon name="chevron_right" size={20} color={colors.primary} />
        </Pressable>
      ) : null}
    </Enter>
  );
}

/** Square tonal tile with an icon and a label (kit: "Primary features"). */
export function FeatureTile({ icon, label, onPress }: { icon: MaterialName; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.tile}>
      {({ pressed }) => (
        <>
          <View
            style={[
              styles.center,
              { width: 64, height: 64, borderRadius: pressed ? 24 : 20, backgroundColor: colors.tonal },
              pressed && { transform: [{ scale: 0.95 }] },
            ]}
          >
            <Icon name={icon} size={28} color={colors.onTonal} />
          </View>
          <Txt variant="caption" style={{ textAlign: 'center', fontSize: 13 }}>
            {label}
          </Txt>
        </>
      )}
    </Pressable>
  );
}

export function ListRow({
  icon,
  title,
  subtitle,
  onPress,
  trailing,
  danger,
}: {
  icon?: MaterialName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  trailing?: ReactNode;
  danger?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      android_ripple={{ color: colors.surface2 }}
      style={styles.listRow}
    >
      {icon ? <Icon name={icon} color={danger ? colors.danger : colors.primary} /> : null}
      <View style={{ flex: 1 }}>
        <Txt color={danger ? colors.danger : colors.ink}>{title}</Txt>
        {subtitle ? (
          <Txt variant="bodySm" color={colors.muted} numberOfLines={1}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {trailing ?? (onPress ? <Icon name="chevron_right" color={colors.muted} /> : null)}
    </Pressable>
  );
}

// ---------------------------------------------------------------- inputs

/** Material outlined text field with a floating label. */
export function TextField({
  label,
  error,
  hint,
  trailing,
  value,
  mono,
  onFocus,
  onBlur,
  ...props
}: TextInputProps & { label: string; error?: string; hint?: string; trailing?: ReactNode; mono?: boolean }) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const floated = focused || Boolean(value);
  const accent = error ? colors.danger : focused ? colors.primary : colors.subtle;

  return (
    <View>
      <View style={[styles.field, { borderColor: accent, borderWidth: focused || error ? 2 : 1, backgroundColor: colors.bg }]}>
        <Text
          style={[
            styles.fieldLabel,
            { color: error ? colors.danger : focused ? colors.primary : colors.muted, backgroundColor: colors.bg },
            floated ? { top: -9, fontSize: 12 } : { top: 17, fontSize: 16 },
          ]}
          pointerEvents="none"
        >
          {label}
        </Text>
        <TextInput
          value={value}
          accessibilityLabel={label}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          placeholderTextColor={colors.subtle}
          selectionColor={colors.primary}
          style={[styles.fieldInput, { color: colors.ink }, mono && { fontFamily: 'monospace', fontSize: 14 }]}
          {...props}
        />
        {trailing}
      </View>
      {error || hint ? (
        <Txt variant="caption" color={error ? colors.danger : colors.muted} style={{ paddingHorizontal: 16, paddingTop: 4 }}>
          {error || hint}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  button: {
    height: 44,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  topBar: { flexDirection: 'row', alignItems: 'center', minHeight: 64, paddingHorizontal: 6 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 12,
  },
  tile: { flex: 1, alignItems: 'center', gap: 8 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 14 },
  field: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, minHeight: 56 },
  fieldLabel: { position: 'absolute', left: 12, paddingHorizontal: 4, zIndex: 1 },
  fieldInput: { flex: 1, fontSize: 16, paddingHorizontal: 16, paddingVertical: 14 },
});
