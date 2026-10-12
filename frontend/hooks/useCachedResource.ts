import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getErrorMessage } from '../services/api';

interface CacheEntry<T> {
  savedAt: number;
  data: T;
}

const BACKGROUND_REFRESH_MS = 5 * 60 * 1000;

export function useCachedResource<T>(
  cacheKey: string,
  minIntervalMs: number,
  fetcher: () => Promise<T>,
  initial: T,
  errorMessage: string
) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasDataRef = useRef(false);
  const lastFetchRef = useRef(0);
  const inFlightRef = useRef(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(
    async (force: boolean) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        if (!hasDataRef.current) {
          try {
            const raw = await AsyncStorage.getItem(cacheKey);
            const cached = raw ? (JSON.parse(raw) as CacheEntry<T>) : null;
            if (cached) {
              setData(cached.data);
              hasDataRef.current = true;
              lastFetchRef.current = cached.savedAt;
              setLoading(false);
            }
          } catch {}
        }

        if (!force && Date.now() - lastFetchRef.current < minIntervalMs) return;

        const fresh = await fetcherRef.current();
        setData(fresh);
        hasDataRef.current = true;
        lastFetchRef.current = Date.now();
        setError(null);
        AsyncStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), data: fresh })).catch(() => {});
      } catch (err) {
        if (!hasDataRef.current) setError(getErrorMessage(err, errorMessage));
      } finally {
        inFlightRef.current = false;
        setLoading(false);
      }
    },
    [cacheKey, minIntervalMs, errorMessage]
  );

  useEffect(() => {
    void load(false);

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void load(false);
    });
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void load(false);
    }, BACKGROUND_REFRESH_MS);

    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { data, loading, error, refresh };
}
