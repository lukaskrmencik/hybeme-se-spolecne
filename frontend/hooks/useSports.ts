import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../services/api';
import { Sport } from '../types/sport';

const STORAGE_KEY_SPORTS = 'cached_sports';
const STORAGE_KEY_SPORTS_SYNC = 'cached_sports_last_sync';
const SYNC_INTERVAL_MS = 1000 * 60 * 60 * 24; // 24 hodin

export function useSports() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);

  const syncSports = async () => {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY_SPORTS);
      const lastSync = await AsyncStorage.getItem(STORAGE_KEY_SPORTS_SYNC);
      const now = Date.now();

      // Použijeme mezipaměť, pokud je čerstvá
      if (cached && lastSync && now - parseInt(lastSync) < SYNC_INTERVAL_MS) {
        setSports(JSON.parse(cached));
        setLoading(false);
        return;
      }

      // Jinak stáhneme nová data z API
      const res = await apiFetch('sports?only_active=1');
      const freshSports = res.data || [];
      
      setSports(freshSports);
      await AsyncStorage.setItem(STORAGE_KEY_SPORTS, JSON.stringify(freshSports));
      await AsyncStorage.setItem(STORAGE_KEY_SPORTS_SYNC, now.toString());
    } catch (err) {
      // Pokud jsme offline a spadne to, zkusíme aspoň vzít stará data z cache
      const fallback = await AsyncStorage.getItem(STORAGE_KEY_SPORTS);
      if (fallback) setSports(JSON.parse(fallback));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncSports();
  }, []);

  return { sports, loading };
}