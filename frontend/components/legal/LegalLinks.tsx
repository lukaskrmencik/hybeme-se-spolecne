import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../utils/theme';

/** "Podmínky používání · Ochrana osobních údajů", for footers. */
export function LegalLinks({ onDark = false }: { onDark?: boolean }) {
  const router = useRouter();
  const color = onDark ? 'rgba(255,255,255,0.75)' : colors.muted;
  return (
    <View style={styles.row}>
      <Text style={[styles.link, { color }]} onPress={() => router.push('/podminky')} accessibilityRole="link">
        Podmínky používání
      </Text>
      <Text style={[styles.dot, { color }]}>·</Text>
      <Text style={[styles.link, { color }]} onPress={() => router.push('/soukromi')} accessibilityRole="link">
        Ochrana osobních údajů
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6 },
  link: { fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  dot: { fontSize: 12, fontWeight: '700' },
});
