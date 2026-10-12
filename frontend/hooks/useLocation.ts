import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Location from 'expo-location';

export interface GpsPosition {
  lat: number;
  lng: number;
  accuracy: number | null;
}

export type LocationStatus = 'pending' | 'granted' | 'denied' | 'blocked' | 'error';

async function browserPermission(): Promise<PermissionState | null> {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.permissions?.query) return null;
  try {
    return (await navigator.permissions.query({ name: 'geolocation' as PermissionName })).state;
  } catch {
    return null;
  }
}

function watchBrowser(
  onPosition: (position: GpsPosition) => void,
  onError: (error: GeolocationPositionError) => void
): { remove: () => void } {
  const id = navigator.geolocation.watchPosition(
    (p) => onPosition({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
    onError,
    { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 }
  );
  return { remove: () => navigator.geolocation.clearWatch(id) };
}

export function useLocation() {
  const [position, setPosition] = useState<GpsPosition | null>(null);
  const [status, setStatus] = useState<LocationStatus>('pending');
  const subscription = useRef<{ remove: () => void } | null>(null);
  const mounted = useRef(true);

  const startWeb = useCallback(async (ask: boolean) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('error');
      return;
    }
    const webState = await browserPermission();
    if (!mounted.current) return;
    if (webState === 'denied') {
      setStatus('blocked');
      return;
    }
    if (!ask && webState !== 'granted') return;

    let located = false;
    subscription.current = watchBrowser(
      (next) => {
        if (!mounted.current) return;
        located = true;
        setPosition(next);
        setStatus('granted');
      },
      (error) => {
        if (!mounted.current) return;
        if (error.code === error.PERMISSION_DENIED) {
          subscription.current?.remove();
          subscription.current = null;
          setStatus('blocked');
        } else if (!located) {
          setStatus('error');
        }
      }
    );
  }, []);

  const start = useCallback(async (ask: boolean) => {
    if (subscription.current) return;
    if (Platform.OS === 'web') return startWeb(ask);
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
      const webState = await browserPermission();
      if (mounted.current) setStatus(webState === 'denied' ? 'blocked' : webState === 'prompt' ? 'denied' : 'error');
    }
  }, [startWeb]);

  useEffect(() => {
    mounted.current = true;
    void start(true);

    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !subscription.current) void start(false);
    });

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

  const retry = useCallback(() => {
    subscription.current?.remove();
    subscription.current = null;
    return start(true);
  }, [start]);

  return { position, status, retry };
}
