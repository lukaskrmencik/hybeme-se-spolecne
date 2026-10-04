import React, { ComponentProps, useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows } from '../../utils/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** One admin screen: title, a sentence of what it is for, optional buttons on the right, content. */
export function AdminPage({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
      <View style={styles.pageInner}>
        <View style={styles.pageHead}>
          <View style={styles.pageHeadText}>
            <Text style={styles.pageTitle}>{title}</Text>
            {!!description && <Text style={styles.pageDescription}>{description}</Text>}
          </View>
          {actions}
        </View>
        {children}
      </View>
    </ScrollView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  label,
  icon,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  small,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
}) {
  const fg = variant === 'primary' || variant === 'danger' ? colors.white : variant === 'ghost' ? colors.navy : colors.navy;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        styles[`button_${variant}`],
        (disabled || loading) && styles.buttonDisabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={small ? 16 : 18} color={variant === 'danger' || variant === 'primary' ? fg : variant === 'ghost' ? colors.navy : colors.navy} />}
          <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color: fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

/** Text field with a label, a short help line and an error. */
export function Field({
  label,
  help,
  error,
  suffix,
  half,
  style,
  ...input
}: TextInputProps & {
  label: string;
  help?: string;
  error?: string | null;
  suffix?: string;
  /** Shares a row with other fields (inside adminStyles.wrapRow) and wraps below them on a phone. */
  half?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.field, half && styles.fieldHalf]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputWrap, focused && styles.inputFocus, !!error && styles.inputError]}>
        <TextInput
          placeholderTextColor={colors.inactive}
          {...input}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
          style={[styles.input, style]}
        />
        {!!suffix && <Text style={styles.suffix}>{suffix}</Text>}
      </View>
      {!!error ? <Text style={styles.fieldError}>{error}</Text> : !!help && <Text style={styles.fieldHelp}>{help}</Text>}
    </View>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <View style={styles.search}>
      <Ionicons name="search" size={18} color={colors.inactive} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.inactive}
        style={styles.searchInput}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChange('')} hitSlop={8} accessibilityLabel="Smazat hledání">
          <Ionicons name="close-circle" size={18} color={colors.inactive} />
        </Pressable>
      )}
    </View>
  );
}

