import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiFetch, resolveMediaUrl } from '../../services/api';
import { Avatar } from '../Avatar';
import { formatNumber } from '../../utils/format';
import { plural } from '../../utils/plural';
import { colors, radius, shadows } from '../../utils/theme';

type Tab = 'all' | 'week' | 'history';

const TABS: { value: Tab; label: string }[] = [
  { value: 'all', label: 'Celkový' },
  { value: 'week', label: 'Tento týden' },
  { value: 'history', label: 'Historie' },
];

const PREVIEW_ROWS = 10;
const HISTORY_WEEKS = 4;

const MEDALS: Record<number, { bg: string; fg: string }> = {
  1: { bg: '#F4D35E', fg: '#6B5100' },
  2: { bg: '#D5DBE1', fg: '#46525C' },
  3: { bg: '#E3A774', fg: '#6A3A12' },
};

interface Entry {
  id: number;
  name: string;
  avatar_url: string | null;
  points: number;
  rank: number;
}

interface Week {
  start: string;
  end: string;
  podium: Entry[];
}

const toEntry = (e: { id: number | string; name: string; avatar_url: string | null; total_points?: number | string; points?: number | string; rank: number | string }): Entry => ({
  id: Number(e.id),
  name: e.name,
  avatar_url: e.avatar_url ? resolveMediaUrl(e.avatar_url) : null,
  points: Number(e.total_points ?? e.points ?? 0),
  rank: Number(e.rank),
});

interface SportOption {
  id: number;
  name: string;
}

const sportQuery = (sportId: number | null) => (sportId ? `sport_id=${sportId}` : '');

const day = (ymd: string, withYear = false) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return withYear ? `${d}. ${m}. ${y}` : `${d}. ${m}.`;
};

