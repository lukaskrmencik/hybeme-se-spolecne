import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

export default function TabsLayout() {
    return (
        <Tabs
        screenOptions={{
            tabBarActiveTintColor: '#4a90e2',
            headerRight: () => (
            <View style={styles.pointsBadge}>
                <Text style={styles.pointsText}>⭐️ 150 bodů</Text>
            </View>
            ),
        }}
        >
        <Tabs.Screen
            name="map"
            options={{
                title: 'Mapa',
            }}
        />
        <Tabs.Screen
            name="visits"
            options={{
                title: 'Návštěvy',
            }}
        />
        <Tabs.Screen
            name="leaderboard"
            options={{
                title: 'Žebříček',
            }}
        />
        <Tabs.Screen
            name="account"
            options={{
                title: 'Účet',
            }}
        />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    pointsBadge: {
        backgroundColor: '#f1f1f1',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: 15,
    },
    pointsText: {
        fontWeight: 'bold',
        color: '#333',
    },
});