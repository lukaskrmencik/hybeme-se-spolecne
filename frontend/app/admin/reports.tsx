import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import {
  AdminPage,
  adminStyles,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  Notice,
  Segmented,
  useConfirm,
} from '../../components/admin/ui';
import { Avatar } from '../../components/Avatar';
import { deletePhoto, deleteUser } from '../../services/admin';
import {
  AdminReport,
  deleteAvatar,
  fetchReports,
  renameUser,
  ReportResolution,
  ReportType,
  resolveReport,
} from '../../services/reports';
import { getErrorMessage } from '../../services/api';
import { showToast } from '../../utils/alert';
import { formatVisitTime } from '../../utils/dates';
import { colors } from '../../utils/theme';

type Status = 'open' | 'resolved';

const TYPE_LABEL: Record<ReportType, string> = {
  visit_photo: 'Fotografie u místa',
  avatar: 'Profilová fotka',
  name: 'Jméno uživatele',
};

const RESOLUTION_LABEL: Record<ReportResolution, string> = {
  removed_photo: 'Fotografie odstraněna',
  removed_avatar: 'Profilová fotka odstraněna',
  renamed: 'Jméno změněno',
  deleted_user: 'Účet smazán',
  dismissed: 'Ponecháno beze změny',
};

/** Open reports about the same thing (the same photo, avatar or name) are handled as one case. */
interface Case {
  key: string;
  first: AdminReport;
  reports: AdminReport[];
}

function toCases(items: AdminReport[]): Case[] {
  const map = new Map<string, Case>();
  for (const r of items) {
    const key = `${r.type}:${r.reported_user_id}:${r.visits_photo_id ?? ''}`;
    const existing = map.get(key);
    if (existing) existing.reports.push(r);
    else map.set(key, { key, first: r, reports: [r] });
  }
  return [...map.values()];
}

