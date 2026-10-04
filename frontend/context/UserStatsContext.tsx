import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../services/api';
import { useAuth } from './AuthContext';
import { UserProfile, Visit } from '../types/user';
import { Place } from '../types/place';
import { Sport } from '../types/sport';
import { LocalPhoto, QueuedVisit } from '../types/visit';
import { createExistingVisitLookup, flushQueue, getQueuedVisits, onQueueChange } from '../services/offlineQueue';
import { enqueuePhotos, flushPhotoQueue, PhotoFlushResult } from '../services/photos';
import { invalidatePlacePhotos } from '../services/placePhotos';
import { CreatedVisit } from '../services/visits';
import { withCombinationOrders } from '../utils/visitRules';
import { showToast } from '../utils/alert';
import { plural } from '../utils/plural';

const STORAGE_KEY_USER = 'cached_user_profile';
const FLUSH_INTERVAL_MS = 30_000;
const FLUSH_BOOT_DELAY_MS = 2_500;

interface UserStatsContextValue {
  profile: UserProfile | null;
  /** Server visits + visits waiting in the offline queue, newest first, with combination orders. */
  visits: Visit[];
  lastVisit: Visit | null;
  totalPoints: number;
  loading: boolean;
  queuedVisits: QueuedVisit[];
  pendingCount: number;
  refreshStats: () => Promise<void>;
  addConfirmedVisit: (visit: CreatedVisit, place: Place, sport: Sport) => void;
  flushNow: () => Promise<void>;
  /** Uploads photos of a saved visit, they wait in a queue while offline. */
  uploadVisitPhotos: (visitId: number, placeId: number, photos: LocalPhoto[]) => Promise<void>;
}

const UserStatsContext = createContext<UserStatsContextValue | undefined>(undefined);

/** Visits from the offline queue carry negative client ids. */
export const isPendingVisit = (visit: Visit): boolean => visit.id < 0;

function queuedToVisit(q: QueuedVisit, userId: number): Visit | null {
  if (!q.place || !q.sport) return null;
  return {
    id: q.clientId,
    reward: q.reward,
    user_id: q.user_id ?? userId,
    place_id: q.place_id,
    sport_id: q.sport_id,
    is_combination: q.is_combination,
    timestamp: q.timestamp,
    combination_order: null,
    place: q.place,
    sport: q.sport,
  };
}

