import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  AdminPage,
  adminStyles,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  SearchBox,
  Segmented,
  useConfirm,
} from '../../components/admin/ui';
import { Avatar } from '../../components/Avatar';
import { AdminUser, deleteUser, fetchUsers } from '../../services/admin';
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
  const [deletingId, setDeletingId] = useState<number | null>(null);
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
        if (id === requestId.current) setError(getErrorMessage(err, 'Uživatele se nepodařilo načíst.'));
      } finally {
        if (id === requestId.current) setLoadingMore(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  const remove = async (user: AdminUser) => {
    const visits = `${user.visits_count} ${plural(user.visits_count, ['návštěva', 'návštěvy', 'návštěv'])}`;
    const ok = await confirm({
      title: `Smazat účet „${user.name}“?`,
      message: `Smaže se účet ${user.email} i se vším, co k němu patří: ${visits}, body a fotky. Uživatel zmizí ze žebříčku. Nejde to vrátit.`,
      confirmLabel: 'Smazat účet',
      danger: true,
    });
    if (!ok) return;
    setDeletingId(user.id);
    try {
      await deleteUser(user.id);
      setUsers((list) => list?.filter((u) => u.id !== user.id) ?? list);
      setTotal((t) => t - 1);
      showToast('Účet smazán', user.email, 'success');
    } catch (err) {
      showToast('Nepovedlo se', getErrorMessage(err, 'Zkus to prosím znovu.'), 'danger');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminPage title="Uživatelé" description="Všechny účty v aplikaci, nejnovější nahoře.">
      {dialog}
      <View style={adminStyles.wrapRow}>
        <SearchBox value={search} onChange={setSearch} placeholder="Hledat podle jména nebo e-mailu" />
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
        <EmptyState icon="people-outline" title="Nikdo takový tu není" text="Zkus upravit hledání nebo filtr." />
      ) : (
        <>
          <Text style={adminStyles.muted}>
            {total} {plural(total, ['účet', 'účty', 'účtů'])}
          </Text>
          <Card style={styles.list}>
            {users.map((u, i) => {
              const isMe = u.id === userId;
              return (
                <View key={u.id} style={[styles.item, i > 0 && styles.itemBorder]}>
                  <Avatar name={u.name} url={u.avatar_url} size={44} />
                  <View style={styles.itemText}>
                    <View style={adminStyles.wrapRow}>
                      <Text style={adminStyles.strong}>{u.name}</Text>
                      {u.role === 'admin' && <Badge label="Správce" tone="navy" icon="shield-checkmark" />}
                      {u.provider_name === 'google' && <Badge label="Google" tone="sky" icon="logo-google" />}
                      {!u.email_verified_at && <Badge label="Neověřený e-mail" tone="warn" />}
                    </View>
                    <Text style={adminStyles.muted} numberOfLines={1}>
                      {u.email}
                    </Text>
                    <Text style={adminStyles.muted}>
                      Od {formatDate(u.created_at)} · {u.visits_count} {plural(u.visits_count, ['návštěva', 'návštěvy', 'návštěv'])} ·{' '}
                      {formatNumber(u.total_points ?? 0)} b.
                    </Text>
                  </View>
                  {isMe ? (
                    <Badge label="To jsi ty" tone="grey" />
                  ) : (
                    <Button
                      small
                      label="Smazat"
                      icon="trash-outline"
                      variant="secondary"
                      loading={deletingId === u.id}
                      onPress={() => void remove(u)}
                    />
                  )}
                </View>
              );
            })}
          </Card>
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
  list: { paddingVertical: 4, gap: 0 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  itemBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  itemText: { flex: 1, gap: 3 },
  more: { alignItems: 'center' },
});
