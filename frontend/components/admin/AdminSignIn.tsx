import { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { jwtDecode } from 'jwt-decode';
import { getVerificationRequired, useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../services/api';
import { rememberAfterLogin } from '../../utils/afterLogin';
import { GoogleSignInButton, googleSignInSupported } from '../auth/GoogleSignInButton';
import { Button, Field, Notice } from './ui';
import { colors, radius } from '../../utils/theme';

const logo = require('../../assets/images/logos/logo_hss_mark.png');

const nameFromToken = (token: string | null): string | null => {
  if (!token) return null;
  try {
    return jwtDecode<{ user_name?: string }>(token).user_name ?? null;
  } catch {
    return null;
  }
};

/**
 * Sign-in for the administration, shown at /admin instead of a "no access" page:
 * for visitors who are not signed in, and for those signed in with an account that is not an admin.
 * Signing in here replaces the current session.
 */
export function AdminSignIn() {
  const { token, login, loginWithGoogle } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const currentName = nameFromToken(token);

  // The Google sign-in on the web leaves the page; afterwards the app brings the admin back here.
  useEffect(() => rememberAfterLogin('/admin'), []);

  const handleError = (err: unknown) => {
    setError(
      getVerificationRequired(err)
        ? 'E-mailová adresa tohoto účtu není ověřená. Dokončete ověření v aplikaci a přihlaste se znovu.'
        : getErrorMessage(err, 'Přihlášení se nezdařilo.')
    );
  };

  const submit = async () => {
    if (loading) return;
    if (!email.trim() || !password) {
      setError('Vyplňte e-mail a heslo.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const google = async (idToken: string) => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle(idToken);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <View style={styles.brand}>
          <Image source={logo} style={styles.logo} />
          <View>
            <Text style={styles.title}>Administrace</Text>
            <Text style={styles.subtitle}>Hýbeme se společně</Text>
          </View>
        </View>

        <Text style={styles.lead}>Pro vstup do administrace se přihlaste účtem s oprávněním správce.</Text>

        {!!token && (
          <Notice
            text={`Aktuálně přihlášený účet${currentName ? ` ${currentName}` : ''} nemá oprávnění správce. Přihlášením níže ho vystřídáte.`}
          />
        )}
        {!!error && <Notice tone="danger" text={error} />}

        <Field
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          submitBehavior="submit"
        />
        <Field
          ref={passwordRef}
          label="Heslo"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
        />
        <Button label="Přihlásit se" icon="log-in-outline" onPress={() => void submit()} loading={loading} />

        {googleSignInSupported && (
          <>
            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>nebo</Text>
              <View style={styles.line} />
            </View>
            <GoogleSignInButton onIdToken={google} onError={setError} disabled={loading} />
          </>
        )}

        <Button label="Zpět do aplikace" variant="ghost" icon="arrow-back" onPress={() => router.replace('/map')} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    gap: 14,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 44, height: 44, borderRadius: 10 },
  title: { color: colors.navy, fontSize: 20, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  lead: { color: colors.muted, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.inactive, fontSize: 12, fontWeight: '700' },
});
