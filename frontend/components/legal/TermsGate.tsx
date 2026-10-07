import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useUserStats } from '../../context/UserStatsContext';
import { useAuth } from '../../context/AuthContext';
import { apiFetch, getErrorMessage } from '../../services/api';
import { LEGAL } from '../../constants/legal';
import { colors, radius } from '../../utils/theme';
import { Consent, ConsentCheckboxes, consentComplete } from './ConsentCheckboxes';

const logo = require('../../assets/images/logos/logo_hss_mark.png');

/**
 * Accounts that have not agreed to the current terms (older accounts, new Google sign-ins, or after the
 * terms changed) see this instead of the app until they agree.
 */
export function TermsGate({ children }: { children: React.ReactNode }) {
  const { profile, refreshStats } = useUserStats();
  const { logout } = useAuth();
  const [consent, setConsent] = useState<Consent>({ terms: false, age: false });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Without a profile (still loading, or offline without a stored copy) there is nothing to decide yet.
  if (!profile || profile.terms_version === LEGAL.termsVersion) return <>{children}</>;

  const accept = async () => {
    if (!consentComplete(consent)) {
      setError('Pro pokračování je potřeba zaškrtnout oba souhlasy.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`users/${profile.id}/terms`, { method: 'POST', body: JSON.stringify({ version: LEGAL.termsVersion }) });
      await refreshStats();
    } catch (err) {
      setError(getErrorMessage(err, 'Souhlas se nepodařilo uložit. Zkontroluj připojení k internetu.'));
    } finally {
      setSaving(false);
    }
  };

  const first = !profile.terms_version;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Image source={logo} style={styles.logo} accessibilityLabel="Hýbeme se společně" />
        <Text style={styles.title}>{first ? 'Ještě jeden krok' : 'Podmínky se změnily'}</Text>
        <Text style={styles.text}>
          {first
            ? 'Než začneš sbírat body, potřebujeme tvůj souhlas s podmínkami používání a se zpracováním osobních údajů.'
            : 'Upravili jsme podmínky používání nebo zásady ochrany osobních údajů. Pro další používání aplikace je potřeba nové znění odsouhlasit.'}
        </Text>
        <ConsentCheckboxes
          value={consent}
          onChange={(c) => {
            setConsent(c);
            if (consentComplete(c)) setError(null);
          }}
          error={error}
        />
        <Pressable
          style={[styles.button, saving && styles.buttonBusy]}
          onPress={() => void accept()}
          disabled={saving}
          accessibilityRole="button"
        >
          {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Souhlasím a pokračovat</Text>}
        </Pressable>
        <Pressable onPress={() => void logout()} style={styles.secondary} accessibilityRole="button">
          <Text style={styles.secondaryText}>Nesouhlasím, odhlásit se</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: 16 },
  card: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 22,
    gap: 8,
  },
  logo: { width: 72, height: 72, alignSelf: 'center', marginBottom: 6 },
  title: { color: colors.navy, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  text: { color: colors.muted, fontSize: 15, lineHeight: 21, fontWeight: '600', textAlign: 'center' },
  button: { height: 50, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  buttonBusy: { opacity: 0.8 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '900' },
  secondary: { alignItems: 'center', paddingVertical: 12 },
  secondaryText: { color: colors.muted, fontSize: 14, fontWeight: '800' },
});
