import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AdminPage,
  adminStyles,
  Button,
  Card,
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  SearchBox,
  Segmented,
  useConfirm,
} from '../../components/admin/ui';
import { PhotoViewer } from '../../components/PhotoViewer';
import { AdminPhoto, deletePhoto, fetchAllPlaces, fetchPhotos } from '../../services/admin';
import { getErrorMessage } from '../../services/api';
import { showToast } from '../../utils/alert';
import { formatVisitTime } from '../../utils/dates';
import { plural } from '../../utils/plural';
import { colors, radius } from '../../utils/theme';
import { Place } from '../../types/place';

type Period = 'all' | 'today' | 'week' | 'month';

/** Y-m-d of the first day the period covers. */
function periodStart(period: Period): string | null {
  if (period === 'all') return null;
  const d = new Date();
  if (period === 'week') d.setDate(d.getDate() - 6);
  if (period === 'month') d.setDate(d.getDate() - 29);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default function AdminPhotos() {
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<Period>('all');
  const [placeId, setPlaceId] = useState<number | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [photos, setPhotos] = useState<AdminPhoto[] | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const [dialog, confirm] = useConfirm();
  const debouncedSearch = useDebounced(search, 400);
  const requestId = useRef(0);

  useEffect(() => {
    fetchAllPlaces()
      .then(setPlaces)
      .catch(() => setPlaces([]));
  }, []);

  const filters = useMemo(
    () => ({ search: debouncedSearch, placeId, from: periodStart(period) }),
    [debouncedSearch, placeId, period]
  );

  const load = useCallback(
    async (nextPage: number) => {
      const id = ++requestId.current;
      if (nextPage === 1) setPhotos(null);
      else setLoadingMore(true);
      setError(null);
      try {
        const res = await fetchPhotos(nextPage, filters);
        if (id !== requestId.current) return; // an older filter answered late
        setPhotos((prev) => (nextPage === 1 ? res.items : [...(prev ?? []), ...res.items]));
        setPage(res.page);
        setTotalPages(res.totalPages);
        setTotal(res.totalItems);
      } catch (err) {
        if (id === requestId.current) setError(getErrorMessage(err, 'Fotky se nepodařilo načíst.'));
      } finally {
        if (id === requestId.current) setLoadingMore(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  const remove = async (photo: AdminPhoto) => {
    const author = photo.visit?.user?.name ?? 'neznámý uživatel';
    const ok = await confirm({
      title: 'Smazat fotku?',
      message: `Fotku od uživatele ${author} u místa ${photo.visit?.place?.name ?? '?'} už nikdo neuvidí. Nejde to vrátit.`,
      confirmLabel: 'Smazat fotku',
      danger: true,
    });
    if (!ok) return;
    setDeletingId(photo.id);
    try {
      await deletePhoto(photo.id);
      setPhotos((list) => list?.filter((p) => p.id !== photo.id) ?? list);
      setTotal((t) => t - 1);
      showToast('Fotka smazána', undefined, 'success');
    } catch (err) {
      showToast('Nepovedlo se', getErrorMessage(err, 'Zkus to prosím znovu.'), 'danger');
    } finally {
      setDeletingId(null);
    }
  };

  const viewerPhotos = useMemo(
    () =>
      (photos ?? []).map((p) => ({
        id: p.id,
        url: p.photo_url,
        author: p.visit?.user?.name ?? null,
        takenAt: p.visit?.timestamp ?? null,
      })),
    [photos]
  );

  return (
    <AdminPage title="Fotky" description="Fotky, které lidé přidali k návštěvám. Nevhodnou fotku smaž, uživateli zůstane návštěva i body.">
      {dialog}
      <View style={adminStyles.wrapRow}>
        <SearchBox value={search} onChange={setSearch} placeholder="Hledat podle jména nebo e-mailu autora" />
        <Segmented<Period>
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'all', label: 'Kdykoli' },
            { value: 'today', label: 'Dnes' },
            { value: 'week', label: 'Posledních 7 dní' },
            { value: 'month', label: 'Posledních 30 dní' },
          ]}
        />
      </View>
      {places.length > 0 && (
        <Segmented<number | null>
          value={placeId}
          onChange={setPlaceId}
          options={[{ value: null, label: 'Všechna místa' }, ...places.map((p) => ({ value: p.id, label: p.name }))]}
        />
      )}

      {error ? (
        <ErrorBlock message={error} onRetry={() => void load(1)} />
      ) : !photos ? (
        <LoadingBlock />
      ) : photos.length === 0 ? (
        <EmptyState icon="images-outline" title="Žádné fotky" text="S těmito filtry nic nenacházím." />
      ) : (
        <>
          <Text style={adminStyles.muted}>
            {total} {plural(total, ['fotka', 'fotky', 'fotek'])}
          </Text>
          <View style={styles.grid}>
            {photos.map((p, i) => (
              <Card key={p.id} style={styles.photoCard}>
                <Pressable onPress={() => setViewIndex(i)} accessibilityLabel="Zvětšit fotku">
                  <Image source={{ uri: p.photo_url }} style={styles.image} resizeMode="cover" />
                </Pressable>
                <View style={styles.meta}>
                  <Text style={adminStyles.strong} numberOfLines={1}>
                    {p.visit?.place?.name ?? 'Neznámé místo'}
                  </Text>
                  <Text style={styles.author} numberOfLines={1}>
                    {p.visit?.user?.name ?? 'Smazaný uživatel'}
                  </Text>
                  {!!p.visit?.user?.email && (
                    <Text style={adminStyles.muted} numberOfLines={1}>
                      {p.visit.user.email}
                    </Text>
                  )}
                  <Text style={adminStyles.muted}>{formatVisitTime(p.created_at)}</Text>
                </View>
                <Button
                  small
                  label="Smazat"
                  icon="trash-outline"
                  variant="secondary"
                  loading={deletingId === p.id}
                  onPress={() => void remove(p)}
                />
              </Card>
            ))}
          </View>
          {page < totalPages && (
            <View style={styles.more}>
              <Button label="Načíst další" icon="chevron-down" variant="secondary" loading={loadingMore} onPress={() => void load(page + 1)} />
            </View>
          )}
        </>
      )}

      <PhotoViewer photos={viewerPhotos} index={viewIndex} onClose={() => setViewIndex(null)} />
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  photoCard: { flexGrow: 1, flexBasis: 160, maxWidth: 260, padding: 10, gap: 10 },
  image: { width: '100%', aspectRatio: 1, borderRadius: radius.md, backgroundColor: colors.background },
  meta: { gap: 2 },
  author: { color: colors.navy, fontSize: 13, fontWeight: '700' },
  more: { alignItems: 'center' },
});
