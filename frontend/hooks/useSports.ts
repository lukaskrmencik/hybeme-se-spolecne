import { apiFetch } from '../services/api';
import { Sport } from '../types/sport';
import { useCachedResource } from './useCachedResource';

const CACHE_KEY = 'cache_sports_v2';
// Always refreshed in the background (see useCachedResource); this only spaces out repeated fetches.
const MIN_REFRESH_MS = 30 * 1000;
const EMPTY: Sport[] = [];

async function fetchSports(): Promise<Sport[]> {
  const res = await apiFetch<{ data: Sport[] }>('sports?only_active=1');
  return res.data ?? [];
}

export function useSports() {
  const { data, loading, error } = useCachedResource(
    CACHE_KEY,
    MIN_REFRESH_MS,
    fetchSports,
    EMPTY,
    'Nepodařilo se načíst sporty.'
  );
  return { sports: data, loading, error };
}
