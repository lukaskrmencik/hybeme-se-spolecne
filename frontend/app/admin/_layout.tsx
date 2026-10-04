import { Redirect, Slot, usePathname, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { AdminShell } from '../../components/admin/AdminShell';
import { Button } from '../../components/admin/ui';
import { rememberAfterLogin } from '../../utils/afterLogin';
import { colors } from '../../utils/theme';

/** /admin: signed-in admins only. Others sign in first and come back here. */
export default function AdminLayout() {
  const { token, isAdmin } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (!token) {
    rememberAfterLogin(pathname);
    return <Redirect href="/login" />;
  }

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Ionicons name="lock-closed" size={40} color={colors.inactive} />
        <Text style={styles.title}>Sem nemáš přístup</Text>
        <Text style={styles.text}>Administrace je jen pro správce aplikace.</Text>
        <Button label="Zpět do aplikace" icon="arrow-back" onPress={() => router.replace('/map')} />
      </View>
    );
  }

  return (
    <AdminShell>
      <Slot />
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24, backgroundColor: colors.background },
  title: { color: colors.navy, fontSize: 20, fontWeight: '900' },
  text: { color: colors.muted, fontSize: 15, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
});
