import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { onToast, Toast, ToastTone } from '../utils/alert';
import { colors, radius } from '../utils/theme';

const VISIBLE_MS = 3500;
const MAX_TOASTS = 3;

const TONE: Record<ToastTone, { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; bg: string }> = {
  success: { icon: 'checkmark-circle', color: colors.primary, bg: colors.primaryBg },
  info: { icon: 'information-circle', color: colors.skyText, bg: colors.skyBg },
  danger: { icon: 'alert-circle', color: colors.danger, bg: colors.dangerBg },
};

function ToastItem({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;
  // The parent passes a new callback on every render, the timer must not restart because of it.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => onDoneRef.current());
    }, VISIBLE_MS + (toast.message ? toast.message.length * 25 : 0));
    return () => clearTimeout(timer);
  }, [anim, toast.message]);

  const tone = TONE[toast.tone];
  return (
    <Animated.View
      style={[
        styles.toast,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] },
      ]}
    >
      <Pressable style={styles.inner} onPress={onDone} accessibilityRole="alert">
        <View style={[styles.iconWrap, { backgroundColor: tone.bg }]}>
          <Ionicons name={tone.icon} size={20} color={tone.color} />
        </View>
        <View style={styles.texts}>
          <Text style={styles.title}>{toast.title}</Text>
          {!!toast.message && <Text style={styles.message}>{toast.message}</Text>}
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Renders toasts from showToast() over the whole app. Tapping one hides it. */
export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => onToast((t) => setToasts((prev) => [...prev, t].slice(-MAX_TOASTS))), []);

  if (toasts.length === 0) return null;

  return (
    <View style={[styles.host, { top: insets.top + 8 }]} pointerEvents="box-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDone={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 12, right: 12, zIndex: 1000, gap: 8, alignItems: 'center' },
  toast: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    boxShadow: '0px 6px 20px rgba(19, 63, 99, 0.2)',
  },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
  iconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1 },
  title: { fontSize: 14, fontWeight: '900', color: colors.navy },
  message: { fontSize: 13, fontWeight: '600', color: colors.muted, marginTop: 1 },
});
