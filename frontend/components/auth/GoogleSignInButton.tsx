import { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, TurboModuleRegistry } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { config } from '../../constants/config';
import { colors, radius } from '../../utils/theme';

export interface GoogleSignInButtonProps {
  onIdToken: (idToken: string) => Promise<void>;
  onError: (message: string) => void;
  disabled?: boolean;
}

export const googleSignInSupported = Platform.OS === 'android' && !!config.googleWebClientId;
const hasNativeModule = () => TurboModuleRegistry.get('RNGoogleSignin') != null;

export function GoogleSignInButton({ onIdToken, onError, disabled }: GoogleSignInButtonProps) {
  const [busy, setBusy] = useState(false);

  if (!googleSignInSupported) return null;

  const signIn = async () => {
    if (!hasNativeModule()) {
      onError('Přihlášení přes Google funguje jen v nainstalované aplikaci, ne v Expo Go.');
      return;
    }
    const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } =
      require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');

    setBusy(true);
    try {
      GoogleSignin.configure({ webClientId: config.googleWebClientId });
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) return;
      const idToken = response.data.idToken;
      if (!idToken) {
        onError('Google nevrátil přihlašovací údaje. Zkus to prosím znovu.');
        return;
      }
      await onIdToken(idToken);
      GoogleSignin.signOut().catch(() => {});
    } catch (err) {
      if (isErrorWithCode(err)) {
        if (err.code === statusCodes.IN_PROGRESS) return;
        if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          onError('Na zařízení chybí aktuální Služby Google Play.');
          return;
        }
        if (String(err.code) === '10') {
          onError('Tahle verze aplikace není u Googlu zaregistrovaná (package name nebo SHA-1 otisk).');
          return;
        }
      }
      onError(err instanceof Error && err.message ? err.message : 'Přihlášení přes Google se nezdařilo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, (disabled || busy) && styles.disabled]}
      onPress={() => void signIn()}
      disabled={disabled || busy}
      accessibilityRole="button"
    >
      {busy ? (
        <ActivityIndicator color={colors.navy} />
      ) : (
        <>
          <Ionicons name="logo-google" size={20} color={colors.navy} />
          <Text style={styles.text}>Pokračovat přes Google</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  disabled: { opacity: 0.6 },
  text: { fontSize: 16, fontWeight: '800', color: colors.navy },
});
