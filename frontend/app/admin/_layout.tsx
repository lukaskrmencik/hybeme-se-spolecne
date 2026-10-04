import { Slot } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { AdminShell } from '../../components/admin/AdminShell';
import { AdminSignIn } from '../../components/admin/AdminSignIn';

/** /admin: admins only. Anyone else gets the sign-in for an admin account right here. */
export default function AdminLayout() {
  const { token, isAdmin } = useAuth();

  if (!token || !isAdmin) return <AdminSignIn />;

  return (
    <AdminShell>
      <Slot />
    </AdminShell>
  );
}