export default function AdminReports() {
  const [status, setStatus] = useState<Status>('open');
  const [items, setItems] = useState<AdminReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [dialog, confirm] = useConfirm();

  const load = useCallback(async () => {
    setItems(null);
    setError(null);
    try {
      setItems((await fetchReports(status)).items);
    } catch (err) {
      setError(getErrorMessage(err, 'Nahlášení se nepodařilo načíst.'));
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const cases = useMemo(() => (status === 'open' ? toCases(items ?? []) : (items ?? []).map((r) => ({ key: String(r.id), first: r, reports: [r] }))), [items, status]);

  /** Runs the action, closes the case and removes it from the list. */
  const act = async (c: Case, action: () => Promise<void>, resolution: ReportResolution, done: string) => {
    setBusyKey(c.key);
    try {
      await action();
      // A deleted account takes its reports with it; anything else is closed explicitly.
      if (resolution !== 'deleted_user') await resolveReport(c.first.id, resolution);
      setItems((list) => list?.filter((r) => !c.reports.some((x) => x.id === r.id)) ?? list);
      showToast(done, undefined, 'success');
    } catch (err) {
      showToast('Akci se nepodařilo provést', getErrorMessage(err, 'Zkuste to prosím znovu.'), 'danger');
    } finally {
      setBusyKey(null);
    }
  };

  const removeContent = async (c: Case) => {
    const r = c.first;
    const user = r.reported_user;
    if (!user) return;
    if (r.type === 'visit_photo') {
      if (!r.visits_photo_id) return act(c, async () => {}, 'removed_photo', 'Nahlášení bylo uzavřeno');
      const ok = await confirm({
        title: 'Odstranit fotografii?',
        message: `Fotografie uživatele ${user.name} bude trvale odstraněna. Návštěva a body uživateli zůstanou.`,
        confirmLabel: 'Odstranit',
        danger: true,
      });
      if (ok) await act(c, () => deletePhoto(r.visits_photo_id!), 'removed_photo', 'Fotografie byla odstraněna');
    } else if (r.type === 'avatar') {
      const ok = await confirm({
        title: 'Odstranit profilovou fotku?',
        message: `Uživateli ${user.name} bude odstraněna profilová fotka. Účet a body zůstanou beze změny.`,
        confirmLabel: 'Odstranit',
        danger: true,
      });
      if (ok) await act(c, () => deleteAvatar(user.id), 'removed_avatar', 'Profilová fotka byla odstraněna');
    } else {
      const newName = `Uživatel ${user.id}`;
      const ok = await confirm({
        title: 'Změnit jméno uživatele?',
        message: `Jméno „${user.name}“ bude nahrazeno neutrálním „${newName}“. Uživatel si ho později může změnit v nastavení účtu.`,
        confirmLabel: 'Změnit jméno',
        danger: true,
      });
      if (ok) await act(c, () => renameUser(user.id, newName), 'renamed', 'Jméno bylo změněno');
    }
  };

  const removeAccount = async (c: Case) => {
    const user = c.first.reported_user;
    if (!user) return;
    const ok = await confirm({
      title: `Smazat účet ${user.name}?`,
      message: `Účet ${user.email} bude za porušení pravidel trvale odstraněn včetně všech návštěv, bodů a fotografií. Akci nelze vrátit.`,
      confirmLabel: 'Smazat účet',
      danger: true,
    });
    if (ok) await act(c, () => deleteUser(user.id), 'deleted_user', 'Účet byl smazán');
  };

  const dismiss = async (c: Case) => {
    const ok = await confirm({
      title: 'Ponechat obsah beze změny?',
      message: 'Nahlášení bude uzavřeno jako neopodstatněné. Obsah zůstane zachován.',
      confirmLabel: 'Ponechat',
    });
    if (ok) await act(c, async () => {}, 'dismissed', 'Nahlášení bylo uzavřeno');
  };

  return (
    <AdminPage title="Nahlášení" description="Obsah, který uživatelé označili jako nevhodný. Posuďte ho a rozhodněte o dalším postupu.">
      {dialog}
      <Segmented<Status>
        value={status}
        onChange={setStatus}
        options={[
          { value: 'open', label: 'Nevyřízená' },
          { value: 'resolved', label: 'Vyřízená' },
        ]}
      />

      {error ? (
        <ErrorBlock message={error} onRetry={() => void load()} />
      ) : !items ? (
        <LoadingBlock />
      ) : cases.length === 0 ? (
        <EmptyState
          icon="shield-checkmark-outline"
          title={status === 'open' ? 'Žádná nevyřízená nahlášení' : 'Zatím nebylo nic vyřízeno'}
          text={status === 'open' ? 'Nový nahlášený obsah se zobrazí zde a správcům přijde e-mail.' : undefined}
        />
      ) : (
        cases.map((c) => <ReportCase key={c.key} c={c} status={status} busy={busyKey === c.key} onRemove={removeContent} onDelete={removeAccount} onDismiss={dismiss} />)
      )}
    </AdminPage>
  );
}

function ReportCase({
  c,
  status,
  busy,
  onRemove,
  onDelete,
  onDismiss,
}: {
  c: Case;
  status: Status;
  busy: boolean;
  onRemove: (c: Case) => void;
  onDelete: (c: Case) => void;
  onDismiss: (c: Case) => void;
}) {
  const r = c.first;
  const user = r.reported_user;
  const photoGone = r.type === 'visit_photo' && !r.visits_photo_id;
  const avatarChanged = r.type === 'avatar' && user?.avatar_url !== r.content_url;
  const nameChanged = r.type === 'name' && user?.name !== r.content_text;
  const removeLabel = r.type === 'visit_photo' ? (photoGone ? 'Uzavřít' : 'Odstranit fotografii') : r.type === 'avatar' ? 'Odstranit profilovou fotku' : 'Změnit jméno';
  const notes = c.reports.filter((x) => x.note);

  return (
    <Card>
      <View style={styles.head}>
        <View style={adminStyles.wrapRow}>
          <Badge label={TYPE_LABEL[r.type]} tone="warn" />
          {status === 'open' && c.reports.length > 1 && <Badge label={`Nahlášeno ${c.reports.length}×`} tone="navy" />}
          {status === 'resolved' && r.resolution && <Badge label={RESOLUTION_LABEL[r.resolution]} tone="green" />}
        </View>
        <Text style={adminStyles.muted}>{formatVisitTime(status === 'open' ? r.created_at : r.resolved_at ?? r.created_at)}</Text>
      </View>

      <View style={styles.body}>
        {r.type !== 'name' && (
          <View style={styles.preview}>
            {r.content_url ? (
              <Image source={{ uri: r.content_url }} style={styles.previewImage} resizeMode="cover" />
            ) : (
              <View style={[styles.previewImage, styles.previewEmpty]}>
                <Text style={adminStyles.muted}>Bez náhledu</Text>
              </View>
            )}
          </View>
        )}
        <View style={styles.details}>
          {r.type === 'name' && <Text style={styles.reportedName}>„{r.content_text}“</Text>}
          {user ? (
            <View style={styles.user}>
              <Avatar name={user.name} url={user.avatar_url} size={32} />
              <View style={styles.userText}>
                <Text style={adminStyles.strong}>{user.name}</Text>
                <Text style={adminStyles.muted}>{user.email}</Text>
              </View>
            </View>
          ) : (
            <Text style={adminStyles.muted}>Účet již neexistuje.</Text>
          )}
          {!!r.photo?.visit?.place?.name && <Text style={styles.meta}>Místo: {r.photo.visit.place.name}</Text>}
          <Text style={styles.meta}>
            Nahlášeno uživatelem: {c.reports.map((x) => x.reporter?.name ?? 'neznámý').join(', ')}
          </Text>
          {notes.map((x) => (
            <Text key={x.id} style={styles.note}>
              „{x.note}“ <Text style={adminStyles.muted}>– {x.reporter?.name ?? 'neznámý'}</Text>
            </Text>
          ))}
          {status === 'open' && photoGone && <Notice text="Fotografie již byla odstraněna. Nahlášení stačí uzavřít." />}
          {status === 'open' && avatarChanged && <Notice text="Uživatel mezitím profilovou fotku změnil nebo odstranil. Náhled ukazuje nahlášenou verzi." />}
          {status === 'open' && nameChanged && <Notice text={`Uživatel se mezitím přejmenoval na „${user?.name}“.`} />}
        </View>
      </View>

      {status === 'open' && user && (
        <View style={styles.actions}>
          <Button small label="Ponechat" icon="checkmark-outline" variant="secondary" disabled={busy} onPress={() => onDismiss(c)} />
          <Button small label="Smazat účet" icon="person-remove-outline" variant="secondary" disabled={busy} onPress={() => onDelete(c)} />
          <Button small label={removeLabel} icon="trash-outline" variant="danger" loading={busy} onPress={() => onRemove(c)} />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  body: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  preview: { width: 160 },
  previewImage: { width: 160, height: 160, borderRadius: 8, backgroundColor: colors.background },
  previewEmpty: { alignItems: 'center', justifyContent: 'center' },
  details: { flex: 1, minWidth: 220, gap: 8 },
  reportedName: { color: colors.navy, fontSize: 20, fontWeight: '900' },
  user: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  userText: { flex: 1 },
  meta: { color: colors.navy, fontSize: 13, fontWeight: '600' },
  note: { color: colors.navy, fontSize: 13, fontWeight: '600', fontStyle: 'italic' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
});
