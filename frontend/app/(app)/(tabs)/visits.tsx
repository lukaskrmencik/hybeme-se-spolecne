import { View, Text, StyleSheet } from 'react-native';

export default function VisitsScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Tady bude seznam návštěv!</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    text: { fontSize: 18 }
});