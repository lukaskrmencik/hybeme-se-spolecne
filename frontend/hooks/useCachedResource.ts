import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getErrorMessage } from '../services/api';

interface CacheEntry<T> {
  savedAt: number;
  data: T;
}

/**
 * Stale-while-revalidate: shows cached data immediately, refetches when the cache is older
 * than `maxAgeMs`, and falls back to the cache when offline.
 */
export function useCachedResource<T>(
  cacheKey: string,
  maxAgeMs: number,
  fetcher: () => Promise<T>,
  initial: T,
  errorMessage: string
) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasDataRef = useRef(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(
    async (force: boolean) => {
      setLoading(true);
      try {
        let cached: CacheEntry<T> | null = null;
        try {
          const raw = await AsyncStorage.getItem(cacheKey);
          cached = raw ? (JSON.parse(raw) as CacheEntry<T>) : null;
        } catch {
          cached = null;
        }

        if (cached && !hasDataRef.current) {
          setData(cached.data);
          hasDataRef.current = true;
        }
        if (cached && !force && Date.now() - cached.savedAt < maxAgeMs) {
          setError(null);
          return;
        }

        const fresh = await fetcherRef.current();
        setData(fresh);
        hasDataRef.current = true;
        setError(null);
        AsyncStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), data: fresh })).catch(() => {});
      } catch (err) {
        if (!hasDataRef.current) setError(getErrorMessage(err, errorMessage));
      } finally {
        setLoading(false);
      }
    },
    [cacheKey, maxAgeMs, errorMessage]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { data, loading, error, refresh };
}
