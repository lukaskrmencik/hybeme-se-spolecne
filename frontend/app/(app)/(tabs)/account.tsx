import { View, Text, StyleSheet } from 'react-native';

export default function AccountScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Tady bude účet uživatele!</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    text: { fontSize: 18 }
});