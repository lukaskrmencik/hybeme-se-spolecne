import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { Sport } from '../types/sport';
import { colors, shadows } from '../utils/theme';

interface SportChipsProps {
  sports: Sport[];
  selectedId: number | undefined;
  onSelect: (id: number) => void;
  variant?: 'float' | 'inline';
}

export const SportChips = ({ sports, selectedId, onSelect, variant = 'float' }: SportChipsProps) => {
  const inline = variant === 'inline';
  if (!sports.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={styles.scroll}
      contentContainerStyle={inline ? styles.rowInline : styles.row}
    >
      {sports.map((s) => {
        const active = s.id === selectedId;
        return (
          <Pressable
            key={s.id}
            onPress={() => onSelect(s.id)}
            style={[styles.chip, inline && styles.chipInline, active && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{s.name}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row: { gap: 8, paddingHorizontal: 12, paddingTop: 2, paddingBottom: 10 },
  rowInline: { gap: 6 },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.float,
  },
  chipInline: { height: 32, boxShadow: 'none', backgroundColor: colors.background },
  chipActive: { backgroundColor: colors.navy },
  chipText: { fontSize: 13, fontWeight: '800', color: colors.navy },
  chipTextActive: { color: colors.white },
});
