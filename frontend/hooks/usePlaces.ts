import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../services/api';
import { Place, PlacesApiResponse } from '../types/place';

const STORAGE_KEY_PLACES = 'cached_places';
const STORAGE_KEY_LAST_SYNC = 'cached_places_last_sync';
const SYNC_INTERVAL_MS = 1000 * 60 * 60;

export function usePlaces() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllPlacesFromApi = async (): Promise<Place[]> => {
    const res: PlacesApiResponse = await apiFetch('places?per_page=100&page=1&only_active=1');
    return res.data.items || [];
  };

  const syncPlaces = async (force = false) => {
    try {
      setLoading(true);
      setError(null);

      const cachedData = await AsyncStorage.getItem(STORAGE_KEY_PLACES);
      const lastSync = await AsyncStorage.getItem(STORAGE_KEY_LAST_SYNC);
      const now = Date.now();

      if (cachedData && lastSync && !force) {
        const timeDiff = now - parseInt(lastSync, 10);
        if (timeDiff < SYNC_INTERVAL_MS) {
          setPlaces(JSON.parse(cachedData));
          setLoading(false);
          return;
        }
      }

      const freshPlaces = await fetchAllPlacesFromApi();
      setPlaces(freshPlaces);

      await AsyncStorage.setItem(STORAGE_KEY_PLACES, JSON.stringify(freshPlaces));
      await AsyncStorage.setItem(STORAGE_KEY_LAST_SYNC, now.toString());

    } catch (err: any) {
      setError(err.error_message || 'Nepodařilo se načíst místa.');
      const fallback = await AsyncStorage.getItem(STORAGE_KEY_PLACES);

      if (fallback) {
        setPlaces(JSON.parse(fallback));
      }

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncPlaces();
  }, []);

  return {
    places,
    loading,
    error,
    refreshPlaces: () => syncPlaces(true),
  };
  
}