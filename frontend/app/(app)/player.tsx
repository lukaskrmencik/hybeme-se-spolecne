import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch, getErrorMessage, resolveMediaUrl } from '../../services/api';
import { PublicProfile } from '../../types/user';
import { Avatar } from '../../components/Avatar';
import { VisitJournal } from '../../components/VisitJournal';
import { fromPublicVisit } from '../../utils/visitJournal';
import { formatNumber } from '../../utils/format';
import { plural } from '../../utils/plural';
import { colors, radius, typography } from '../../utils/theme';

/**
 * Another player's visits and combinations, opened from the leaderboard.
 * The id is in the query (/player?id=9), so the page is one static file the web server finds without extra rules.
 */
export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    if (!Number(id)) {
      setError('Hráč nebyl nalezen.');
      return;
    }
    try {
      const res = await apiFetch<{ data: PublicProfile }>(`users/${Number(id)}/profile`);
      setProfile(res.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Profil se nepodařilo načíst.'));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const visits = useMemo(() => (profile?.visits ?? []).map(fromPublicVisit), [profile]);
  const combos = useMemo(() => visits.filter((v) => v.isCombination).length, [visits]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/leaderboard'));

  const head = (
    <View style={[styles.head, { paddingTop: insets.top + 10 }]}>
      <Pressable onPress={back} style={styles.back} hitSlop={8} accessibilityRole="button" accessibilityLabel="Zpět">
        <Ionicons name="chevron-back" size={22} color={colors.white} />
      </Pressable>
      {profile && (
        <View style={styles.who}>
          <Avatar name={profile.name} url={profile.avatar_url ? resolveMediaUrl(profile.avatar_url) : null} size={60} />
          <View style={styles.whoText}>
            <Text style={styles.name} numberOfLines={2}>
              {profile.name}
            </Text>
            <Text style={styles.stats}>
              {formatNumber(profile.total_points)} {plural(profile.total_points, ['bod', 'body', 'bodů'])} ·{' '}
              {profile.visits_count} {plural(profile.visits_count, ['návštěva', 'návštěvy', 'návštěv'])}
              {combos > 0 ? ` · ${combos} ${plural(combos, ['kombinace', 'kombinace', 'kombinací'])}` : ''}
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {head}
      {error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retry} onPress={() => void load()}>
            <Text style={styles.retryText}>Zkusit znovu</Text>
          </Pressable>
        </View>
      ) : !profile ? (
        <ActivityIndicator style={styles.spinner} size="large" color={colors.primary} />
      ) : (
        <VisitJournal
          visits={visits}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
              }}
              tintColor={colors.primary}
            />
          }
          header={
            <View>
              <Text style={styles.sectionTitle}>Návštěvy</Text>
              {profile.hidden_recent && (
                <Text style={styles.note}>Návštěvy z posledních 24 hodin se ostatním zobrazí až později.</Text>
              )}
            </View>
          }
          empty={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Zatím tu nejsou žádné návštěvy.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  head: { backgroundColor: colors.navy, paddingHorizontal: 16, paddingBottom: 20, gap: 12 },
  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  who: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  whoText: { flex: 1, gap: 4 },
  name: { color: colors.white, fontSize: 22, fontWeight: '900' },
  stats: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '700' },
  sectionTitle: { ...typography.sectionTitle, marginBottom: 10, marginTop: 2 },
  note: { color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: -4, marginBottom: 10 },
  spinner: { marginTop: 40 },
  center: { alignItems: 'center', gap: 12, padding: 32 },
  errorText: { color: colors.navy, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  retry: { backgroundColor: colors.navy, paddingHorizontal: 18, paddingVertical: 10, borderRadius: radius.md },
  retryText: { color: colors.white, fontWeight: '800' },
  empty: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: { color: colors.navy, fontWeight: '700', fontSize: 15, textAlign: 'center' },
});
