import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors, radius } from '../utils/theme';

const logo = require('../assets/images/logos/logo_hss_mark.png');

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ title: 'Stránka nenalezena', headerShown: false }} />
      <View style={styles.container}>
        <Image source={logo} style={styles.logo} accessibilityLabel="Hýbeme se společně" />
        <Text style={styles.code}>404</Text>
        <Text style={styles.title}>Tahle stránka neexistuje</Text>
        <Text style={styles.text}>Možná se změnila adresa, nebo je v odkazu překlep.</Text>
        <Pressable style={styles.button} onPress={() => router.replace('/')} accessibilityRole="link">
          <Text style={styles.buttonText}>Zpět na úvod</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8, backgroundColor: colors.background },
  logo: { width: 96, height: 96, marginBottom: 8 },
  code: { color: colors.accent, fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  title: { color: colors.navy, fontSize: 24, fontWeight: '900', textAlign: 'center' },
  text: { color: colors.muted, fontSize: 15, fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  button: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 22, height: 48, justifyContent: 'center' },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '900' },
});
