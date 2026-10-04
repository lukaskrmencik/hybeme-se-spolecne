import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { useLeaderboard, useLeaderboardWeeks, LeaderboardEntry, LeaderboardWeek } from '../../../hooks/useLeaderboard';
import { Avatar } from '../../../components/Avatar';
import { colors, radius } from '../../../utils/theme';
import { formatNumber } from '../../../utils/format';
import { plural } from '../../../utils/plural';
import { ReportDialog } from '../../../components/ReportDialog';
import { ReportTarget } from '../../../services/reports';

type Tab = 'all' | 'week' | 'history';

const TABS: { value: Tab; label: string }[] = [
    { value: 'all', label: 'Celkový' },
    { value: 'week', label: 'Tento týden' },
    { value: 'history', label: 'Historie' },
];

/** Gold, silver and bronze for the weekly podium. */
const MEDALS: Record<number, { bg: string; fg: string }> = {
    1: { bg: '#F4D35E', fg: '#6B5100' },
    2: { bg: '#D5DBE1', fg: '#46525C' },
    3: { bg: '#E3A774', fg: '#6A3A12' },
};

/** "2026-09-28" -> "28. 9."; with the year for the end of a range. */
function formatDay(ymd: string, withYear = false): string {
    const [y, m, d] = ymd.split('-').map(Number);
    return withYear ? `${d}. ${m}. ${y}` : `${d}. ${m}.`;
}

const weekRange = (start: string, end: string) => `${formatDay(start)} – ${formatDay(end, true)}`;

