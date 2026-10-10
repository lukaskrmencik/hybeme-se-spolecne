import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  AdminPage,
  adminStyles,
  Badge,
  Button,
  Column,
  DataTable,
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  SearchBox,
  Segmented,
  useConfirm,
} from '../../components/admin/ui';
import { Avatar } from '../../components/Avatar';
import { AdminUser, deleteUser, fetchUsers, setUserRole } from '../../services/admin';
import { getErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../utils/alert';
import { formatNumber } from '../../utils/format';
import { plural } from '../../utils/plural';
import { colors } from '../../utils/theme';

type RoleFilter = 'user' | 'admin' | null;

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' });
};

const visitsLabel = (n: number) => `${formatNumber(n)} ${plural(n, ['návštěva', 'návštěvy', 'návštěv'])}`;

export default function AdminUsers() {
  const { userId } = useAuth();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [role, setRole] = useState<RoleFilter>(null);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<{ id: number; action: 'role' | 'delete' } | null>(null);
  const [dialog, confirm] = useConfirm();
  const requestId = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const filters = useMemo(() => ({ search: debouncedSearch, role }), [debouncedSearch, role]);

  const load = useCallback(
    async (nextPage: number) => {
      const id = ++requestId.current;
      if (nextPage === 1) setUsers(null);
      else setLoadingMore(true);
      setError(null);
      try {
        const res = await fetchUsers(nextPage, filters);
        if (id !== requestId.current) return;
        setUsers((prev) => (nextPage === 1 ? res.items : [...(prev ?? []), ...res.items]));
        setPage(res.page);
        setTotalPages(res.totalPages);
        setTotal(res.totalItems);
      } catch (err) {
        if (id === requestId.current) setError(getErrorMessage(err, 'Seznam uživatelů se nepodařilo načíst.'));
      } finally {
        if (id === requestId.current) setLoadingMore(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  const changeRole = async (user: AdminUser) => {
    const promote = user.role !== 'admin';
    const ok = await confirm(
      promote
        ? {
            title: `Jmenovat uživatele ${user.name} správcem?`,
            message:
              'Správce má přístup do administrace: může přidávat a vyřazovat místa a sporty, odstraňovat fotografie, mazat účty a jmenovat další správce. Oprávnění se v aplikaci projeví po jeho dalším přihlášení.',
            confirmLabel: 'Jmenovat správcem',
          }
        : {
            title: `Odebrat uživateli ${user.name} oprávnění správce?`,
            message: 'Uživatel ztratí přístup do administrace. Jeho účet, návštěvy a body zůstanou beze změny.',
            confirmLabel: 'Odebrat oprávnění',
            danger: true,
          }
    );
    if (!ok) return;
    setBusy({ id: user.id, action: 'role' });
    try {
      const nextRole = promote ? 'admin' : 'user';
      await setUserRole(user.id, nextRole);
      setUsers((list) => list?.map((u) => (u.id === user.id ? { ...u, role: nextRole } : u)) ?? list);
      showToast(promote ? 'Uživatel byl jmenován správcem' : 'Oprávnění správce bylo odebráno', user.email, 'success');
    } catch (err) {
      showToast('Změnu se nepodařilo uložit', getErrorMessage(err, 'Zkuste to prosím znovu.'), 'danger');
    } finally {
      setBusy(null);
    }
  };

  const remove = async (user: AdminUser) => {
    const ok = await confirm({
      title: `Smazat účet ${user.name}?`,
      message: `Účet ${user.email} bude trvale odstraněn včetně všech souvisejících dat (${visitsLabel(user.visits_count)}, body a fotografie). Uživatel zmizí ze žebříčku. Akci nelze vrátit.`,
      confirmLabel: 'Smazat účet',
      danger: true,
    });
    if (!ok) return;
    setBusy({ id: user.id, action: 'delete' });
    try {
      await deleteUser(user.id);
      setUsers((list) => list?.filter((u) => u.id !== user.id) ?? list);
      setTotal((t) => t - 1);
      showToast('Účet byl smazán', user.email, 'success');
    } catch (err) {
      showToast('Účet se nepodařilo smazat', getErrorMessage(err, 'Zkuste to prosím znovu.'), 'danger');
    } finally {
      setBusy(null);
    }
  };

  const columns: Column<AdminUser>[] = [
    {
      key: 'user',
      title: 'Uživatel',
      flex: 3,
      render: (u) => (
        <View style={styles.userCell}>
          <Avatar name={u.name} url={u.avatar_url} size={36} />
          <View style={styles.userText}>
            <Text style={adminStyles.strong} numberOfLines={1}>
              {u.name}
              {u.id === userId && <Text style={styles.own}> (váš účet)</Text>}
            </Text>
            <Text style={adminStyles.muted} numberOfLines={1}>
              {u.email}
            </Text>
          </View>
        </View>
      ),
    },
    { key: 'created', title: 'Registrace', flex: 1.1, render: (u) => <Text style={styles.cell}>{formatDate(u.created_at)}</Text> },
    {
      key: 'activity',
      title: 'Aktivita',
      flex: 1.3,
      render: (u) => (
        <View>
          <Text style={styles.cell}>{formatNumber(u.total_points ?? 0)} b.</Text>
          <Text style={adminStyles.muted}>{visitsLabel(u.visits_count)}</Text>
        </View>
      ),
    },
    {
      key: 'role',
      title: 'Role',
      flex: 1.4,
      render: (u) => (
        <View style={styles.badges}>
          {u.role === 'admin' ? <Badge label="Správce" tone="navy" /> : <Badge label="Uživatel" tone="grey" />}
          {u.provider_name === 'google' && <Badge label="Google" tone="sky" />}
          {!u.email_verified_at && <Badge label="Neověřený e-mail" tone="warn" />}
        </View>
      ),
    },
  ];

  return (
    <AdminPage title="Uživatelé" description="Registrované účty, nejnovější nahoře">
      {dialog}
      <View style={adminStyles.wrapRow}>
        <SearchBox value={search} onChange={setSearch} placeholder="Vyhledat podle jména nebo e-mailu" />
        <Segmented<RoleFilter>
          value={role}
          onChange={setRole}
          options={[
            { value: null, label: 'Všichni' },
            { value: 'user', label: 'Uživatelé' },
            { value: 'admin', label: 'Správci' },
          ]}
        />
      </View>

      {error ? (
        <ErrorBlock message={error} onRetry={() => void load(1)} />
      ) : !users ? (
        <LoadingBlock />
      ) : users.length === 0 ? (
        <EmptyState icon="people-outline" title="Žádný účet neodpovídá zadání" text="Upravte vyhledávání nebo filtr." />
      ) : (
        <>
          <Text style={adminStyles.muted}>
            Nalezeno: {formatNumber(total)} {plural(total, ['účet', 'účty', 'účtů'])}
          </Text>
          <DataTable<AdminUser>
            rows={users}
            rowKey={(u) => u.id}
            columns={columns}
            actionsWidth={290}
            actions={(u) =>
              u.id === userId ? null : (
                <>
                  <Button
                    small
                    label={u.role === 'admin' ? 'Odebrat správce' : 'Jmenovat správcem'}
                    icon={u.role === 'admin' ? 'shield-outline' : 'shield-checkmark-outline'}
                    variant="secondary"
                    loading={busy?.id === u.id && busy.action === 'role'}
                    disabled={!!busy}
                    onPress={() => void changeRole(u)}
                  />
                  <Button
                    small
                    label="Smazat"
                    icon="trash-outline"
                    variant="secondary"
                    loading={busy?.id === u.id && busy.action === 'delete'}
                    disabled={!!busy}
                    onPress={() => void remove(u)}
                  />
                </>
              )
            }
          />
          {page < totalPages && (
            <View style={styles.more}>
              <Button label="Načíst další" icon="chevron-down" variant="secondary" loading={loadingMore} onPress={() => void load(page + 1)} />
            </View>
          )}
        </>
      )}
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  userCell: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  userText: { flex: 1 },
  own: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  cell: { color: colors.navy, fontSize: 14, fontWeight: '700' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  more: { alignItems: 'center' },
});
