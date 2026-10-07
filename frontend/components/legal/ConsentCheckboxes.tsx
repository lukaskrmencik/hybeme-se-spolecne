import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../utils/theme';

export interface Consent {
  /** Terms of use + privacy policy. */
  terms: boolean;
  /** 15 or older, or a parent / legal guardian agreed (čl. 8 GDPR, § 7 zákona č. 110/2019 Sb.). */
  age: boolean;
}

export const consentComplete = (c: Consent) => c.terms && c.age;

function Box({ checked, onPress, children }: { checked: boolean; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.row}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      hitSlop={4}
    >
      <View style={[styles.box, checked && styles.boxOn]}>{checked && <Ionicons name="checkmark" size={15} color={colors.white} />}</View>
      <Text style={styles.label}>{children}</Text>
    </Pressable>
  );
}

/** The two agreements needed to use the app, with links to the full texts. */
export function ConsentCheckboxes({
  value,
  onChange,
  error,
}: {
  value: Consent;
  onChange: (value: Consent) => void;
  error?: string | null;
}) {
  const router = useRouter();
  const link = (href: '/podminky' | '/soukromi', text: string) => (
    <Text style={styles.link} onPress={() => router.push(href)} accessibilityRole="link">
      {text}
    </Text>
  );

  return (
    <View style={styles.wrap}>
      <Box checked={value.terms} onPress={() => onChange({ ...value, terms: !value.terms })}>
        Souhlasím s {link('/podminky', 'podmínkami používání')} a se zpracováním osobních údajů podle{' '}
        {link('/soukromi', 'zásad ochrany osobních údajů')}.
      </Box>
      <Box checked={value.age} onPress={() => onChange({ ...value, age: !value.age })}>
        Je mi alespoň 15 let, nebo mi registraci povolil rodič či jiný zákonný zástupce.
      </Box>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, marginTop: 16 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.inactive,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { flex: 1, color: colors.navy, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  link: { color: colors.primary, fontWeight: '800', textDecorationLine: 'underline' },
  error: { color: colors.dangerText, fontSize: 13, fontWeight: '700' },
});
