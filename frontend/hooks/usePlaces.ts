import { apiFetch } from '../services/api';
import { Place, PlacesApiResponse } from '../types/place';
import { useCachedResource } from './useCachedResource';

const CACHE_KEY = 'cache_places_v2';
// Always refreshed in the background (see useCachedResource); this only spaces out repeated fetches.
const MIN_REFRESH_MS = 30 * 1000;
const PER_PAGE = 100;
const MAX_PAGES = 50;
const EMPTY: Place[] = [];

async function fetchAllPlaces(): Promise<Place[]> {
  const all: Place[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await apiFetch<PlacesApiResponse>(`places?per_page=${PER_PAGE}&page=${page}&only_active=1`);
    all.push(...(res.data.items ?? []));
    if (page >= res.data.total_pages) break;
  }
  return all;
}

export function usePlaces() {
  const { data, loading, error, refresh } = useCachedResource(
    CACHE_KEY,
    MIN_REFRESH_MS,
    fetchAllPlaces,
    EMPTY,
    'Nepodařilo se načíst místa.'
  );
  return { places: data, loading, error, refreshPlaces: refresh };
}
