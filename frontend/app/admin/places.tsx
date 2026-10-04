import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  AdminPage,
  adminStyles,
  Badge,
  Button,
  Card,
  Column,
  DataTable,
  EmptyState,
  ErrorBlock,
  Field,
  LoadingBlock,
  Notice,
  SearchBox,
  Segmented,
  useConfirm,
} from '../../components/admin/ui';
import { LatLng, LocationPicker } from '../../components/admin/LocationPicker';
import { createPlace, describeValidationError, fetchAllPlaces, setPlaceActive } from '../../services/admin';
import { getErrorMessage } from '../../services/api';
import { showToast } from '../../utils/alert';
import { Place } from '../../types/place';
import { colors } from '../../utils/theme';

type StatusFilter = 'all' | 'active' | 'inactive';

/** "50.2931, 14.8291", "50.2931N, 14.8291E" or "50,2931; 14,8291" -> lat/lng. */
function parseCoordinates(text: string): LatLng | null {
  const clean = text.replace(/[°NEne]/g, ' ').trim();
  const dot = /^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/.exec(clean);
  const comma = /^(-?\d+(?:,\d+)?)\s*[;\s]\s*(-?\d+(?:,\d+)?)$/.exec(clean);
  const m = dot ?? comma;
  if (!m) return null;
  const lat = Number(m[1].replace(',', '.'));
  const lng = Number(m[2].replace(',', '.'));
  if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) return null;
  return { lat, lng };
}

const formatCoords = (p: LatLng) => `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
const placeCoords = (p: Place): LatLng => ({ lat: p.coordinates.coordinates[1], lng: p.coordinates.coordinates[0] });

function NewPlaceForm({ places, onCreated, onCancel }: { places: Place[]; onCreated: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [reward, setReward] = useState('10');
  const [position, setPosition] = useState<LatLng | null>(null);
  const [coordsText, setCoordsText] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const existing = useMemo(
    () => places.map((p) => ({ name: p.name, active: p.is_active, ...placeCoords(p) })),
    [places]
  );

  const pick = useCallback((value: LatLng) => {
    setPosition(value);
    setCoordsText(formatCoords(value));
    setErrors((e) => ({ ...e, position: '' }));
  }, []);

  const typeCoords = (text: string) => {
    setCoordsText(text);
    const parsed = parseCoordinates(text);
    if (parsed) {
      setPosition(parsed);
      setErrors((e) => ({ ...e, position: '' }));
    }
  };

  const save = async () => {
    const next: Record<string, string> = {};
    const trimmed = name.trim();
    const points = Number(reward);
    if (!trimmed) next.name = 'Vyplňte název místa.';
    else if (places.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) next.name = 'Místo s tímto názvem již existuje.';
    if (!Number.isInteger(points) || points < 1) next.reward = 'Zadejte celé číslo, nejméně 1.';
    if (!position) next.position = coordsText ? 'Souřadnice nejsou ve správném formátu (např. 50.2931, 14.8291).' : 'Vyberte polohu kliknutím do mapy.';
    setErrors(next);
    if (Object.values(next).some(Boolean) || !position) return;

    setSaving(true);
    setServerError(null);
    try {
      await createPlace({ name: trimmed, defaultReward: points, ...position });
      showToast('Místo bylo přidáno', `${trimmed} se uživatelům zobrazí při příštím otevření aplikace.`, 'success');
      onCreated();
    } catch (err) {
      setServerError(describeValidationError(err, { name: 'Název', default_reward: 'Body', coordinates: 'Poloha' }, 'Místo se nepodařilo uložit.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <Text style={adminStyles.sectionTitle}>Nové místo</Text>
      <View style={adminStyles.wrapRow}>
        <Field
          label="Název"
          half
          value={name}
          onChangeText={(t) => {
            setName(t);
            setErrors((e) => ({ ...e, name: '' }));
          }}
          placeholder="Např. Rozhledna Bezděčín"
          error={errors.name}
          help="Název, pod kterým se místo zobrazí v aplikaci."
          maxLength={255}
        />
        <Field
          label="Body za návštěvu"
          half
          value={reward}
          onChangeText={(t) => {
            setReward(t.replace(/\D/g, ''));
            setErrors((e) => ({ ...e, reward: '' }));
          }}
          keyboardType="number-pad"
          suffix="b."
          error={errors.reward}
          help="Body za samostatnou návštěvu. Doporučený rozsah je 10–50 bodů."
        />
      </View>

      <Text style={styles.label}>Poloha</Text>
      <LocationPicker value={position} onChange={pick} existing={existing} />
      <Field
        label="Souřadnice"
        value={coordsText}
        onChangeText={typeCoords}
        placeholder="50.2931, 14.8291"
        error={errors.position}
        help="Vyplní se automaticky po kliknutí do mapy, případně je lze vložit ve formátu zeměpisná šířka, délka (např. z Mapy.com). Tečky v mapě označují již existující místa."
        autoCapitalize="none"
      />

      {!!serverError && <Notice tone="danger" text={serverError} />}

      <View style={styles.formActions}>
        <Button label="Zrušit" variant="secondary" onPress={onCancel} disabled={saving} />
        <Button label="Uložit místo" icon="checkmark" onPress={() => void save()} loading={saving} />
      </View>
    </Card>
  );
}

const placeColumns: Column<Place>[] = [
  { key: 'name', title: 'Název', flex: 3, render: (p) => <Text style={adminStyles.strong}>{p.name}</Text> },
  { key: 'reward', title: 'Body za návštěvu', flex: 1.2, render: (p) => <Text style={styles.cell}>{p.default_reward} b.</Text> },
  {
    key: 'coords',
    title: 'Poloha',
    flex: 1.8,
    render: (p) => {
      const c = placeCoords(p);
      return (
        <Text style={styles.link} onPress={() => void Linking.openURL(`https://mapy.com/?q=${c.lat},${c.lng}&z=17`)}>
          {formatCoords(c)}
        </Text>
      );
    },
  },
  {
    key: 'status',
    title: 'Stav',
    flex: 1,
    render: (p) => (p.is_active ? <Badge label="Aktivní" tone="green" /> : <Badge label="Vyřazené" tone="grey" />),
  },
];

