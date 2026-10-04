import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AdminPage } from '../../components/admin/ui';
import { ADMIN_SECTIONS } from '../../components/admin/AdminShell';
import { colors, radius, shadows } from '../../utils/theme';

export default function AdminHome() {
  const router = useRouter();
  return (
    <AdminPage title="Vítej v administraci" description="Vyber, co chceš spravovat. Změny se v aplikaci projeví do hodiny.">
      <View style={styles.grid}>
        {ADMIN_SECTIONS.map((s) => (
          <Pressable
            key={s.href}
            onPress={() => router.replace(s.href as '/admin')}
            style={({ pressed }) => [styles.tile, pressed && { opacity: 0.9 }]}
            accessibilityRole="link"
          >
            <View style={styles.icon}>
              <Ionicons name={s.icon} size={24} color={colors.primary} />
            </View>
            <View style={styles.texts}>
              <Text style={styles.title}>{s.label}</Text>
              <Text style={styles.text}>{s.text}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.inactive} />
          </Pressable>
        ))}
      </View>
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    flexGrow: 1,
    flexBasis: 300,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 18,
    ...shadows.card,
  },
  icon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 2 },
  title: { color: colors.navy, fontSize: 17, fontWeight: '900' },
  text: { color: colors.muted, fontSize: 13, lineHeight: 18, fontWeight: '600' },
});
