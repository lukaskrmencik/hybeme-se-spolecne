import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { apiFetch } from '../services/api';
import { getToken } from '../services/storage';
import { UserProfile, Visit } from '../types/user';

const STORAGE_KEY_USER = 'cached_user_profile';

export function useUserStats() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [lastVisit, setLastVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserStats = async (force = false) => {
    try {
      setLoading(true);
      
      // 1. Přečteme ID uživatele z tokenu
      const token = await getToken();
      if (!token) throw new Error('Chybí token');
      
      const decoded: any = jwtDecode(token);
      const userId = decoded.sub || decoded.user_id;

      // 2. Offline podpora: načteme nejdřív lokální kopii (abychom měli data okamžitě)
      const cached = await AsyncStorage.getItem(STORAGE_KEY_USER);
      if (cached && !force) {
        const parsed = JSON.parse(cached);
        setProfile(parsed);
        // Poslední návštěva je ta úplně první v poli (předpokládáme, že API je řadí od nejnovější)
        if (parsed.visitsCombinations?.length > 0) {
          setLastVisit(parsed.visitsCombinations[0]);
        }
      }

      // 3. Stáhneme čerstvá data ze serveru (na pozadí se data přepíšou těmi nejnovějšími)
      const res = await apiFetch(`users/${userId}`);
      const freshData: UserProfile = res.data;
      
      setProfile(freshData);
      
      if (freshData.visitsCombinations?.length > 0) {
        // Seřadíme pro jistotu podle data od nejnovějšího (od nejvyššího ID nebo data)
        const sortedVisits = freshData.visitsCombinations.sort((a, b) => b.id - a.id);
        setLastVisit(sortedVisits[0]);
      } else {
        setLastVisit(null);
      }

      // 4. Uložíme si nová data do paměti pro příští offline spuštění
      await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(freshData));
      
    } catch (err) {
      console.log('User stats offline mode (bez internetu) nebo chyba:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserStats();
  }, []);

  return { 
    profile, 
    lastVisit, 
    loading, 
    refreshStats: () => fetchUserStats(true) 
  };
}