export default function AdminPlaces() {
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const params = useLocalSearchParams<{ new?: string }>();
  const [adding, setAdding] = useState(params.new === '1');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [dialog, confirm] = useConfirm();

  const load = useCallback(async () => {
    setError(null);
    try {
      setPlaces(await fetchAllPlaces());
    } catch (err) {
      setError(getErrorMessage(err, 'Místa se nepodařilo načíst.'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (places ?? []).filter(
      (p) =>
        (status === 'all' || (status === 'active') === p.is_active) && (!q || p.name.toLowerCase().includes(q))
    );
  }, [places, search, status]);

  const activeCount = places?.filter((p) => p.is_active).length ?? 0;

  const toggle = async (place: Place) => {
    const turnOff = place.is_active;
    const ok = await confirm(
      turnOff
        ? {
            title: `Vyřadit místo „${place.name}“?`,
            message:
              'Místo přestane být zobrazeno na mapě a nebude možné ho navštívit. Body již získané za jeho návštěvy uživatelům zůstanou. Místo lze kdykoli znovu aktivovat.',
            confirmLabel: 'Vyřadit',
            danger: true,
          }
        : {
            title: `Aktivovat místo „${place.name}“?`,
            message: 'Místo se znovu zobrazí na mapě a bude možné ho navštívit.',
            confirmLabel: 'Aktivovat',
          }
    );
    if (!ok) return;
    setBusyId(place.id);
    try {
      await setPlaceActive(place.id, !turnOff);
      setPlaces((list) => list?.map((p) => (p.id === place.id ? { ...p, is_active: !turnOff } : p)) ?? list);
      showToast(turnOff ? 'Místo bylo vyřazeno' : 'Místo bylo aktivováno', place.name, 'success');
    } catch (err) {
      showToast('Změnu se nepodařilo uložit', getErrorMessage(err, 'Zkuste to prosím znovu.'), 'danger');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminPage
      title="Místa"
      description={
        places
          ? `Aktivních míst: ${activeCount} z ${places.length}. Vyřazené místo se nezobrazuje na mapě, historie návštěv zůstává zachována.`
          : undefined
      }
      actions={!adding && <Button label="Přidat místo" icon="add" onPress={() => setAdding(true)} />}
    >
      {dialog}
      {adding && places && (
        <NewPlaceForm
          places={places}
          onCancel={() => setAdding(false)}
          onCreated={() => {
            setAdding(false);
            void load();
          }}
        />
      )}

      <View style={adminStyles.wrapRow}>
        <SearchBox value={search} onChange={setSearch} placeholder="Vyhledat místo podle názvu" />
        <Segmented<StatusFilter>
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'Všechna' },
            { value: 'active', label: 'Aktivní' },
            { value: 'inactive', label: 'Vyřazená' },
          ]}
        />
      </View>

      {error ? (
        <ErrorBlock message={error} onRetry={() => void load()} />
      ) : !places ? (
        <LoadingBlock />
      ) : shown.length === 0 ? (
        <EmptyState icon="location-outline" title="Žádné místo neodpovídá zadání" text="Upravte vyhledávání nebo filtr." />
      ) : (
        <DataTable<Place>
          rows={shown}
          rowKey={(p) => p.id}
          columns={placeColumns}
          actions={(p) => (
            <Button
              small
              label={p.is_active ? 'Vyřadit' : 'Aktivovat'}
              icon={p.is_active ? 'eye-off-outline' : 'eye-outline'}
              variant="secondary"
              loading={busyId === p.id}
              onPress={() => void toggle(p)}
            />
          )}
        />
      )}
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.navy, fontSize: 13, fontWeight: '800', marginBottom: -4 },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' },
  cell: { color: colors.navy, fontSize: 14, fontWeight: '700' },
  link: { color: colors.skyText, fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
});
