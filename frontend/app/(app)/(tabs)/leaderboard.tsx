import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../../context/AuthContext';
import { useLeaderboard, LeaderboardEntry } from '../../../hooks/useLeaderboard';
import { Avatar } from '../../../components/Avatar';
import { colors, radius } from '../../../utils/theme';
import { formatNumber } from '../../../utils/format';

export default function LeaderboardScreen() {
    const { entries, currentUser, totalUsers, loading, refreshing, error, refresh } = useLeaderboard();
    const { userId } = useAuth();
    const insets = useSafeAreaInsets();
    const focused = useIsFocused();

    if (loading && entries.length === 0) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const currentUserId = Number(userId ?? currentUser?.id ?? 0);

    const renderRow = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
        const rank = item.rank || index + 1;
        const isMe = item.id === currentUserId;
        return (
            <View style={[styles.row, isMe && styles.rowMe]}>
                <Text style={[styles.rank, rank === 1 && styles.rankFirst]}>{rank}</Text>
                <Avatar name={item.name} url={item.avatar_url} size={38} background={isMe ? colors.surface : undefined} />
                <Text style={styles.name} numberOfLines={1}>
                    {isMe ? `${item.name} (ty)` : item.name}
                </Text>
                <Text style={styles.points}>{formatNumber(item.total_points)}</Text>
            </View>
        );
    };

    const who =
        totalUsers != null
            ? `Tvoje pozice\nz ${formatNumber(totalUsers)} ${totalUsers === 1 ? 'hráče' : 'hráčů'}`
            : 'Tvoje pozice';

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
                        <Text style={styles.mePointsLabel}>bodů</Text>
                    </View>
                </View>
            </View>

            <FlatList
                style={styles.list}
                contentContainerStyle={styles.content}
                data={entries}
                keyExtractor={(item) => `${item.id}`}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.primary} />}
                renderItem={renderRow}
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyText}>{error ? 'Žebříček se nepodařilo načíst.' : 'Žebříček je zatím prázdný.'}</Text>
                        {error && (
                            <TouchableOpacity style={styles.retryButton} onPress={() => void refresh()}>
                                <Text style={styles.retryText}>Zkusit znovu</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
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
    list: { flex: 1 },
    content: { paddingVertical: 12, paddingHorizontal: 14 },
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
