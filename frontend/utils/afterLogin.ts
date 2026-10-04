import { Platform } from 'react-native';

const KEY = 'after_login';

/**
 * Where to go once the user signs in (e.g. back to /admin). Kept in sessionStorage, so it also
 * survives the full-page Google sign-in on the web. Native always continues to the map.
 */
export function rememberAfterLogin(path: string): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(KEY, path);
  } catch {
    // Private mode without storage: the user lands on the map instead.
  }
}

export function takeAfterLogin(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    const path = window.sessionStorage.getItem(KEY);
    window.sessionStorage.removeItem(KEY);
    // Only paths inside the app, never a full URL.
    return path && path.startsWith('/') && !path.startsWith('//') ? path : null;
  } catch {
    return null;
  }
}
