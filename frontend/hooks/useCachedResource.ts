import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getErrorMessage } from '../services/api';

interface CacheEntry<T> {
  savedAt: number;
  data: T;
}

/** While the app is open, data is refreshed this often even without leaving it. */
const BACKGROUND_REFRESH_MS = 5 * 60 * 1000;

/**
 * Stale-while-revalidate: shows the stored copy at once (fast start, works offline) and always
 * fetches a fresh one in the background, on start and whenever the app comes back to the foreground.
 * `minIntervalMs` only stops repeated fetches within a few seconds of each other.
 */
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
          } catch {
            // A broken cache is simply ignored.
          }
        }

        if (!force && Date.now() - lastFetchRef.current < minIntervalMs) return;

        const fresh = await fetcherRef.current();
        setData(fresh);
        hasDataRef.current = true;
        lastFetchRef.current = Date.now();
        setError(null);
        AsyncStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), data: fresh })).catch(() => {});
      } catch (err) {
        // Offline: keep showing the stored copy.
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
