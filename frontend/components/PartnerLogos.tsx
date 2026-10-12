import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../utils/theme';

// Downsized copies: the logos are shown about 100 px wide, the originals are up to 1745 px.
const school = require('../assets/images/web/logo-skola-320.png');
const schoolLight = require('../assets/images/web/logo-skola-w-320.png');
const sponsor = require('../assets/images/web/skoenergo-300.png');

interface PartnerLogosProps {
  /** Light labels and the white school logo, for a dark background. */
  onDark?: boolean;
}

/** School and main sponsor, labels on one line and logos in equal boxes. */
export function PartnerLogos({ onDark = false }: PartnerLogosProps) {
  return (
    <View style={styles.row}>
      <View style={styles.col}>
        <Text style={[styles.label, onDark && styles.labelOnDark]}>Provozuje</Text>
        <View style={styles.box}>
          <Image source={onDark ? schoolLight : school} style={styles.school} resizeMode="contain" />
        </View>
      </View>
      <View style={[styles.divider, onDark && styles.dividerOnDark]} />
      <View style={[styles.col, styles.colAfterDivider]}>
        <Text style={[styles.label, onDark && styles.labelOnDark]}>Hlavní partner</Text>
        <View style={styles.box}>
          <Image source={sponsor} style={styles.sponsor} resizeMode="contain" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch', justifyContent: 'center', alignSelf: 'stretch' },
  col: { flex: 1, maxWidth: 156, alignItems: 'center' },
  colAfterDivider: {},
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.inactive,
    marginBottom: 4,
  },
  labelOnDark: { color: 'rgba(255,255,255,0.62)' },
  box: { height: 60, width: '100%', alignItems: 'center', justifyContent: 'center' },
  school: { width: 105, height: 56 },
  sponsor: { width: 112, height: 13.8 },
  divider: { width: 1, marginHorizontal: 14, backgroundColor: colors.border },
  dividerOnDark: { backgroundColor: 'rgba(255,255,255,0.18)' },
});
