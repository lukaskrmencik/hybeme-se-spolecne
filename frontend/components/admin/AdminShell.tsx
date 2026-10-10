import React, { ComponentProps, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { colors, radius } from '../../utils/theme';
import { fetchReports } from '../../services/reports';

const logo = require('../../assets/images/logos/logo_hss_mark.png');

type IconName = ComponentProps<typeof Ionicons>['name'];

const ADMIN_SECTIONS: { href: string; label: string; icon: IconName }[] = [
  { href: '/admin/places', label: 'Místa', icon: 'location-outline' },
  { href: '/admin/sports', label: 'Sporty', icon: 'bicycle-outline' },
  { href: '/admin/photos', label: 'Fotografie', icon: 'images-outline' },
  { href: '/admin/users', label: 'Uživatelé', icon: 'people-outline' },
  { href: '/admin/reports', label: 'Nahlášení', icon: 'flag-outline' },
];

/** Number of reported things waiting for a decision (several reports of one thing count once). */
function useOpenReports(pathname: string): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    fetchReports('open')
      .then(({ items }) => {
        const targets = new Set(items.map((r) => `${r.type}:${r.reported_user_id}:${r.visits_photo_id ?? ''}`));
        if (active) setCount(targets.size);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pathname]);
  return count;
}

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: '/admin', label: 'Přehled', icon: 'speedometer-outline' },
  ...ADMIN_SECTIONS,
];

/** Frame of the administration: header with the way back to the app, and the section navigation. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const openReports = useOpenReports(pathname);

  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));

  const nav = NAV.map((item) => {
    const active = isActive(item.href);
    return (
      <Pressable
        key={item.href}
        onPress={() => router.replace(item.href as '/admin')}
        style={[wide ? styles.sideItem : styles.tabItem, active && (wide ? styles.sideItemActive : styles.tabItemActive)]}
        accessibilityRole="link"
        accessibilityState={{ selected: active }}
      >
        <Ionicons name={item.icon} size={18} color={active ? (wide ? colors.navy : colors.white) : colors.muted} />
        <Text style={[styles.navText, active && (wide ? styles.sideTextActive : styles.tabTextActive)]}>{item.label}</Text>
        {item.href === '/admin/reports' && openReports > 0 && (
          <View style={styles.count}>
            <Text style={styles.countText}>{openReports}</Text>
          </View>
        )}
      </Pressable>
    );
  });

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable style={styles.brand} onPress={() => router.replace('/admin')} accessibilityRole="link">
          <Image source={logo} style={styles.logo} />
          <View>
            <Text style={styles.title}>Administrace</Text>
            <Text style={styles.subtitle}>Hýbeme se společně</Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => router.replace('/map')}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
        >
          <Ionicons name="exit-outline" size={18} color={colors.white} />
          <Text style={styles.backText}>{wide ? 'Zpět do aplikace' : 'Do aplikace'}</Text>
        </Pressable>
      </View>

      {wide ? (
        <View style={styles.body}>
          <View style={styles.sidebar}>{nav}</View>
          <View style={styles.content}>{children}</View>
        </View>
      ) : (
        <>
          <View style={styles.tabsBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
              {nav}
            </ScrollView>
          </View>
          <View style={styles.content}>{children}</View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.navy,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  logo: { width: 38, height: 38, borderRadius: 9, backgroundColor: colors.white },
  title: { color: colors.white, fontSize: 17, fontWeight: '900' },
  subtitle: { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '700' },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  backText: { color: colors.white, fontSize: 14, fontWeight: '800' },

  body: { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: 220,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    padding: 12,
    gap: 4,
  },
  sideItem: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 44, paddingHorizontal: 12, borderRadius: radius.sm },
  // Navy with a thin green edge: calmer than a green block for a working tool.
  sideItemActive: { backgroundColor: colors.navyBg, borderLeftWidth: 3, borderLeftColor: colors.accent, paddingLeft: 9 },
  sideTextActive: { color: colors.navy },
  content: { flex: 1 },

  tabsBar: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabs: { gap: 6, paddingHorizontal: 12, paddingVertical: 10 },
  tabItem: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: radius.full },
  tabItemActive: { backgroundColor: colors.navy },
  tabTextActive: { color: colors.white },
  navText: { color: colors.muted, fontSize: 14, fontWeight: '800' },
  count: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  countText: { color: colors.white, fontSize: 11, fontWeight: '900' },
});