export function LandingLeaderboard() {
  const [tab, setTab] = useState<Tab>('all');
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [week, setWeek] = useState<{ start: string; end: string } | null>(null);
  const [weeks, setWeeks] = useState<Week[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sports, setSports] = useState<SportOption[]>([]);
  const [sportId, setSportId] = useState<number | null>(null);
  const sport = sports.find((s) => s.id === sportId) ?? null;

  const load = useCallback(async (which: Tab, sid: number | null) => {
    setFailed(false);
    try {
      if (which === 'history') {
        const q = sportQuery(sid);
        const res = await apiFetch<{ weeks: { week_start: string; week_end: string; podium: Parameters<typeof toEntry>[0][] }[] }>(
          `users/leaderboard/weeks${q ? `?${q}` : ''}`
        );
        setWeeks(res.weeks.slice(0, HISTORY_WEEKS).map((w) => ({ start: w.week_start, end: w.week_end, podium: w.podium.map(toEntry) })));
      } else {
        const res = await apiFetch<{
          leaderboard: Parameters<typeof toEntry>[0][];
          total_users: number;
          week_start?: string | null;
          week_end?: string | null;
          sports?: SportOption[];
        }>(`users/leaderboard?${[which === 'week' ? 'period=week' : '', sportQuery(sid)].filter(Boolean).join('&')}`);
        if (res.sports) setSports(res.sports.map((s) => ({ id: Number(s.id), name: s.name })));
        setEntries(res.leaderboard.map(toEntry));
        setTotal(Number(res.total_users) || 0);
        setWeek(res.week_start && res.week_end ? { start: res.week_start, end: res.week_end } : null);
      }
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    setEntries(null);
    setWeeks(null);
    setExpanded(false);
    void load(tab, sportId);
  }, [tab, sportId, load]);

  const shown = expanded ? entries ?? [] : (entries ?? []).slice(0, PREVIEW_ROWS);

  let body: React.ReactNode;
  if (failed) {
    body = (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Žebříček se teď nepodařilo načíst.</Text>
        <Pressable onPress={() => void load(tab, sportId)} style={styles.more} accessibilityRole="button">
          <Text style={styles.moreText}>Zkusit znovu</Text>
        </Pressable>
      </View>
    );
  } else if (tab === 'history') {
    body =
      weeks == null ? (
        <ActivityIndicator style={styles.spinner} color={colors.primary} />
      ) : weeks.length === 0 ? (
        <Text style={styles.emptyText}>
          {sport ? `Zatím tu nejsou žádné ukončené týdny se sportem ${sport.name}.` : 'Zatím neskončil žádný týden. První výsledky tu budou v pondělí.'}
        </Text>
      ) : (
        weeks.map((w) => (
          <View key={w.start} style={styles.week}>
            <Text style={styles.weekTitle}>
              Týden {day(w.start)} – {day(w.end, true)}
            </Text>
            {w.podium.map((p) => {
              const medal = MEDALS[p.rank] ?? MEDALS[3];
              return (
                <View key={`${p.rank}-${p.id}`} style={styles.podiumRow}>
                  <View style={[styles.medal, { backgroundColor: medal.bg }]}>
                    <Text style={[styles.medalText, { color: medal.fg }]}>{p.rank}</Text>
                  </View>
                  <Avatar name={p.name} url={p.avatar_url} size={30} />
                  <Text style={styles.name} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={styles.points}>{formatNumber(p.points)} b.</Text>
                </View>
              );
            })}
          </View>
        ))
      );
  } else if (entries == null) {
    body = <ActivityIndicator style={styles.spinner} color={colors.primary} />;
  } else if (entries.length === 0) {
    body = (
      <Text style={styles.emptyText}>
        {sport
          ? `${tab === 'week' ? 'Tento týden' : 'Zatím'} nikdo nebodoval se sportem ${sport.name}. Můžeš být první!`
          : tab === 'week'
            ? 'Tento týden zatím nikdo nebodoval. Můžeš být první!'
            : 'Žebříček je zatím prázdný.'}
      </Text>
    );
  } else {
    body = (
      <>
        {shown.map((e, i) => (
          <View key={e.id} style={[styles.row, i > 0 && styles.rowBorder]}>
            <Text style={[styles.rank, e.rank === 1 && styles.rankFirst]}>{e.rank}</Text>
            <Avatar name={e.name} url={e.avatar_url} size={34} />
            <Text style={styles.name} numberOfLines={1}>
              {e.name}
            </Text>
            <Text style={styles.points}>{formatNumber(e.points)}</Text>
          </View>
        ))}
        {!expanded && entries.length > PREVIEW_ROWS && (
          <Pressable onPress={() => setExpanded(true)} style={styles.more} accessibilityRole="button">
            <Text style={styles.moreText}>Zobrazit dalších {entries.length - PREVIEW_ROWS}</Text>
          </Pressable>
        )}
      </>
    );
  }

  const players = `${formatNumber(total)} ${plural(total, ['hráč', 'hráči', 'hráčů'])}`;
  const base =
    tab === 'history'
      ? 'Nejlepší tři z posledních ukončených týdnů'
      : tab === 'week' && week
        ? `${day(week.start)} – ${day(week.end, true)} · ${players}`
        : `${players} s body`;
  const subtitle = sport ? `${base} · jen ${sport.name.toLowerCase()}` : base;

  return (
    <View style={styles.card}>
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
      {sports.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportsBar} contentContainerStyle={styles.sports}>
          {[{ id: null as number | null, name: 'Všechny sporty' }, ...sports].map((s) => {
            const active = s.id === (sport ? sport.id : null);
            return (
              <Pressable
                key={s.id ?? 'all'}
                onPress={() => setSportId(s.id)}
                style={[styles.sport, active && styles.sportActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.sportText, active && styles.sportTextActive]}>{s.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      {!failed && (tab === 'history' || entries) && <Text style={styles.subtitle}>{subtitle}</Text>}
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, gap: 10, ...shadows.card },
  tabs: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: radius.md, padding: 4 },
  tab: { flex: 1, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: colors.navy },
  tabText: { color: colors.navy, fontSize: 14, fontWeight: '800' },
  tabTextActive: { color: colors.white },
  sportsBar: { flexGrow: 0 },
  sports: { gap: 6 },
  sport: {
    height: 32,
    paddingHorizontal: 13,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  sportActive: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  sportText: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  sportTextActive: { color: colors.primaryDark },
  subtitle: { color: colors.muted, fontSize: 13, fontWeight: '700', marginLeft: 2 },
  spinner: { marginVertical: 28 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  rank: { width: 24, textAlign: 'center', color: colors.muted, fontSize: 15, fontWeight: '900' },
  rankFirst: { color: colors.primary },
  name: { flex: 1, color: colors.navy, fontSize: 15, fontWeight: '800' },
  points: { color: colors.navy, fontSize: 15, fontWeight: '900' },
  more: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 12 },
  moreText: { color: colors.primary, fontSize: 14, fontWeight: '900' },
  empty: { alignItems: 'center', gap: 4 },
  emptyText: { color: colors.muted, fontSize: 14, fontWeight: '700', textAlign: 'center', paddingVertical: 20 },
  week: { gap: 8, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  weekTitle: { color: colors.navy, fontSize: 14, fontWeight: '900' },
  podiumRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  medal: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  medalText: { fontSize: 12, fontWeight: '900' },
});
