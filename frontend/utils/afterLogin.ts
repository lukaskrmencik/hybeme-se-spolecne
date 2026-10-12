import { Platform } from 'react-native';

const KEY = 'after_login';

export function rememberAfterLogin(path: string): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(KEY, path);
  } catch {}
}

export function takeAfterLogin(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    const path = window.sessionStorage.getItem(KEY);
    window.sessionStorage.removeItem(KEY);
    return path && path.startsWith('/') && !path.startsWith('//') ? path : null;
  } catch {
    return null;
  }
}
