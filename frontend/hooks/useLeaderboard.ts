import { useState, useCallback, useRef, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { apiFetch, getErrorMessage, resolveMediaUrl } from '../services/api';

export type LeaderboardPeriod = 'all' | 'week';

export interface LeaderboardEntry {
    id: number;
    name: string;
    avatar_url: string | null;
    total_points: number;
    /** Equal points share a place (1, 1, 3). */
    rank: number;
}

interface LeaderboardResponse {
    leaderboard: LeaderboardEntry[];
    current_user: LeaderboardEntry | null;
    total_users?: number;
    /** Y-m-d, only for the weekly board. */
    week_start?: string | null;
    week_end?: string | null;
}

export interface WeekPodiumEntry {
    id: number;
    name: string;
    avatar_url: string | null;
    points: number;
    rank: number;
}

export interface LeaderboardWeek {
    week_start: string;
    week_end: string;
    podium: WeekPodiumEntry[];
}

// Aggregates from the SQL query may arrive as strings depending on the DB driver.
const normalize = (e: LeaderboardEntry): LeaderboardEntry => ({
    ...e,
    id: Number(e.id),
    total_points: Number(e.total_points),
    rank: Number(e.rank),
    avatar_url: e.avatar_url ? resolveMediaUrl(e.avatar_url) : null,
});

/** Overall or this week's board; refreshed whenever the tab gets focus. */
export function useLeaderboard(period: LeaderboardPeriod) {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [currentUser, setCurrentUser] = useState<LeaderboardEntry | null>(null);
    const [totalUsers, setTotalUsers] = useState<number | null>(null);
    const [week, setWeek] = useState<{ start: string; end: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const requestId = useRef(0);

    const fetchBoard = useCallback(
        async (pullToRefresh: boolean) => {
            const id = ++requestId.current;
            if (pullToRefresh) setRefreshing(true);
            try {
                const res = await apiFetch<LeaderboardResponse>(`users/leaderboard${period === 'week' ? '?period=week' : ''}`);
                if (id !== requestId.current) return; // the other board was picked meanwhile
                setEntries((res.leaderboard ?? []).map(normalize));
                setCurrentUser(res.current_user ? normalize(res.current_user) : null);
                setTotalUsers(res.total_users != null ? Number(res.total_users) : null);
                setWeek(res.week_start && res.week_end ? { start: res.week_start, end: res.week_end } : null);
                setError(null);
            } catch (err) {
                if (id === requestId.current) setError(getErrorMessage(err, 'Nepodařilo se načíst žebříček.'));
            } finally {
                if (id === requestId.current) {
                    setLoading(false);
                    setRefreshing(false);
                }
            }
        },
        [period]
    );

    // Switching the board shows a spinner instead of the other board's numbers.
    useEffect(() => {
        setLoading(true);
        setEntries([]);
    }, [period]);

    useFocusEffect(
        useCallback(() => {
            void fetchBoard(false);
        }, [fetchBoard])
    );

    const refresh = useCallback(() => fetchBoard(true), [fetchBoard]);

    return { entries, currentUser, totalUsers, week, loading, refreshing, error, refresh };
}

/** Finished weeks, newest first, with their top three places. Loaded only when `enabled`. */
export function useLeaderboardWeeks(enabled: boolean) {
    const [weeks, setWeeks] = useState<LeaderboardWeek[] | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (pullToRefresh: boolean) => {
        if (pullToRefresh) setRefreshing(true);
        try {
            const res = await apiFetch<{ weeks: LeaderboardWeek[] }>('users/leaderboard/weeks');
            setWeeks(
                (res.weeks ?? []).map((w) => ({
                    ...w,
                    podium: w.podium.map((p) => ({
                        ...p,
                        id: Number(p.id),
                        points: Number(p.points),
                        rank: Number(p.rank),
                        avatar_url: p.avatar_url ? resolveMediaUrl(p.avatar_url) : null,
                    })),
                }))
            );
            setError(null);
        } catch (err) {
            setError(getErrorMessage(err, 'Historii se nepodařilo načíst.'));
        } finally {
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            if (enabled) void load(false);
        }, [enabled, load])
    );

    return { weeks, refreshing, error, refresh: () => load(true) };
}
