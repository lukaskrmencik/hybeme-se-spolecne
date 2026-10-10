import React, { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
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
  FormSection,
  LoadingBlock,
  Notice,
  useConfirm,
} from '../../components/admin/ui';
import { createSport, describeValidationError, fetchAllSports, NewSport, setSportActive, setSportRouteType } from '../../services/admin';
import { ROUTE_TYPES, routeTypeLabel } from '../../utils/navigation';
import { getErrorMessage } from '../../services/api';
import { showToast } from '../../utils/alert';
import { Sport } from '../../types/sport';
import { colors } from '../../utils/theme';

type NumberKey = Exclude<keyof NewSport, 'name' | 'mapy_route_type'>;

const SPEEDS: { key: NumberKey; label: string; long: string; help?: string }[] = [
  {
    key: 'min_speed',
    label: 'Nejnižší',
    long: 'Minimální rychlost',
    help: 'Při pomalejším přesunu mezi místy se kombinace nezapočítá (přesun byl přerušen).',
  },
  { key: 'average_speed', label: 'Obvyklá', long: 'Obvyklá rychlost', help: 'Běžné tempo sportu, údaj je jen informativní.' },
  {
    key: 'max_speed',
    label: 'Nejvyšší',
    long: 'Maximální rychlost',
    help: 'Při rychlejším přesunu se kombinace nezapočítá (nejspíš šlo o dopravní prostředek).',
  },
];

const MULTIPLIERS: { key: NumberKey; label: string; long: string }[] = [
  { key: 'comb_mult_1', label: '2. místo', long: 'Násobitel pro 2. místo v řadě' },
  { key: 'comb_mult_2', label: '3. místo', long: 'Násobitel pro 3. místo v řadě' },
  { key: 'comb_mult_3', label: '4. místo', long: 'Násobitel pro 4. místo v řadě' },
  { key: 'comb_mult_4', label: '5. a další', long: 'Násobitel pro 5. a každé další místo' },
];

const SPEED_HELP = 'Kombinace se uzná, jen když přesun mezi místy odpovídá rychlosti sportu.';
const MULTIPLIER_HELP =
  'Když uživatel naváže na předchozí návštěvu stejným sportem, body za další místo se vynásobí; násobitel roste s délkou řady. ' +
  'Náročnějším sportům (běh) dejte vyšší násobitele, méně náročným (kolo) nižší. Body za kilometry jsou u všech sportů stejné.';
const ROUTE_HELP = 'Jak Mapy.com naplánují trasu po klepnutí na Navigovat. Nemá vliv na body.';

const ROUTE_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  foot_fast: 'walk-outline',
  foot_hiking: 'trail-sign-outline',
  bike_road: 'bicycle-outline',
  bike_mountain: 'bicycle',
};

const LABELS: Record<string, string> = {
  name: 'Název',
  ...Object.fromEntries([...SPEEDS, ...MULTIPLIERS].map((f) => [f.key, f.long])),
};

const EMPTY: Record<NumberKey, string> = {
  min_speed: '',
  average_speed: '',
  max_speed: '',
  comb_mult_1: '1.2',
  comb_mult_2: '1.4',
  comb_mult_3: '1.6',
  comb_mult_4: '2',
};

const toNumber = (v: string) => Number(v.replace(',', '.'));
const clean = (v: string) => v.replace(/[^\d.,]/g, '');
const fmt = (n: number | string) => String(Number(n)).replace('.', ',');