export default function LeaderboardScreen() {
    const [tab, setTab] = useState<Tab>('all');
    const board = useLeaderboard(tab === 'week' ? 'week' : 'all');
    const history = useLeaderboardWeeks(tab === 'history');
    const { userId } = useAuth();
    const insets = useSafeAreaInsets();
    const focused = useIsFocused();
    const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);

    const { entries, currentUser, totalUsers, week, loading, refreshing, error, refresh } = board;
    const currentUserId = Number(userId ?? currentUser?.id ?? 0);

    const renderRow = ({ item }: { item: LeaderboardEntry }) => {
        const isMe = item.id === currentUserId;
        return (
            <View style={[styles.row, isMe && styles.rowMe]}>
                <Text style={[styles.rank, item.rank === 1 && styles.rankFirst]}>{item.rank}</Text>
                <Avatar name={item.name} url={item.avatar_url} size={38} background={isMe ? colors.surface : undefined} />
                <Text style={styles.name} numberOfLines={1}>
                    {isMe ? `${item.name} (ty)` : item.name}
                </Text>
                <Text style={styles.points}>{formatNumber(item.total_points)}</Text>
                {!isMe && (
                    <TouchableOpacity
                        onPress={() =>
                            setReportTarget({ kind: 'user', userId: item.id, name: item.name, hasAvatar: !!item.avatar_url })
                        }
                        hitSlop={10}
                        style={styles.report}
                        accessibilityRole="button"
                        accessibilityLabel={`Nahlásit uživatele ${item.name}`}
                    >
                        <Ionicons name="flag-outline" size={15} color={colors.inactive} />
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const renderWeek = ({ item }: { item: LeaderboardWeek }) => (
        <View style={styles.weekCard}>
            <Text style={styles.weekTitle}>Týden {weekRange(item.week_start, item.week_end)}</Text>
            {item.podium.map((p) => {
                const medal = MEDALS[p.rank] ?? MEDALS[3];
                const isMe = p.id === currentUserId;
                return (
                    <View key={`${p.rank}-${p.id}`} style={styles.podiumRow}>
                        <View style={[styles.medal, { backgroundColor: medal.bg }]}>
                            <Text style={[styles.medalText, { color: medal.fg }]}>{p.rank}</Text>
                        </View>
                        <Avatar name={p.name} url={p.avatar_url} size={32} />
                        <Text style={[styles.podiumName, isMe && styles.podiumMe]} numberOfLines={1}>
                            {isMe ? `${p.name} (ty)` : p.name}
                        </Text>
                        <Text style={styles.podiumPoints}>{formatNumber(p.points)} b.</Text>
                    </View>
                );
            })}
        </View>
    );

    const players = totalUsers != null ? `z ${formatNumber(totalUsers)} ${plural(totalUsers, ['hráče', 'hráčů', 'hráčů'])}` : '';
    const who = tab === 'week' ? `Tento týden\n${players}` : `Tvoje pozice\n${players}`;

    const tabs = (
        <View style={styles.tabs} accessibilityRole="tablist">
            {TABS.map((t) => {
                const active = t.value === tab;
                return (
                    <Pressable
                        key={t.value}
                        onPress={() => setTab(t.value)}
                        style={[styles.tab, active && styles.tabActive]}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: active }}
                    >
                        <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
                    </Pressable>
                );
            })}
        </View>
    );

    const retry = (onPress: () => void) => (
        <TouchableOpacity style={styles.retryButton} onPress={onPress}>
            <Text style={styles.retryText}>Zkusit znovu</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {focused && <StatusBar style="light" />}
            <View style={[styles.head, { paddingTop: insets.top + 18 }]}>
                <View style={styles.arc} />
                <Text style={styles.headTitle}>Žebříček</Text>
                <View style={styles.me}>
                    <Text style={styles.meRank}>
                        <Text style={styles.meHash}>#</Text>
                        {currentUser?.rank ? currentUser.rank : '–'}
                    </Text>
                    <Text style={styles.meWho}>{who}</Text>
                    <View style={styles.mePoints}>
                        <Text style={styles.mePointsValue}>{formatNumber(currentUser?.total_points ?? 0)}</Text>
                        <Text style={styles.mePointsLabel}>{tab === 'week' ? 'bodů za týden' : 'bodů'}</Text>
                    </View>
                </View>
            </View>

            {tabs}

            {tab === 'history' ? (
                <FlatList
                    key="history"
                    style={styles.list}
                    contentContainerStyle={styles.content}
                    data={history.weeks ?? []}
                    keyExtractor={(w) => w.week_start}
                    refreshControl={
                        <RefreshControl refreshing={history.refreshing} onRefresh={() => void history.refresh()} tintColor={colors.primary} />
                    }
                    renderItem={renderWeek}
                    ListHeaderComponent={<Text style={styles.listHint}>Nejlepší tři z každého ukončeného týdne.</Text>}
                    ListEmptyComponent={
                        history.weeks == null && !history.error ? (
                            <ActivityIndicator style={styles.spinner} color={colors.primary} />
                        ) : (
                            <View style={styles.emptyBox}>
                                <Text style={styles.emptyText}>
                                    {history.error ? 'Historii se nepodařilo načíst.' : 'Zatím neskončil žádný týden. První výsledky tu budou v pondělí.'}
                                </Text>
                                {!!history.error && retry(() => void history.refresh())}
                            </View>
                        )
                    }
                />
            ) : (
                <FlatList
                    key={tab}
                    style={styles.list}
                    contentContainerStyle={styles.content}
                    data={entries}
                    keyExtractor={(item) => `${item.id}`}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.primary} />}
                    renderItem={renderRow}
                    ListHeaderComponent={
                        tab === 'week' && week ? (
                            <Text style={styles.listHint}>
                                {weekRange(week.start, week.end)} · nový týden začíná vždy v pondělí
                            </Text>
                        ) : null
                    }
                    ListEmptyComponent={
                        loading ? (
                            <ActivityIndicator style={styles.spinner} color={colors.primary} />
                        ) : (
                            <View style={styles.emptyBox}>
                                <Text style={styles.emptyText}>
                                    {error
                                        ? 'Žebříček se nepodařilo načíst.'
                                        : tab === 'week'
                                          ? 'Tento týden zatím nikdo nebodoval. Buď první!'
                                          : 'Žebříček je zatím prázdný.'}
                                </Text>
                                {!!error && retry(() => void refresh())}
                            </View>
                        )
                    }
                />
            )}
            <ReportDialog target={reportTarget} onClose={() => setReportTarget(null)} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    head: { backgroundColor: colors.navy, paddingHorizontal: 18, paddingBottom: 22, overflow: 'hidden' },
    arc: {
        position: 'absolute',
        right: -40,
        top: -60,
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 6,
        borderColor: 'rgba(139,181,60,0.35)',
    },
    headTitle: { color: colors.white, fontSize: 18, fontWeight: '900', marginBottom: 14 },
    me: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    meRank: { color: colors.white, fontSize: 38, fontWeight: '900', lineHeight: 38 },
    meHash: { fontSize: 15, lineHeight: 15, fontWeight: '800', opacity: 0.7 },
    meWho: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '700', flex: 1 },
    mePoints: { alignItems: 'flex-end' },
    mePointsValue: { color: colors.accent, fontSize: 24, fontWeight: '900', lineHeight: 32 },
    mePointsLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700', lineHeight: 16, marginTop: 4, marginBottom: 2 },

    tabs: {
        flexDirection: 'row',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    tab: { flex: 1, height: 36, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
    tabActive: { backgroundColor: colors.navy },
    tabText: { color: colors.navy, fontSize: 13, fontWeight: '800' },
    tabTextActive: { color: colors.white },

    list: { flex: 1 },
    content: { paddingVertical: 12, paddingHorizontal: 14 },
    listHint: { color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 10, marginLeft: 2 },
    spinner: { marginTop: 32 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    rowMe: { borderColor: colors.accent, backgroundColor: colors.accentBg },
    rank: { width: 26, textAlign: 'center', fontWeight: '900', color: colors.muted, fontSize: 16 },
    rankFirst: { color: colors.primary },
    name: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.navy },
    points: { fontWeight: '900', fontSize: 16, color: colors.navy },
    report: { marginLeft: 2, paddingLeft: 4 },

    weekCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
        gap: 10,
        marginBottom: 10,
    },
    weekTitle: { color: colors.navy, fontSize: 15, fontWeight: '900' },
    podiumRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    medal: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    medalText: { fontSize: 13, fontWeight: '900' },
    podiumName: { flex: 1, color: colors.navy, fontSize: 14, fontWeight: '800' },
    podiumMe: { color: colors.primary },
    podiumPoints: { color: colors.navy, fontSize: 14, fontWeight: '900' },

    emptyBox: {
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: 28,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        gap: 12,
    },
    emptyText: { color: colors.navy, fontWeight: '700', fontSize: 15, textAlign: 'center' },
    retryButton: { backgroundColor: colors.navy, paddingHorizontal: 18, paddingVertical: 10, borderRadius: radius.md },
    retryText: { color: colors.white, fontWeight: '800' },
});
