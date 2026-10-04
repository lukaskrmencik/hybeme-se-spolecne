import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AdminPage,
  adminStyles,
  Badge,
  Button,
  Card,
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
import { colors, radius } from '../../utils/theme';

type NumberKey = Exclude<keyof NewSport, 'name'>;

const SPEEDS: { key: NumberKey; label: string; help: string }[] = [
  {
    key: 'min_speed',
    label: 'Nejnižší rychlost',
    help: 'Když se člověk mezi místy přesouvá pomaleji, kombinace se nezapočítá (asi si mezitím dal pauzu).',
  },
  { key: 'average_speed', label: 'Běžná rychlost', help: 'Obvyklé tempo tímhle sportem. Zatím jen pro informaci.' },
  {
    key: 'max_speed',
    label: 'Nejvyšší rychlost',
    help: 'Když je přesun rychlejší, kombinace se nezapočítá (nejspíš autem).',
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
    if (!trimmed) next.name = 'Napiš název sportu.';
    else if (sports.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) next.name = 'Sport s tímhle názvem už existuje.';

    const n = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, toNumber(v)])) as Record<NumberKey, number>;
    for (const f of SPEEDS) if (!(n[f.key] > 0)) next[f.key] = 'Zadej rychlost v km/h.';
    if (!next.min_speed && !next.max_speed && n.min_speed >= n.max_speed) next.max_speed = 'Musí být vyšší než nejnižší rychlost.';
    if (!next.average_speed && (n.average_speed < n.min_speed || n.average_speed > n.max_speed)) {
      next.average_speed = 'Musí být mezi nejnižší a nejvyšší rychlostí.';
    }
    for (const f of MULTIPLIERS) if (!(n[f.key] >= 1)) next[f.key] = 'Aspoň 1 (×1 = body se nenásobí).';

    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setSaving(true);
    setServerError(null);
    try {
      await createSport({ name: trimmed, ...n });
      showToast('Sport přidán', `${trimmed} se v aplikaci objeví do hodiny.`, 'success');
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
          <Text style={adminStyles.muted}>Nevíš si rady s hodnotami? Zkopíruj je z podobného sportu a uprav:</Text>
          <View style={adminStyles.wrapRow}>
            {sports.map((s) => (
              <Pressable key={s.id} onPress={() => copyFrom(s)} style={styles.copyChip} accessibilityRole="button">
                <Text style={styles.copyChipText}>{s.name}</Text>
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

      <Text style={styles.groupTitle}>Násobení bodů v kombinaci</Text>
      <Notice text="Když člověk naváže na předchozí návštěvu stejným sportem, body za další místo se vynásobí. Čím delší řada, tím vyšší násobek. U rychlejších sportů dávej nižší násobky: lidé ujedou víc kilometrů a za kilometry dostávají body navíc." />
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

export default function AdminSports() {
  const [sports, setSports] = useState<Sport[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
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
            title: `Vypnout sport „${sport.name}“?`,
            message: 'Sport zmizí z výběru v aplikaci. Návštěvy, které s ním lidé už mají, i jejich body zůstanou.',
            confirmLabel: 'Vypnout',
            danger: true,
          }
        : { title: `Zapnout sport „${sport.name}“?`, message: 'Sport se znovu objeví ve výběru v aplikaci.', confirmLabel: 'Zapnout' }
    );
    if (!ok) return;
    setBusyId(sport.id);
    try {
      await setSportActive(sport.id, !turnOff);
      setSports((list) => list?.map((s) => (s.id === sport.id ? { ...s, is_active: !turnOff } : s)) ?? list);
      showToast(turnOff ? 'Sport vypnut' : 'Sport zapnut', sport.name, 'success');
    } catch (err) {
      showToast('Nepovedlo se', getErrorMessage(err, 'Zkus to prosím znovu.'), 'danger');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminPage
      title="Sporty"
      description="Sporty, které si lidé vybírají v aplikaci. Vypnutý sport nejde vybrat, ale starší návštěvy s ním zůstávají."
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
        <EmptyState icon="bicycle-outline" title="Zatím žádný sport" text="Přidej první tlačítkem nahoře." />
      ) : (
        <View style={styles.cards}>
          {sports.map((s) => (
            <Card key={s.id} style={styles.sportCard}>
              <View style={styles.sportHead}>
                <Text style={[adminStyles.strong, styles.sportName]}>{s.name}</Text>
                {s.is_active ? <Badge label="Aktivní" tone="green" /> : <Badge label="Vypnutý" tone="grey" />}
              </View>
              <View style={styles.stats}>
                <Stat label="Rychlost" value={`${fmt(s.min_speed)}–${fmt(s.max_speed)} km/h`} />
                <Stat label="Běžně" value={`${fmt(s.average_speed)} km/h`} />
              </View>
              <View style={styles.stats}>
                {MULTIPLIERS.map((m, i) => (
                  <Stat key={m.key} label={`${i + 2}.${i === 3 ? '+' : ''} místo`} value={`×${fmt(s[m.key])}`} />
                ))}
              </View>
              <Button
                small
                label={s.is_active ? 'Vypnout' : 'Zapnout'}
                icon={s.is_active ? 'eye-off-outline' : 'eye-outline'}
                variant="secondary"
                loading={busyId === s.id}
                onPress={() => void toggle(s)}
              />
            </Card>
          ))}
        </View>
      )}
    </AdminPage>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  groupTitle: { color: colors.navy, fontSize: 15, fontWeight: '900', marginTop: 4 },
  copy: { gap: 8 },
  copyChip: {
    paddingHorizontal: 12,
    height: 34,
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.skyBg,
  },
  copyChipText: { color: colors.skyText, fontSize: 13, fontWeight: '800' },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sportCard: { flexGrow: 1, flexBasis: 280 },
  sportHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sportName: { flex: 1, fontSize: 17 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { backgroundColor: colors.background, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6, minWidth: 74 },
  statLabel: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  statValue: { color: colors.navy, fontSize: 14, fontWeight: '900' },
});
