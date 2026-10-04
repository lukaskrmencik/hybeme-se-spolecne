import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

export interface GpsPosition {
  lat: number;
  lng: number;
  accuracy: number | null;
}

export type LocationStatus = 'pending' | 'granted' | 'denied' | 'error';

export function useLocation() {
  const [position, setPosition] = useState<GpsPosition | null>(null);
  const [status, setStatus] = useState<LocationStatus>('pending');

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      try {
        const { status: permission } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (permission !== 'granted') {
          setStatus('denied');
          return;
        }
        setStatus('granted');

        const sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 5 },
          (loc) => {
            setPosition({
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
              accuracy: loc.coords.accuracy,
            });
          }
        );
        if (cancelled) sub.remove();
        else subscription = sub;
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  return { position, status };
}
