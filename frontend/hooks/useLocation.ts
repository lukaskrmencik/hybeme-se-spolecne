import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Location from 'expo-location';

export interface GpsPosition {
  lat: number;
  lng: number;
  accuracy: number | null;
}

/**
 * denied  – not allowed yet, but the app may ask again (the prompt was dismissed)
 * blocked – refused for good: the system / browser will not show the prompt again, only its settings can change it
 */
export type LocationStatus = 'pending' | 'granted' | 'denied' | 'blocked' | 'error';

/** The browser's own answer; expo-location cannot tell "dismissed" from "refused" on the web. */
async function browserPermission(): Promise<PermissionState | null> {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.permissions?.query) return null;
  try {
    return (await navigator.permissions.query({ name: 'geolocation' as PermissionName })).state;
  } catch {
    return null; // older Safari cannot query geolocation
  }
}

export function useLocation() {
  const [position, setPosition] = useState<GpsPosition | null>(null);
  const [status, setStatus] = useState<LocationStatus>('pending');
  const subscription = useRef<Location.LocationSubscription | null>(null);
  const mounted = useRef(true);

  /** `ask` shows the permission prompt when it is still allowed; otherwise it only checks the current state. */
  const start = useCallback(async (ask: boolean) => {
    if (subscription.current) return;
    try {
      const webState = await browserPermission();
      if (webState === 'denied') {
        if (mounted.current) setStatus('blocked');
        return;
      }

      const permission = ask
        ? await Location.requestForegroundPermissionsAsync()
        : await Location.getForegroundPermissionsAsync();
      if (!mounted.current) return;

      if (permission.status !== 'granted') {
        const refused = (await browserPermission()) === 'denied' || permission.canAskAgain === false;
        if (mounted.current) setStatus(refused ? 'blocked' : 'denied');
        return;
      }

      setStatus('granted');
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 5 },
        (loc) => {
          setPosition({ lat: loc.coords.latitude, lng: loc.coords.longitude, accuracy: loc.coords.accuracy });
        }
      );
      if (!mounted.current) sub.remove();
      else subscription.current = sub;
    } catch {
      // In the browser a dismissed or refused prompt ends up here; the browser says which one it was.
      const webState = await browserPermission();
      if (mounted.current) setStatus(webState === 'denied' ? 'blocked' : webState === 'prompt' ? 'denied' : 'error');
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void start(true);

    // Back from the system settings: the permission may be allowed now.
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !subscription.current) void start(false);
    });

    // The browser reports a change made in its site settings right away.
    let webStatus: PermissionStatus | null = null;
    const onChange = () => {
      if (webStatus?.state === 'granted') void start(false);
    };
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((s) => {
          webStatus = s;
          s.addEventListener('change', onChange);
        })
        .catch(() => {});
    }

    return () => {
      mounted.current = false;
      appSub.remove();
      webStatus?.removeEventListener('change', onChange);
      subscription.current?.remove();
      subscription.current = null;
    };
  }, [start]);

  /** "Povolit polohu": asks again when the system still allows it, otherwise re-checks the settings. */
  const retry = useCallback(() => start(true), [start]);

  return { position, status, retry };
}
