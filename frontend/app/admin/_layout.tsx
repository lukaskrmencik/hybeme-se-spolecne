import { Slot } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { AdminShell } from '../../components/admin/AdminShell';
import { AdminSignIn } from '../../components/admin/AdminSignIn';

export default function AdminLayout() {
  const { token, isAdmin } = useAuth();

  if (!token || !isAdmin) return <AdminSignIn />;

  return (
    <AdminShell>
      <Slot />
    </AdminShell>
  );
}
