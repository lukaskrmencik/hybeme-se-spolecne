import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PartnerLogos } from '../PartnerLogos';
import { PathWave } from '../PathWave';
import { GoogleSignInButton, googleSignInSupported } from './GoogleSignInButton';
import { colors, radius } from '../../utils/theme';

const logo = require('../../assets/images/logos/logo_hss_mark.png');

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  error?: string | null;
  submitLabel: string;
  loading: boolean;
  onSubmit: () => void;
  footerPrompt: string;
  footerAction: string;
  onFooterPress: () => void;
  /** Gets the Google ID token from the „Pokračovat přes Google“ button. */
  onGoogleIdToken?: (idToken: string) => Promise<void>;
  onGoogleError?: (message: string) => void;
  children: React.ReactNode;
}

export function AuthLayout({
  title,
  subtitle,
  error,
  submitLabel,
  loading,
  onSubmit,
  footerPrompt,
  footerAction,
  onFooterPress,
  onGoogleIdToken,
  onGoogleError,
  children,
}: AuthLayoutProps) {
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Image source={logo} style={styles.logo} accessibilityLabel="Hýbeme se společně" />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <PathWave />

        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={colors.dangerText} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {children}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>{submitLabel}</Text>}
        </TouchableOpacity>

        {googleSignInSupported && onGoogleIdToken && onGoogleError && (
          <>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>nebo</Text>
              <View style={styles.dividerLine} />
            </View>
            <GoogleSignInButton onIdToken={onGoogleIdToken} onError={onGoogleError} disabled={loading} />
          </>
        )}

        <TouchableOpacity onPress={onFooterPress} disabled={loading} style={styles.footer}>
          <Text style={styles.footerText}>
            {footerPrompt} <Text style={styles.footerAction}>{footerAction}</Text>
          </Text>
        </TouchableOpacity>

        <View style={styles.partners}>
          <PartnerLogos />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 18,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  logo: { width: 150, height: 150, alignSelf: 'center' },
  title: { fontSize: 26, fontWeight: '900', textAlign: 'center', color: colors.navy, marginTop: 10, letterSpacing: -0.3 },
  subtitle: { fontSize: 15, fontWeight: '600', textAlign: 'center', color: colors.muted, marginTop: 4 },
  button: {
    height: 50,
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  buttonDisabled: { opacity: 0.8 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dangerBg,
    borderRadius: radius.md,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  errorText: { color: colors.dangerText, fontSize: 13, fontWeight: '700', flex: 1 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.inactive, fontSize: 13, fontWeight: '700' },
  footer: { marginTop: 14 },
  footerText: { color: colors.muted, textAlign: 'center', fontSize: 14, fontWeight: '700' },
  footerAction: { color: colors.primary, fontWeight: '900' },
  partners: { marginTop: 'auto', paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
});
