import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isPendingVisit, useUserStats } from '../../../context/UserStatsContext';
import { QueuedVisit } from '../../../types/visit';
import { Visit } from '../../../types/user';
import { formatVisitTime } from '../../../utils/dates';
import { plural } from '../../../utils/plural';
import { colors, radius, shadows, typography } from '../../../utils/theme';

function QueuedRow({ item }: { item: QueuedVisit }) {
    return (
        <View style={styles.queuedItem}>
            <View style={styles.queuedIcon}>
                <Ionicons name="cloud-offline-outline" size={20} color={colors.accentText} />
            </View>
            <View style={styles.itemBody}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.place_name || `Místo #${item.place_id}`}
                </Text>
                <Text style={styles.itemMeta}>
                    {item.sport_name ? `${item.sport_name} · ` : ''}
                    {formatVisitTime(item.timestamp)}
                </Text>
            </View>
            <Text style={styles.itemReward}>+{item.reward}</Text>
        </View>
    );
}

function VisitRow({ item }: { item: Visit }) {
    const comboLevel = Math.min(item.combination_order ?? 1, 4);
    return (
        <View style={styles.visitItem}>
            <View style={styles.itemBody}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.place?.name || `Místo #${item.place_id}`}
                </Text>
                <Text style={styles.itemMeta} numberOfLines={1}>
                    {item.sport?.name ?? 'Sport'} · {formatVisitTime(item.timestamp)}
                </Text>
                {item.is_combination && (
                    <View style={styles.comboTagRow}>
                        <Ionicons name="git-merge-outline" size={12} color={colors.skyText} />
                        <Text style={styles.comboTag}>Kombinace ×{comboLevel}</Text>
                    </View>
                )}
            </View>
            <View style={styles.rewardTag}>
                <Text style={styles.rewardTagText}>+{item.reward} b.</Text>
            </View>
        </View>
    );
}

export default function VisitsScreen() {
    const { visits, totalPoints, queuedVisits, pendingCount, refreshStats, flushNow, loading, profile } = useUserStats();
    const [syncing, setSyncing] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const history = useMemo(() => visits.filter((v) => !isPendingVisit(v)), [visits]);
    const comboCount = useMemo(() => visits.filter((v) => v.is_combination).length, [visits]);

    const handleSync = useCallback(async () => {
        setSyncing(true);
        try {
            await flushNow();
        } finally {
            setSyncing(false);
        }
    }, [flushNow]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await flushNow();
            await refreshStats();
        } finally {
            setRefreshing(false);
        }
    }, [flushNow, refreshStats]);

    if (loading && !profile) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const header = (
        <>
            <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{totalPoints}</Text>
                    <Text style={styles.statLabel}>{plural(totalPoints, ['bod', 'body', 'bodů'])}</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{visits.length}</Text>
                    <Text style={styles.statLabel}>{plural(visits.length, ['návštěva', 'návštěvy', 'návštěv'])}</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{comboCount}</Text>
                    <Text style={styles.statLabel}>{plural(comboCount, ['kombinace', 'kombinace', 'kombinací'])}</Text>
                </View>
            </View>

            <View style={styles.syncCard}>
                <View style={styles.syncIcon}>
                    <Ionicons
                        name={pendingCount > 0 ? 'cloud-offline-outline' : 'cloud-done-outline'}
                        size={22}
                        color={pendingCount > 0 ? colors.warnText : colors.primaryDark}
                    />
                </View>
                <View style={styles.syncBody}>
                    <Text style={styles.syncTitle}>
                        {pendingCount > 0
                            ? `${pendingCount} ${plural(pendingCount, ['návštěva čeká', 'návštěvy čekají', 'návštěv čeká'])} na odeslání`
                            : 'Vše je synchronizováno'}
                    </Text>
                    <Text style={styles.syncMeta}>
                        {pendingCount > 0
                            ? 'Nahraje se automaticky, jakmile budeš mít signál.'
                            : 'Offline fronta je prázdná.'}
                    </Text>
                </View>
                {pendingCount > 0 && (
                    <TouchableOpacity
                        style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
                        onPress={handleSync}
                        disabled={syncing}
                    >
                        {syncing ? (
                            <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                            <Text style={styles.syncButtonText}>Odeslat</Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>

            {queuedVisits.length > 0 && (
                <View style={styles.list}>
                    <Text style={styles.sectionTitle}>Čeká na odeslání</Text>
                    {queuedVisits.map((q) => (
                        <QueuedRow key={q.id} item={q} />
                    ))}
                </View>
            )}

            <Text style={styles.sectionTitle}>Historie návštěv</Text>
        </>
    );

    return (
        <FlatList
            style={styles.container}
            contentContainerStyle={styles.content}
            data={history}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => <VisitRow item={item} />}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
            }
            ListHeaderComponent={header}
            ListEmptyComponent={
                <View style={styles.emptyBox}>
                    <Ionicons name="footsteps-outline" size={40} color={colors.inactive} />
                    <Text style={styles.emptyText}>Zatím žádné návštěvy.</Text>
                    <Text style={styles.emptyHint}>Zkus navštívit nějaké místo na mapě.</Text>
                </View>
            }
        />
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    statCard: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    statValue: { fontSize: 21, fontWeight: '900', color: colors.navy },
    statLabel: { fontSize: 12, color: colors.muted, fontWeight: '700', marginTop: 2 },
    syncCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: 14,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadows.card,
    },
    syncIcon: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: colors.primaryBg,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    syncBody: { flex: 1 },
    syncTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
    syncMeta: { fontSize: 13, color: colors.muted, marginTop: 3 },
    syncButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: radius.sm + 4,
        ...shadows.button,
    },
    syncButtonDisabled: { opacity: 0.6 },
    syncButtonText: { color: colors.white, fontWeight: '800', fontSize: 14 },
    sectionTitle: { ...typography.sectionTitle, marginBottom: 10, marginTop: 6 },
    list: { marginBottom: 8 },
    queuedItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.warnBg,
        borderRadius: radius.md,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.warnBorder,
        marginBottom: 8,
    },
    queuedIcon: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: colors.warnBorder,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    visitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 8,
        ...shadows.card,
    },
    visitIcon: {
        width: 40,
        height: 40,
        borderRadius: radius.full,
        backgroundColor: colors.primaryBg,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    itemBody: { flex: 1, marginRight: 8 },
    itemTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    itemMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
    comboTagRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
    comboTag: { color: colors.skyText, fontSize: 12, fontWeight: '800' },
    rewardTag: { backgroundColor: colors.primaryBg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    rewardTagText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
    rewardWrap: { alignItems: 'flex-end' },
    itemReward: { fontSize: 17, fontWeight: '900', color: colors.primary },
    rewardUnit: { fontSize: 11, color: colors.muted, fontWeight: '700', textTransform: 'uppercase' },
    emptyBox: {
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        gap: 6,
    },
    emptyText: { color: colors.text, fontWeight: '800', fontSize: 16, marginTop: 4 },
    emptyHint: { color: colors.muted, fontWeight: '600', textAlign: 'center' },
});
