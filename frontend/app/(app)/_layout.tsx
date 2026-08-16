import { Stack } from 'expo-router';
import { Platform, View, Text, StyleSheet } from 'react-native';

export default function AppLayout() {
    const isDesktop = Platform.OS === 'web' && typeof window !== 'undefined' && window.innerWidth > 1024;

    if (isDesktop) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Hýbeme se společně</Text>
                <Text style={styles.text}>Tato aplikace je dostupná pouze na mobilních telefonech nebo jako PWA.</Text>
            </View>
        );
    }

    return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f5f5f5' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
    text: { fontSize: 16, textAlign: 'center', color: '#666' }
});