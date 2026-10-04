import { Alert, Platform } from 'react-native';

export type ToastTone = 'success' | 'info' | 'danger';

export interface Toast {
  id: number;
  title: string;
  message?: string;
  tone: ToastTone;
}

const listeners = new Set<(toast: Toast) => void>();
let nextId = 1;

export function onToast(fn: (toast: Toast) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Short in-app notice at the top of the screen that hides by itself (see ToastHost).
 * Replaces the system alerts, which on the web are blocking browser dialogs.
 */
export function showToast(title: string, message?: string, tone: ToastTone = 'info'): void {
  const toast: Toast = { id: nextId++, title, message, tone };
  listeners.forEach((fn) => fn(toast));
}

/** A real question (e.g. deleting the account) still needs a dialog the user has to answer. */
export function confirmAction(
  title: string,
  message: string,
  confirmText = 'OK',
  destructive = false
): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return Promise.resolve(false);
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Zrušit', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
