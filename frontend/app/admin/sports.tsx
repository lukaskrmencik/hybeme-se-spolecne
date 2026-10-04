import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  useConfirm,
} from '../../components/admin/ui';
import { createSport, describeValidationError, fetchAllSports, NewSport, setSportActive } from '../../services/admin';
import { getErrorMessage } from '../../services/api';
import { showToast } from '../../utils/alert';
import { Sport } from '../../types/sport';
import { colors } from '../../utils/theme';

type NumberKey = Exclude<keyof NewSport, 'name'>;

const SPEEDS: { key: NumberKey; label: string; help: string }[] = [
  {
    key: 'min_speed',
    label: 'Minimální rychlost',
    help: 'Při pomalejším přesunu mezi místy se kombinace nezapočítá (přesun byl přerušen).',
  },
  { key: 'average_speed', label: 'Obvyklá rychlost', help: 'Běžné tempo daného sportu. Údaj je informativní.' },
  {
    key: 'max_speed',
    label: 'Maximální rychlost',
    help: 'Při rychlejším přesunu se kombinace nezapočítá (pravděpodobně dopravním prostředkem).',
  },
];

const MULTIPLIERS: { key: NumberKey; label: string }[] = [
  { key: 'comb_mult_1', label: '2. místo v řadě' },
  { key: 'comb_mult_2', label: '3. místo v řadě' },
  { key: 'comb_mult_3', label: '4. místo v řadě' },
  { key: 'comb_mult_4', label: '5. a každé další' },
];

const LABELS: Record<string, string> = {
  name: 'Název',
  ...Object.fromEntries([...SPEEDS, ...MULTIPLIERS].map((f) => [f.key, f.label])),
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
      await createSport({ name: trimmed, ...n });
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
      <Field
        label="Název"
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
          <Text style={adminStyles.muted}>Hodnoty lze převzít z existujícího sportu a následně upravit:</Text>
          <View style={adminStyles.wrapRow}>
            {sports.map((s) => (
              <Pressable key={s.id} onPress={() => copyFrom(s)} style={styles.copyChip} accessibilityRole="button">
                <Text style={styles.copyChipText}>Převzít z: {s.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <Text style={styles.groupTitle}>Rychlost přesunu mezi místy</Text>
      <View style={adminStyles.wrapRow}>
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

      <Text style={styles.groupTitle}>Násobitele bodů v kombinaci</Text>
      <Notice text="Pokud uživatel naváže na předchozí návštěvu stejným sportem, body za další místo se vynásobí. Násobitel roste s délkou řady. Náročnějším sportům (např. běh) nastavte vyšší násobitele, méně náročným (např. cyklistika) nižší – body za ujeté kilometry se přičítají u všech sportů stejně." />
      <View style={adminStyles.wrapRow}>
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

      {!!serverError && <Notice tone="danger" text={serverError} />}

      <View style={styles.formActions}>
        <Button label="Zrušit" variant="secondary" onPress={onCancel} disabled={saving} />
        <Button label="Uložit sport" icon="checkmark" onPress={() => void save()} loading={saving} />
      </View>
    </Card>
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
    title: 'Násobitele (2. / 3. / 4. / 5.+ místo)',
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
  const [dialog, confirm] = useConfirm();

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
      description="Sporty nabízené uživatelům při zaznamenání návštěvy. Vyřazený sport nelze zvolit, dosavadní návštěvy zůstávají zachovány."
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
          actions={(s) => (
            <Button
              small
              label={s.is_active ? 'Vyřadit' : 'Aktivovat'}
              icon={s.is_active ? 'eye-off-outline' : 'eye-outline'}
              variant="secondary"
              loading={busyId === s.id}
              onPress={() => void toggle(s)}
            />
          )}
        />
      )}
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  groupTitle: { color: colors.navy, fontSize: 15, fontWeight: '900', marginTop: 4 },
  copy: { gap: 8 },
  copyChip: {
    paddingHorizontal: 12,
    height: 32,
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
