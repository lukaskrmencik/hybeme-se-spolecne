import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { config } from '../constants/config';
import { colors, radius } from '../utils/theme';

type PinTone = 'open' | 'wait' | 'done';

/** Same look as the pins drawn in LeafletMapView. */
function SamplePin({ tone, combo, label }: { tone: PinTone; combo?: boolean; label?: string }) {
  const fg = colors.white;
  return (
    <View style={[styles.pin, tone === 'open' ? styles.pinOpen : tone === 'wait' ? styles.pinWait : styles.pinDone]}>
      {tone === 'wait' && <Ionicons name="time-outline" size={12} color={fg} />}
      {combo && <Ionicons name="link" size={12} color={fg} />}
      {tone === 'done' ? (
        <Ionicons name="checkmark" size={13} color={fg} />
      ) : (
        <Text style={[styles.pinText, { color: fg }]}>{label ?? '+10'}</Text>
      )}
    </View>
  );
}

const ROWS: { pin: React.ReactNode; title: string; text: string }[] = [
  {
    pin: <SamplePin tone="open" />,
    title: 'Body hned',
    text: 'Dojdi na místo a zmáčkni „Jsem tu!“.',
  },
  {
    pin: <SamplePin tone="wait" />,
    title: 'Body za chvíli',
    text: `Ještě počkej: mezi návštěvami je pauza ${config.minVisitIntervalMinutes} min, nebo je na kombinaci ještě moc brzy.`,
  },
  {
    pin: <SamplePin tone="done" />,
    title: 'Hotovo',
    text: `Tady už body máš. Znovu je dostaneš za ${config.placeCooldownHours} h.`,
  },
  {
    pin: <SamplePin tone="open" combo label="+28" />,
    title: 'Kombinace',
    text: 'Řetízek znamená body za kombinaci: navážeš na poslední návštěvu stejným sportem a body se násobí.',
  },
];

/** Small card explaining the pin colours, toggled from the map toolbar. */
export function MapLegend({ onClose }: { onClose: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.heading}>Co znamenají body na mapě</Text>
        <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Zavřít legendu">
          <Ionicons name="close" size={18} color={colors.muted} />
        </Pressable>
      </View>
      {ROWS.map((row) => (
        <View key={row.title} style={styles.row}>
          <View style={styles.pinCol}>{row.pin}</View>
          <View style={styles.texts}>
            <Text style={styles.title}>{row.title}</Text>
            <Text style={styles.text}>{row.text}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    gap: 12,
    boxShadow: '0px 6px 20px rgba(19, 63, 99, 0.18)',
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontSize: 15, fontWeight: '900', color: colors.navy },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  pinCol: { width: 64, alignItems: 'center', paddingTop: 1 },
  texts: { flex: 1 },
  title: { fontSize: 13, fontWeight: '900', color: colors.navy },
  text: { fontSize: 12, fontWeight: '600', color: colors.muted, marginTop: 1, lineHeight: 16 },
  pin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 26,
    paddingHorizontal: 9,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.white,
    boxShadow: '0px 2px 6px rgba(19, 63, 99, 0.25)',
  },
  // Keep in sync with the pin CSS in LeafletMapView.
  pinOpen: { backgroundColor: colors.primary },
  pinWait: { backgroundColor: colors.warn },
  pinDone: { backgroundColor: colors.muted },
  pinText: { fontSize: 12, fontWeight: '900' },
});
