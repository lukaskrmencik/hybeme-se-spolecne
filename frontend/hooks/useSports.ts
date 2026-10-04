import { apiFetch } from '../services/api';
import { Sport } from '../types/sport';
import { useCachedResource } from './useCachedResource';

const CACHE_KEY = 'cache_sports_v2';
// An hour, like the places, so sports added in the administration show up the same day.
const MAX_AGE_MS = 60 * 60 * 1000;
const EMPTY: Sport[] = [];

async function fetchSports(): Promise<Sport[]> {
  const res = await apiFetch<{ data: Sport[] }>('sports?only_active=1');
  return res.data ?? [];
}

export function useSports() {
  const { data, loading, error } = useCachedResource(
    CACHE_KEY,
    MAX_AGE_MS,
    fetchSports,
    EMPTY,
    'Nepodařilo se načíst sporty.'
  );
  return { sports: data, loading, error };
}
