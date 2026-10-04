import React, { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, BottomTabBarButtonProps } from 'expo-router/js-tabs';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUserStats } from '../../../context/UserStatsContext';
import { colors } from '../../../utils/theme';
import { formatNumber } from '../../../utils/format';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; title: string; icon: IconName; iconActive: IconName }[] = [
    { name: 'map', title: 'Mapa', icon: 'map-outline', iconActive: 'map' },
    { name: 'visits', title: 'Návštěvy', icon: 'footsteps-outline', iconActive: 'footsteps' },
    { name: 'leaderboard', title: 'Žebříček', icon: 'podium-outline', iconActive: 'podium' },
    { name: 'account', title: 'Účet', icon: 'person-outline', iconActive: 'person' },
];

const logo = require('../../../assets/images/logos/logo_hss_mark.png');

// Tab bar from the mock: 1 px border, 8 px above, a 48 px item, 14 px below.
const TAB_ITEM_HEIGHT = 48;
const TAB_PAD_TOP = 8;
const TAB_PAD_BOTTOM = 14;

function PointsBadge() {
    const { totalPoints, pendingCount } = useUserStats();

    return (
        <View style={styles.badgeGroup}>
            {pendingCount > 0 && (
                <View style={styles.pendingBadge}>
                    <Ionicons name="cloud-offline-outline" size={14} color={colors.warn} />
                    <Text style={styles.pendingText}>{pendingCount}</Text>
                </View>
            )}
            <View style={styles.pointsBadge}>
                <View style={styles.pointsDot} />
                <Text style={styles.pointsText}>{formatNumber(totalPoints)} b.</Text>
            </View>
        </View>
    );
}

/** Shared header of the tabs. The leaderboard has its own hero header instead. */
function AppBar({ title }: { title: string }) {
    const insets = useSafeAreaInsets();
    return (
        <View style={[styles.header, { paddingTop: insets.top }]}>
            <View style={styles.appbar}>
                <View style={styles.brand}>
                    <Image source={logo} style={styles.brandMark} />
                    <Text style={styles.headerTitle}>{title}</Text>
                </View>
                <PointsBadge />
            </View>
        </View>
    );
}

function TabButton({ tab, props }: { tab: (typeof TABS)[number]; props: BottomTabBarButtonProps }) {
    const focused = !!(props.accessibilityState?.selected ?? (props as any)['aria-selected']);
    const color = focused ? colors.navy : colors.inactive;
    return (
        <Pressable
            onPress={props.onPress}
            onLongPress={props.onLongPress}
            testID={props.testID}
            accessibilityRole="tab"
            accessibilityLabel={tab.title}
            accessibilityState={{ selected: focused }}
            style={styles.tab}
        >
            <View style={styles.tabIcon}>
                <Ionicons name={focused ? tab.iconActive : tab.icon} size={23} color={color} />
            </View>
            <Text style={[styles.tabLabel, { color }]}>{tab.title}</Text>
            <View style={[styles.tabDot, focused && styles.tabDotOn]} />
        </Pressable>
    );
}

export default function TabsLayout() {
    const insets = useSafeAreaInsets();
    const bottom = Math.max(TAB_PAD_BOTTOM, insets.bottom);

    return (
        <Tabs
            screenOptions={{
                tabBarHideOnKeyboard: true,
                headerShadowVisible: false,
                tabBarStyle: [
                    styles.tabBar,
                    { height: 1 + TAB_PAD_TOP + TAB_ITEM_HEIGHT + bottom, paddingBottom: bottom },
                ],
            }}
        >
            {TABS.map((tab) => (
                <Tabs.Screen
                    key={tab.name}
                    name={tab.name}
                    options={{
                        title: tab.title,
                        headerShown: tab.name !== 'leaderboard',
                        header: () => <AppBar title={tab.title} />,
                        tabBarButton: (props) => <TabButton tab={tab} props={props} />,
                    }}
                />
            ))}
        </Tabs>
    );
}

const styles = StyleSheet.create({
    badgeGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    pendingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: colors.warnBg,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
    },
    pendingText: { fontWeight: '800', color: colors.warn, fontSize: 12 },
    pointsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.primaryBg,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
    },
    pointsDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
    pointsText: { fontWeight: '900', color: colors.primary, fontSize: 14 },
    header: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
    appbar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 12,
    },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    brandMark: { width: 32, height: 32, borderRadius: 8 },
    headerTitle: { color: colors.navy, fontWeight: '900', fontSize: 18 },
    tabBar: {
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: TAB_PAD_TOP,
        paddingHorizontal: 6,
    },
    tab: { flex: 1, alignItems: 'center', height: TAB_ITEM_HEIGHT },
    tabIcon: { width: 23, height: 23, alignItems: 'center', justifyContent: 'center' },
    tabLabel: { fontSize: 11, fontWeight: '800', marginTop: 3, lineHeight: 15 },
    tabDot: { width: 18, height: 3, borderRadius: 2, marginTop: 4, backgroundColor: 'transparent' },
    tabDotOn: { backgroundColor: colors.accent },
});
