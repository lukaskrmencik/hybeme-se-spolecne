import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { config } from '../../constants/config';
import { getBaseUrl } from '../../services/api';
import type { GoogleSignInButtonProps } from './GoogleSignInButton';

const GIS_SRC = 'https://accounts.google.com/gsi/client';
/** Google renders its button at most 400 px wide. */
const MAX_WIDTH = 400;

interface GoogleIdentity {
  initialize: (options: Record<string, unknown>) => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
}

export const googleSignInSupported = !!config.googleWebClientId;

const gis = (): GoogleIdentity | undefined => (window as any).google?.accounts?.id;

let scriptPromise: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (gis()) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Google script failed to load'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

let initialized = false;

/** Takes the error the backend sent back in the URL fragment, and removes it from the address bar. */
function takeRedirectError(): string | null {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const message = params.get('google_error');
  if (message == null) return null;
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  return message || 'Přihlášení přes Google se nezdařilo.';
}

/**
 * Official "Sign in with Google" button (Google Identity Services) in redirect mode: the whole page
 * goes to Google and back instead of opening a popup window. Google posts the ID token straight to
 * the backend (auth/google/redirect), which returns to the login page with our token in the URL
 * fragment; AuthContext picks it up. `onIdToken` is used by the Android button only.
 */
export function GoogleSignInButton({ onError, disabled }: GoogleSignInButtonProps) {
  const hostRef = useRef<View>(null);
  const [width, setWidth] = useState(0);
  // Offline (e.g. the installed app without signal) Google cannot be reached; the button just stays hidden.
  const [unavailable, setUnavailable] = useState(false);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    const message = takeRedirectError();
    if (message) onErrorRef.current(message);
  }, []);

  useEffect(() => {
    if (!config.googleWebClientId || width === 0) return;
    let cancelled = false;
    loadGis()
      .then(() => {
        const id = gis();
        // On the web the View ref is the DOM element.
        const host = hostRef.current as unknown as HTMLElement | null;
        if (cancelled || !id || !host) return;
        if (!initialized) {
          id.initialize({
            client_id: config.googleWebClientId,
            ux_mode: 'redirect',
            login_uri: `${getBaseUrl()}auth/google/redirect`,
            auto_select: false,
            itp_support: true,
          });
          initialized = true;
        }
        host.innerHTML = '';
        id.renderButton(host, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'center',
          locale: 'cs',
          width: Math.min(MAX_WIDTH, Math.round(width)),
        });
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true);
      });
    return () => {
      cancelled = true;
    };
  }, [width]);

  if (!config.googleWebClientId || unavailable) return null;

  return (
    <View
      style={[styles.wrap, disabled && styles.disabled]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      pointerEvents={disabled ? 'none' : 'auto'}
    >
      <View ref={hostRef} style={styles.host} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', alignItems: 'center' },
  host: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.6 },
});
