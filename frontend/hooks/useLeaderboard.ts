import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { apiFetch, getErrorMessage } from '../services/api';

export interface LeaderboardEntry {
    id: number;
    name: string;
    avatar_url: string | null;
    total_points: number;
    rank: number;
}

interface LeaderboardResponse {
    leaderboard: LeaderboardEntry[];
    current_user: LeaderboardEntry | null;
    total_users?: number;
}

// Aggregates from the SQL query may arrive as strings depending on the DB driver.
const normalize = (e: LeaderboardEntry): LeaderboardEntry => ({
    ...e,
    id: Number(e.id),
    total_points: Number(e.total_points),
    rank: Number(e.rank),
});

export function useLeaderboard() {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [currentUser, setCurrentUser] = useState<LeaderboardEntry | null>(null);
    const [totalUsers, setTotalUsers] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inFlight = useRef(false);

    const fetchBoard = useCallback(async (pullToRefresh: boolean) => {
        if (inFlight.current) return;
        inFlight.current = true;
        if (pullToRefresh) setRefreshing(true);
        try {
            const res = await apiFetch<LeaderboardResponse>('users/leaderboard');
            setEntries((res.leaderboard ?? []).map(normalize));
            setCurrentUser(res.current_user ? normalize(res.current_user) : null);
            setTotalUsers(res.total_users != null ? Number(res.total_users) : null);
            setError(null);
        } catch (err) {
            setError(getErrorMessage(err, 'Nepodařilo se načíst žebříček.'));
        } finally {
            inFlight.current = false;
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            void fetchBoard(false);
        }, [fetchBoard])
    );

    const refresh = useCallback(() => fetchBoard(true), [fetchBoard]);

    return { entries, currentUser, totalUsers, loading, refreshing, error, refresh };
}