/** Row of pill buttons, exactly one selected. */
export function Segmented<T extends string | number | null>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmented}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            style={[styles.segment, active && styles.segmentActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

type BadgeTone = 'green' | 'grey' | 'navy' | 'warn' | 'sky';

const BADGE: Record<BadgeTone, { bg: string; fg: string }> = {
  green: { bg: colors.primaryBg, fg: colors.primary },
  grey: { bg: colors.background, fg: colors.muted },
  navy: { bg: colors.navyBg, fg: colors.navy },
  warn: { bg: colors.warnBg, fg: colors.warnText },
  sky: { bg: colors.skyBg, fg: colors.skyText },
};

export function Badge({ label, tone = 'grey', icon }: { label: string; tone?: BadgeTone; icon?: IconName }) {
  const c = BADGE[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      {icon && <Ionicons name={icon} size={12} color={c.fg} />}
      <Text style={[styles.badgeText, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({ icon, title, text }: { icon: IconName; title: string; text?: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={36} color={colors.inactive} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {!!text && <Text style={styles.emptyText}>{text}</Text>}
    </View>
  );
}

export function LoadingBlock() {
  return (
    <View style={styles.empty}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.empty}>
      <Ionicons name="cloud-offline-outline" size={36} color={colors.danger} />
      <Text style={styles.emptyTitle}>{message}</Text>
      <Button label="Zkusit znovu" icon="refresh" variant="secondary" onPress={onRetry} />
    </View>
  );
}

export function Notice({ text, tone = 'info' }: { text: string; tone?: 'info' | 'danger' }) {
  const danger = tone === 'danger';
  return (
    <View style={[styles.notice, danger ? styles.noticeDanger : styles.noticeInfo]}>
      <Ionicons name={danger ? 'alert-circle' : 'information-circle'} size={18} color={danger ? colors.dangerText : colors.skyText} />
      <Text style={[styles.noticeText, { color: danger ? colors.dangerText : colors.navy }]}>{text}</Text>
    </View>
  );
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
}

/**
 * In-app confirmation dialog (the browser's confirm() is ugly and blocks the page).
 * `const [dialog, confirm] = useConfirm();` render `dialog`, then `if (await confirm({...}))`.
 */
export function useConfirm(): [React.ReactNode, (options: ConfirmOptions) => Promise<boolean>] {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((next: ConfirmOptions) => {
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOptions(null);
  };

  const dialog = (
    <Modal visible={!!options} transparent animationType="fade" onRequestClose={() => close(false)}>
      <Pressable style={styles.backdrop} onPress={() => close(false)}>
        <Pressable style={styles.dialog} onPress={() => {}}>
          <Text style={styles.dialogTitle}>{options?.title}</Text>
          <Text style={styles.dialogText}>{options?.message}</Text>
          <View style={styles.dialogActions}>
            <Button label="Zrušit" variant="secondary" onPress={() => close(false)} />
            <Button label={options?.confirmLabel ?? 'OK'} variant={options?.danger ? 'danger' : 'primary'} onPress={() => close(true)} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  return [dialog, confirm];
}

export const adminStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  muted: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  strong: { color: colors.navy, fontSize: 15, fontWeight: '800' },
  sectionTitle: { color: colors.navy, fontSize: 17, fontWeight: '900' },
});

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  pageContent: { padding: 16, paddingBottom: 48 },
  pageInner: { width: '100%', maxWidth: 1000, alignSelf: 'center', gap: 16 },
  pageHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  pageHeadText: { flex: 1, minWidth: 220, gap: 4 },
  pageTitle: { color: colors.navy, fontSize: 24, fontWeight: '900' },
  pageDescription: { color: colors.muted, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, gap: 12, ...shadows.card },
  pressed: { opacity: 0.85 },

  button: {
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonSmall: { minHeight: 36, paddingHorizontal: 12, borderRadius: radius.sm },
  button_primary: { backgroundColor: colors.primary },
  button_secondary: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  button_danger: { backgroundColor: colors.danger },
  button_ghost: { backgroundColor: 'transparent' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 15, fontWeight: '800' },
  buttonTextSmall: { fontSize: 13 },

  field: { gap: 6 },
  fieldHalf: { flexGrow: 1, flexBasis: 200 },
  fieldLabel: { color: colors.navy, fontSize: 13, fontWeight: '800' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  inputFocus: { borderColor: '#C3CDB9', backgroundColor: colors.white },
  inputError: { borderColor: colors.danger },
  input: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.navy, paddingVertical: 10, outlineWidth: 0 },
  suffix: { color: colors.muted, fontSize: 13, fontWeight: '800', marginLeft: 6 },
  fieldHelp: { color: colors.muted, fontSize: 12, lineHeight: 16, fontWeight: '600' },
  fieldError: { color: colors.dangerText, fontSize: 12, fontWeight: '700' },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    minHeight: 46,
    flexGrow: 1,
    flexBasis: 240,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.navy, paddingVertical: 10, outlineWidth: 0 },

  segmented: { gap: 6 },
  segment: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  segmentText: { color: colors.navy, fontSize: 13, fontWeight: '800' },
  segmentTextActive: { color: colors.white },

  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.full, paddingHorizontal: 9, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '800' },

  empty: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 40, paddingHorizontal: 16 },
  emptyTitle: { color: colors.navy, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  emptyText: { color: colors.muted, fontSize: 14, fontWeight: '600', textAlign: 'center', maxWidth: 420 },

  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: radius.md, padding: 12 },
  noticeInfo: { backgroundColor: colors.skyBg },
  noticeDanger: { backgroundColor: colors.dangerBg },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '600' },

  backdrop: { flex: 1, backgroundColor: 'rgba(5, 16, 26, 0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  dialog: { width: '100%', maxWidth: 420, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 20, gap: 12 },
  dialogTitle: { color: colors.navy, fontSize: 18, fontWeight: '900' },
  dialogText: { color: colors.muted, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 6 },
});