export function UserStatsProvider({ children }: { children: React.ReactNode }) {
  const { token, userId } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [queuedVisits, setQueuedVisits] = useState<QueuedVisit[]>([]);
  const [loading, setLoading] = useState(true);

  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const storeProfile = useCallback((next: UserProfile) => {
    setProfile(next);
    AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(next)).catch(() => {});
  }, []);

  const reloadQueue = useCallback(async () => {
    const queue = await getQueuedVisits(userIdRef.current);
    setQueuedVisits(queue);
  }, []);

  const refreshStats = useCallback(async () => {
    const id = userIdRef.current;
    if (id == null) return;
    try {
      const res = await apiFetch<{ data: UserProfile }>(`users/${id}`);
      if (userIdRef.current === id) storeProfile(res.data);
    } catch {
      // Offline: keep showing the cached profile.
    } finally {
      setLoading(false);
    }
  }, [storeProfile]);

  useEffect(() => {
    if (!token || userId == null) {
      setProfile(null);
      setQueuedVisits([]);
      setLoading(false);
      AsyncStorage.removeItem(STORAGE_KEY_USER).catch(() => {});
      return;
    }

    let active = true;
    setLoading(true);
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY_USER);
        const cached: UserProfile | null = raw ? JSON.parse(raw) : null;
        if (active && cached?.id === userId) setProfile(cached);
      } catch {
        // Corrupted cache is simply ignored.
      }
      if (active) await Promise.all([reloadQueue(), refreshStats()]);
    })();

    return () => {
      active = false;
    };
  }, [token, userId, reloadQueue, refreshStats]);

  useEffect(() => onQueueChange(() => void reloadQueue()), [reloadQueue]);

  const reportPhotos = useCallback((result: PhotoFlushResult) => {
    result.placeIds.forEach(invalidatePlacePhotos);
    if (result.uploaded > 0) {
      const n = result.uploaded;
      showToast(n === 1 ? 'Fotka nahrána' : `Nahráno ${n} ${plural(n, ['fotka', 'fotky', 'fotek'])}`, undefined, 'success');
    }
    if (result.rejected.length > 0) {
      showToast(
        result.rejected.length === 1 ? 'Fotka nebyla přijata' : `${result.rejected.length} fotky nebyly přijaty`,
        result.rejected[0],
        'danger'
      );
    }
    if (result.lost > 0) {
      showToast('Fotku se nepodařilo najít', 'Mezitím zmizela z telefonu, takže se neodeslala.', 'danger');
    }
  }, []);

  const flushNow = useCallback(async () => {
    const id = userIdRef.current;
    if (id == null) return;
    const result = await flushQueue(id, createExistingVisitLookup(id));
    if (result && (result.synced > 0 || result.dropped.length > 0)) {
      await refreshStats();
    }
    if (result && result.synced > 0) {
      const n = result.synced;
      showToast(
        n === 1 ? 'Čekající návštěva odeslána' : `Odesláno ${n} ${plural(n, ['návštěva', 'návštěvy', 'návštěv'])}`,
        n === 1 ? 'Návštěva uložená bez připojení už je na serveru.' : 'Návštěvy uložené bez připojení už jsou na serveru.',
        'success'
      );
    }
    if (result && result.dropped.length > 0) {
      const lines = result.dropped.map(({ entry, reason }) => `${entry.place_name || 'Návštěva'}: ${reason}`);
      showToast(
        result.dropped.length === 1 ? 'Návštěva nebyla uznána' : 'Některé návštěvy nebyly uznány',
        lines.join('\n'),
        'danger'
      );
    }
    // Photos go after the visits, they need the server id of their visit.
    reportPhotos(await flushPhotoQueue(id));
  }, [refreshStats, reportPhotos]);

  const uploadVisitPhotos = useCallback(
    async (visitId: number, placeId: number, photos: LocalPhoto[]) => {
      if (photos.length === 0) return;
      try {
        await enqueuePhotos(userIdRef.current, visitId, placeId, photos);
      } catch {
        showToast('Fotky se nepodařilo uložit', 'V zařízení na ně není místo.', 'danger');
        return;
      }
      const result = await flushPhotoQueue(userIdRef.current);
      reportPhotos(result);
      const waiting = photos.length - result.uploaded - result.rejected.length - result.lost;
      if (waiting > 0) {
        showToast('Fotky čekají na připojení', 'Odešleme je, jakmile budeš online.', 'info');
      }
    },
    [reportPhotos]
  );

  useEffect(() => {
    if (userId == null) return;

    const bootTimer = setTimeout(() => void flushNow(), FLUSH_BOOT_DELAY_MS);
    const interval = setInterval(() => void flushNow(), FLUSH_INTERVAL_MS);
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void flushNow();
    });

    const onOnline = () => void flushNow();
    const hasWindowEvents = Platform.OS === 'web' && typeof window !== 'undefined';
    if (hasWindowEvents) window.addEventListener('online', onOnline);

    return () => {
      clearTimeout(bootTimer);
      clearInterval(interval);
      appSub.remove();
      if (hasWindowEvents) window.removeEventListener('online', onOnline);
    };
  }, [userId, flushNow]);

  const addConfirmedVisit = useCallback(
    (created: CreatedVisit, place: Place, sport: Sport) => {
      setProfile((prev) => {
        if (!prev) return prev;
        const visit: Visit = {
          id: created.id,
          reward: created.reward,
          user_id: created.user_id,
          place_id: created.place_id,
          sport_id: created.sport_id,
          is_combination: created.is_combination,
          timestamp: created.timestamp,
          combination_order: null,
          place,
          sport,
        };
        const next: UserProfile = {
          ...prev,
          totalPoints: prev.totalPoints + created.reward,
          visitsCombinations: [...prev.visitsCombinations, visit],
        };
        AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(next)).catch(() => {});
        return next;
      });
      void refreshStats();
    },
    [refreshStats]
  );

  const derived = useMemo(() => {
    const pending = queuedVisits
      .map((q) => queuedToVisit(q, userId ?? 0))
      .filter((v): v is Visit => v !== null);
    const visits = withCombinationOrders([...(profile?.visitsCombinations ?? []), ...pending]);
    const pendingPoints = queuedVisits.reduce((sum, q) => sum + q.reward, 0);
    return {
      visits,
      lastVisit: visits[0] ?? null,
      totalPoints: (profile?.totalPoints ?? 0) + pendingPoints,
    };
  }, [profile, queuedVisits, userId]);

  const value = useMemo<UserStatsContextValue>(
    () => ({
      profile,
      ...derived,
      loading,
      queuedVisits,
      pendingCount: queuedVisits.length,
      refreshStats,
      addConfirmedVisit,
      flushNow,
      uploadVisitPhotos,
    }),
    [profile, derived, loading, queuedVisits, refreshStats, addConfirmedVisit, flushNow, uploadVisitPhotos]
  );

  return <UserStatsContext.Provider value={value}>{children}</UserStatsContext.Provider>;
}

export function useUserStats(): UserStatsContextValue {
  const ctx = useContext(UserStatsContext);
  if (!ctx) throw new Error('useUserStats musí být použit uvnitř UserStatsProvideru');
  return ctx;
}