function NewSportForm({ sports, onCreated, onCancel }: { sports: Sport[]; onCreated: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [values, setValues] = useState(EMPTY);
  const [routeType, setRouteType] = useState<string>('foot_fast');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: NumberKey, v: string) => {
    setValues((s) => ({ ...s, [key]: clean(v) }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const copyFrom = (s: Sport) => {
    setValues(
      Object.fromEntries(Object.keys(EMPTY).map((k) => [k, String(Number(s[k as NumberKey]))])) as Record<NumberKey, string>
    );
    setErrors((e) => ({ name: e.name ?? '' }));
    if (s.mapy_route_type) setRouteType(s.mapy_route_type);
  };

  const save = async () => {
    const next: Record<string, string> = {};
    const trimmed = name.trim();
    if (!trimmed) next.name = 'Vyplňte název sportu.';
    else if (sports.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) next.name = 'Sport s tímto názvem již existuje.';

    const n = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, toNumber(v)])) as Record<NumberKey, number>;
    for (const f of SPEEDS) if (!(n[f.key] > 0)) next[f.key] = 'Zadejte rychlost v km/h.';
    if (!next.min_speed && !next.max_speed && n.min_speed >= n.max_speed) next.max_speed = 'Musí být vyšší než minimální rychlost.';
    if (!next.average_speed && (n.average_speed < n.min_speed || n.average_speed > n.max_speed)) {
      next.average_speed = 'Musí ležet mezi minimální a maximální rychlostí.';
    }
    for (const f of MULTIPLIERS) if (!(n[f.key] >= 1)) next[f.key] = 'Nejméně 1 (hodnota 1 body nenásobí).';

    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setSaving(true);
    setServerError(null);
    try {
      await createSport({ name: trimmed, ...n, mapy_route_type: routeType });
      showToast('Sport byl přidán', `${trimmed} se uživatelům zobrazí při příštím otevření aplikace.`, 'success');
      onCreated();
    } catch (err) {
      setServerError(describeValidationError(err, LABELS, 'Sport se nepodařilo uložit.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <Text style={adminStyles.sectionTitle}>Nový sport</Text>
      <View style={adminStyles.formRow}>
        <Field
          label="Název"
          half
          value={name}
          onChangeText={(t) => {
            setName(t);
            setErrors((e) => ({ ...e, name: '' }));
          }}
          placeholder="Např. Běh"
          error={errors.name}
          maxLength={255}
        />
        {sports.length > 0 && (
          <View style={styles.copy}>
            <View style={styles.copyHead}>
              <Ionicons name="copy-outline" size={14} color={colors.muted} />
              <Text style={styles.copyLabel}>Předvyplnit podle</Text>
            </View>
            <View style={adminStyles.wrapRow}>
              {sports.map((s) => (
                <Pressable key={s.id} onPress={() => copyFrom(s)} style={styles.copyChip} accessibilityRole="button">
                  <Text style={styles.copyChipText}>{s.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>

      <FormSection icon="speedometer-outline" title="Rychlost přesunu" help={SPEED_HELP}>
        <View style={adminStyles.formRow}>
          {SPEEDS.map((f) => (
            <Field
              key={f.key}
              half
              label={f.label}
              value={values[f.key]}
              onChangeText={(v) => set(f.key, v)}
              keyboardType="decimal-pad"
              suffix="km/h"
              help={f.help}
              error={errors[f.key]}
            />
          ))}
        </View>
      </FormSection>

      <FormSection icon="git-merge-outline" title="Násobitele v kombinaci" help={MULTIPLIER_HELP}>
        <View style={adminStyles.formRow}>
          {MULTIPLIERS.map((f) => (
            <Field
              key={f.key}
              half
              label={f.label}
              value={values[f.key]}
              onChangeText={(v) => set(f.key, v)}
              keyboardType="decimal-pad"
              suffix="×"
              error={errors[f.key]}
            />
          ))}
        </View>
      </FormSection>

      <FormSection icon="navigate-outline" title="Navigace k místům" help={ROUTE_HELP}>
        <RouteTypeOptions value={routeType} onChange={setRouteType} />
      </FormSection>

      {!!serverError && <Notice tone="danger" text={serverError} />}

      <View style={styles.formActions}>
        <Button label="Zrušit" variant="secondary" onPress={onCancel} disabled={saving} />
        <Button label="Uložit sport" icon="checkmark" onPress={() => void save()} loading={saving} />
      </View>
    </Card>
  );
}

function RouteTypeOptions({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.routeOptions}>
      {ROUTE_TYPES.map((t) => {
        const active = t.value === value;
        return (
          <Pressable
            key={t.value}
            onPress={() => onChange(t.value)}
            style={[styles.routeOption, active && styles.routeOptionActive]}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
          >
            <Ionicons name={ROUTE_ICONS[t.value] ?? 'navigate-outline'} size={16} color={active ? colors.white : colors.navy} />
            <Text style={[styles.routeOptionText, active && styles.routeOptionTextActive]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const sportColumns: Column<Sport>[] = [
  { key: 'name', title: 'Sport', flex: 1.6, render: (s) => <Text style={adminStyles.strong}>{s.name}</Text> },
  {
    key: 'speed',
    title: 'Povolená rychlost',
    flex: 1.6,
    render: (s) => (
      <View>
        <Text style={styles.cell}>
          {fmt(s.min_speed)}–{fmt(s.max_speed)} km/h
        </Text>
        <Text style={adminStyles.muted}>obvykle {fmt(s.average_speed)} km/h</Text>
      </View>
    ),
  },
  {
    key: 'mult',
    title: 'Násobitele',
    flex: 2.4,
    render: (s) => (
      <View style={styles.mults}>
        {MULTIPLIERS.map((m) => (
          <Text key={m.key} style={styles.mult}>
            ×{fmt(s[m.key])}
          </Text>
        ))}
      </View>
    ),
  },
  {
    key: 'route',
    title: 'Navigace',
    flex: 1.5,
    render: (s) => <Text style={styles.cell}>{routeTypeLabel(s.mapy_route_type)}</Text>,
  },
  {
    key: 'status',
    title: 'Stav',
    flex: 1,
    render: (s) => (s.is_active ? <Badge label="Aktivní" tone="green" /> : <Badge label="Vyřazený" tone="grey" />),
  },
];

export default function AdminSports() {
  const params = useLocalSearchParams<{ new?: string }>();
  const [sports, setSports] = useState<Sport[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(params.new === '1');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [routeEdit, setRouteEdit] = useState<{ sport: Sport; value: string } | null>(null);
  const [savingRoute, setSavingRoute] = useState(false);
  const [dialog, confirm] = useConfirm();

  const saveRoute = async () => {
    if (!routeEdit) return;
    setSavingRoute(true);
    try {
      await setSportRouteType(routeEdit.sport.id, routeEdit.value);
      setSports((list) => list?.map((s) => (s.id === routeEdit.sport.id ? { ...s, mapy_route_type: routeEdit.value } : s)) ?? list);
      showToast('Navigace byla změněna', `${routeEdit.sport.name}: ${routeTypeLabel(routeEdit.value)}`, 'success');
      setRouteEdit(null);
    } catch (err) {
      showToast('Změnu se nepodařilo uložit', getErrorMessage(err, 'Zkuste to prosím znovu.'), 'danger');
    } finally {
      setSavingRoute(false);
    }
  };

  const load = useCallback(async () => {
    setError(null);
    try {
      setSports(await fetchAllSports());
    } catch (err) {
      setError(getErrorMessage(err, 'Sporty se nepodařilo načíst.'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (sport: Sport) => {
    const turnOff = sport.is_active;
    const ok = await confirm(
      turnOff
        ? {
            title: `Vyřadit sport „${sport.name}“?`,
            message: 'Sport přestane být nabízen ve výběru v aplikaci. Dosavadní návštěvy s tímto sportem i získané body zůstanou zachovány.',
            confirmLabel: 'Vyřadit',
            danger: true,
          }
        : {
            title: `Aktivovat sport „${sport.name}“?`,
            message: 'Sport bude znovu nabízen ve výběru v aplikaci.',
            confirmLabel: 'Aktivovat',
          }
    );
    if (!ok) return;
    setBusyId(sport.id);
    try {
      await setSportActive(sport.id, !turnOff);
      setSports((list) => list?.map((s) => (s.id === sport.id ? { ...s, is_active: !turnOff } : s)) ?? list);
      showToast(turnOff ? 'Sport byl vyřazen' : 'Sport byl aktivován', sport.name, 'success');
    } catch (err) {
      showToast('Změnu se nepodařilo uložit', getErrorMessage(err, 'Zkuste to prosím znovu.'), 'danger');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminPage
      title="Sporty"
      description="Sporty, které si uživatel vybírá při návštěvě místa"
      actions={!adding && <Button label="Přidat sport" icon="add" onPress={() => setAdding(true)} />}
    >
      {dialog}
      {adding && sports && (
        <NewSportForm
          sports={sports}
          onCancel={() => setAdding(false)}
          onCreated={() => {
            setAdding(false);
            void load();
          }}
        />
      )}

      {error ? (
        <ErrorBlock message={error} onRetry={() => void load()} />
      ) : !sports ? (
        <LoadingBlock />
      ) : sports.length === 0 ? (
        <EmptyState icon="bicycle-outline" title="Zatím nebyl přidán žádný sport" text="Použijte tlačítko Přidat sport." />
      ) : (
        <DataTable<Sport>
          rows={sports}
          rowKey={(s) => s.id}
          columns={sportColumns}
          actionsWidth={250}
          actions={(s) => (
            <>
            <Button
              small
              label="Navigace"
              icon="navigate-outline"
              variant="secondary"
              onPress={() => setRouteEdit({ sport: s, value: s.mapy_route_type ?? 'foot_fast' })}
            />
            <Button
              small
              label={s.is_active ? 'Vyřadit' : 'Aktivovat'}
              icon={s.is_active ? 'eye-off-outline' : 'eye-outline'}
              variant="secondary"
              loading={busyId === s.id}
              onPress={() => void toggle(s)}
            />
            </>
          )}
        />
      )}

      <Modal visible={!!routeEdit} transparent animationType="fade" onRequestClose={() => setRouteEdit(null)}>
        <Pressable style={styles.backdrop} onPress={() => setRouteEdit(null)}>
          <Pressable style={styles.dialog} onPress={() => {}}>
            <Text style={adminStyles.sectionTitle}>Navigace pro sport {routeEdit?.sport.name}</Text>
            <Text style={adminStyles.muted}>{ROUTE_HELP}</Text>
            {routeEdit && <RouteTypeOptions value={routeEdit.value} onChange={(v) => setRouteEdit({ ...routeEdit, value: v })} />}
            <View style={styles.formActions}>
              <Button label="Zrušit" variant="secondary" onPress={() => setRouteEdit(null)} disabled={savingRoute} />
              <Button label="Uložit" icon="checkmark" onPress={() => void saveRoute()} loading={savingRoute} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  routeOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  routeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D3DACB',
    backgroundColor: colors.white,
  },
  routeOptionActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  routeOptionText: { color: colors.navy, fontSize: 13, fontWeight: '700' },
  routeOptionTextActive: { color: colors.white },
  backdrop: { flex: 1, backgroundColor: 'rgba(5, 16, 26, 0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  dialog: { width: '100%', maxWidth: 480, backgroundColor: colors.surface, borderRadius: 10, padding: 22, gap: 12 },
  copy: { gap: 6, flexGrow: 1, flexBasis: 200 },
  copyHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  copyLabel: { color: colors.navy, fontSize: 13, fontWeight: '800' },
  copyChip: {
    paddingHorizontal: 12,
    height: 42,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D3DACB',
    backgroundColor: colors.white,
  },
  copyChipText: { color: colors.navy, fontSize: 13, fontWeight: '700' },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' },
  cell: { color: colors.navy, fontSize: 14, fontWeight: '700' },
  mults: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mult: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '800',
    backgroundColor: colors.background,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    overflow: 'hidden',
  },
});
