import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AdminPage, adminStyles, Badge, Button, Card, ErrorBlock, LoadingBlock, StatCard } from '../../components/admin/ui';
import { fetchReports } from '../../services/reports';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../components/Avatar';
import { AdminPhoto, AdminUser, fetchAllPlaces, fetchAllSports, fetchPhotos, fetchUsers } from '../../services/admin';
import { formatNumber } from '../../utils/format';
import { formatVisitTime } from '../../utils/dates';
import { colors } from '../../utils/theme';

interface Overview {
  placesActive: number;
  placesTotal: number;
  sportsActive: number;
  sportsTotal: number;
  photosTotal: number;
  photosWeek: number;
  usersTotal: number;
  admins: number;
  recentPhotos: AdminPhoto[];
  newestUsers: AdminUser[];
  openReports: number;
}

function weekAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function loadOverview(): Promise<Overview> {
  const [places, sports, photos, photosWeek, users, admins, reports] = await Promise.all([
    fetchAllPlaces(),
    fetchAllSports(),
    fetchPhotos(1, {}, 6),
    fetchPhotos(1, { from: weekAgo() }, 1),
    fetchUsers(1, {}, 5),
    fetchUsers(1, { role: 'admin' }, 1),
    fetchReports('open'),
  ]);
  return {
    placesActive: places.filter((p) => p.is_active).length,
    placesTotal: places.length,
    sportsActive: sports.filter((s) => s.is_active).length,
    sportsTotal: sports.length,
    photosTotal: photos.totalItems,
    photosWeek: photosWeek.totalItems,
    usersTotal: users.totalItems,
    admins: admins.totalItems,
    recentPhotos: photos.items,
    newestUsers: users.items,
    openReports: new Set(reports.items.map((r) => `${r.type}:${r.reported_user_id}:${r.visits_photo_id ?? ''}`)).size,
  };
}

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('cs-CZ');
};

export default function AdminHome() {
  const router = useRouter();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      setData(await loadOverview());
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const go = (href: string) => router.replace(href as '/admin');

  return (
    <AdminPage
      title="Přehled"
      description="Souhrn a poslední aktivita"
      actions={
        <View style={adminStyles.wrapRow}>
          <Button label="Nové místo" icon="add" variant="secondary" onPress={() => go('/admin/places?new=1')} />
          <Button label="Nový sport" icon="add" variant="secondary" onPress={() => go('/admin/sports?new=1')} />
        </View>
      }
    >
      {error ? (
        <ErrorBlock message="Přehled se nepodařilo načíst." onRetry={() => void load()} />
      ) : !data ? (
        <LoadingBlock />
      ) : (
        <>
          {data.openReports > 0 && (
            <Pressable onPress={() => go('/admin/reports')} style={styles.alert} accessibilityRole="link">
              <Ionicons name="flag" size={20} color={colors.dangerText} />
              <Text style={styles.alertText}>
                Čeká na posouzení: {data.openReports}
              </Text>
              <Text style={styles.alertLink}>Zobrazit</Text>
            </Pressable>
          )}
          <View style={styles.stats}>
            <StatCard
              icon="location-outline"
              label="Místa"
              value={formatNumber(data.placesActive)}
              note={`aktivních z ${formatNumber(data.placesTotal)}`}
            />
            <StatCard
              icon="bicycle-outline"
              label="Sporty"
              value={formatNumber(data.sportsActive)}
              note={`aktivních z ${formatNumber(data.sportsTotal)}`}
            />
            <StatCard
              icon="images-outline"
              label="Fotografie"
              value={formatNumber(data.photosTotal)}
              note={`${formatNumber(data.photosWeek)} za posledních 7 dní`}
            />
            <StatCard
              icon="people-outline"
              label="Uživatelé"
              value={formatNumber(data.usersTotal)}
              note={`z toho ${formatNumber(data.admins)} správců`}
            />
          </View>

          <View style={styles.columns}>
            <Card style={styles.column}>
              <View style={styles.cardHead}>
                <Text style={adminStyles.sectionTitle}>Nejnovější fotografie</Text>
                <Button small label="Všechny" variant="ghost" onPress={() => go('/admin/photos')} />
              </View>
              {data.recentPhotos.length === 0 ? (
                <Text style={adminStyles.muted}>Zatím nebyla nahrána žádná fotografie.</Text>
              ) : (
                <View style={styles.photos}>
                  {data.recentPhotos.map((p) => (
                    <Pressable key={p.id} onPress={() => go('/admin/photos')} style={styles.photo} accessibilityRole="link">
                      <Image source={{ uri: p.photo_url }} style={styles.photoImage} />
                      <Text style={styles.photoPlace} numberOfLines={1}>
                        {p.visit?.place?.name ?? 'Neznámé místo'}
                      </Text>
                      <Text style={styles.photoMeta} numberOfLines={1}>
                        {formatVisitTime(p.created_at)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </Card>

            <Card style={styles.column}>
              <View style={styles.cardHead}>
                <Text style={adminStyles.sectionTitle}>Nové registrace</Text>
                <Button small label="Všichni" variant="ghost" onPress={() => go('/admin/users')} />
              </View>
              {data.newestUsers.map((u, i) => (
                <View key={u.id} style={[styles.user, i > 0 && styles.userBorder]}>
                  <Avatar name={u.name} url={u.avatar_url} size={36} />
                  <View style={styles.userText}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {u.name}
                    </Text>
                    <Text style={adminStyles.muted} numberOfLines={1}>
                      {u.email}
                    </Text>
                  </View>
                  {u.role === 'admin' ? <Badge label="Správce" tone="navy" /> : <Text style={adminStyles.muted}>{formatDate(u.created_at)}</Text>}
                </View>
              ))}
            </Card>
          </View>
        </>
      )}
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  alertText: { flex: 1, color: colors.dangerText, fontSize: 14, fontWeight: '800' },
  alertLink: { color: colors.dangerText, fontSize: 14, fontWeight: '900', textDecorationLine: 'underline' },
  columns: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' },
  column: { flexGrow: 1, flexBasis: 340 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photo: { width: '31%', flexGrow: 1, minWidth: 90, gap: 3 },
  photoImage: { width: '100%', aspectRatio: 1, borderRadius: 6, backgroundColor: colors.background },
  photoPlace: { color: colors.navy, fontSize: 12, fontWeight: '800' },
  photoMeta: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  user: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  userBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  userText: { flex: 1 },
  userName: { color: colors.navy, fontSize: 14, fontWeight: '800' },
});
