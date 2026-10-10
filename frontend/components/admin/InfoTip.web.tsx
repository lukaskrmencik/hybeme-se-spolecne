import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../utils/theme';

const WIDTH = 260;

/**
 * Web: the bubble is put straight into <body> with a fixed position under the icon, so no line, icon or
 * section of the form (or a dialog) can be drawn over it.
 */
export function InfoTip({ text }: { text: string }) {
  const iconRef = useRef<View>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const show = () => {
    const el = iconRef.current as unknown as HTMLElement | null;
    if (!el?.getBoundingClientRect) return;
    const r = el.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.left - 12, window.innerWidth - WIDTH - 8));
    setPos({ left, top: r.bottom + 6 });
  };
  const hide = () => setPos(null);

  // A fixed bubble would stay behind while the page scrolls, so it closes instead.
  useEffect(() => {
    if (!pos) return;
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [pos]);

  return (
    <View ref={iconRef}>
      <Pressable
        onPress={() => (pos ? hide() : show())}
        onHoverIn={show}
        onHoverOut={hide}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={text}
      >
        <Ionicons name={pos ? 'information-circle' : 'information-circle-outline'} size={16} color={colors.skyText} />
      </Pressable>
      {pos &&
        createPortal(
          <View style={[styles.tip, { left: pos.left, top: pos.top }]} pointerEvents="none">
            <Text style={styles.text}>{text}</Text>
          </View>,
          document.body
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  tip: {
    position: 'fixed' as 'absolute',
    // Above dialogs too (react-native-web puts them at 9999).
    zIndex: 2147483000,
    width: WIDTH,
    backgroundColor: colors.navy,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    boxShadow: '0px 6px 18px rgba(5, 16, 26, 0.25)',
  },
  text: { color: colors.white, fontSize: 12, lineHeight: 17, fontWeight: '600' },
});
