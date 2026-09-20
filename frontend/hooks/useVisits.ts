import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../services/api';

const OFFLINE_QUEUE_KEY = 'offline_visits_queue';

export function useVisits() {

  const saveVisit = async (placeId: number, sportId: number, isCombination: boolean) => {
    // Vytvoříme časové razítko podle ISO standardu (to chce backend)
    const timestamp = new Date().toISOString(); 
    const payload = { place_id: placeId, sport_id: sportId, is_combination: isCombination, timestamp };

    try {
      // 1. Zkusíme to poslat online
      const res = await apiFetch('visits', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return { success: true, isOffline: false, data: res.data };

    } catch (err: any) {
      // 2. Kontrola, jestli jde o podvod (Backend hodí error 400)
      if (err.status_code === 400) {
        throw new Error(err.error_message || 'Návštěva byla zamítnuta jako neplatná.');
      }

      // 3. Pokud je to chyba sítě (jsme offline nebo spadl server), uložíme do fronty!
      try {
        const existingQueueStr = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
        const queue = existingQueueStr ? JSON.parse(existingQueueStr) : [];
        queue.push(payload);
        await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
        
        return { success: true, isOffline: true };
      } catch (storageErr) {
        throw new Error('Nepodařilo se uložit návštěvu ani do lokální paměti.');
      }
    }
  };

  return { saveVisit };
}