import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LocationStatus } from '../hooks/useLocation';
import { colors, radius } from '../utils/theme';

const isIos = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

/** Where to allow the location once the browser stopped asking (it never asks again after a refusal). */
function webSteps(): string[] {
  if (isIos()) {
    return [
      'Otevři Nastavení → Soukromí a zabezpečení → Polohové služby.',
      'Zapni Polohové služby a u Weby Safari zvol „Při používání“.',
      'V Safari klepni na „aA“ vlevo v adresním řádku → Nastavení webu → Poloha → Povolit.',
    ];
  }
  return [
    'Klepni na ikonu vlevo od adresy (zámek nebo posuvníky) → Oprávnění → Poloha → Povolit.',
    'V nainstalované aplikaci: podrž její ikonu → Informace o aplikaci → Oprávnění → Poloha.',
    'Případně v Chromu: ⋮ → Nastavení → Nastavení webů → Poloha → hybemesespolecne.cz.',
  ];
}

/**
 * Red notice on the map when the location is missing, with the way to fix it: ask again when the system
 * still lets us, otherwise open the settings (native app) or show where to allow it (web).
 */
export function LocationBanner({ status, onRetry }: { status: LocationStatus; onRetry: () => void }) {
  const [help, setHelp] = useState(false);
  if (status !== 'denied' && status !== 'blocked' && status !== 'error') return null;

  const native = Platform.OS !== 'web';
  const text =
    status === 'error'
      ? 'Polohu se nepodařilo zjistit. Zkontroluj, že máš v telefonu zapnutou polohu.'
      : status === 'denied'
        ? 'Bez přístupu k poloze nejde zaznamenat návštěvu.'
        : native
          ? 'Přístup k poloze je zakázaný. Povol ho v nastavení aplikace.'
          : 'Přístup k poloze je v prohlížeči zakázaný a znovu se už nezeptá. Povol ho v nastavení, appka to pak sama pozná.';

  return (
    <View style={styles.banner}>
      <View style={styles.row}>
        <Ionicons name="location-outline" size={18} color={colors.white} />
        <Text style={styles.text}>{text}</Text>
      </View>

      <View style={styles.actions}>
        {status === 'blocked' && native ? (
          <Pressable style={styles.button} onPress={() => void Linking.openSettings()} accessibilityRole="button">
            <Text style={styles.buttonText}>Otevřít nastavení</Text>
          </Pressable>
        ) : status === 'blocked' ? (
          <>
            <Pressable style={styles.button} onPress={() => setHelp((v) => !v)} accessibilityRole="button">
              <Text style={styles.buttonText}>{help ? 'Skrýt návod' : 'Jak polohu povolit'}</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.buttonGhost]} onPress={onRetry} accessibilityRole="button">
              <Text style={[styles.buttonText, styles.buttonGhostText]}>Zkontrolovat znovu</Text>
            </Pressable>
          </>
        ) : (
          <Pressable style={styles.button} onPress={onRetry} accessibilityRole="button">
            <Text style={styles.buttonText}>{status === 'error' ? 'Zkusit znovu' : 'Povolit polohu'}</Text>
          </Pressable>
        )}
      </View>

      {help && status === 'blocked' && !native && (
        <View style={styles.help}>
          {webSteps().map((step, i) => (
            <Text key={i} style={styles.helpText}>
              {i + 1}. {step}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { marginHorizontal: 12, backgroundColor: colors.danger, padding: 12, borderRadius: radius.md, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  text: { flex: 1, color: colors.white, fontWeight: '700', fontSize: 14, lineHeight: 19 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { backgroundColor: colors.white, borderRadius: radius.sm, paddingHorizontal: 14, height: 36, justifyContent: 'center' },
  buttonText: { color: colors.dangerText, fontWeight: '900', fontSize: 14 },
  buttonGhost: { backgroundColor: 'rgba(255,255,255,0.16)' },
  buttonGhostText: { color: colors.white },
  help: { backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: radius.sm, padding: 10, gap: 6 },
  helpText: { color: colors.white, fontSize: 13, lineHeight: 18, fontWeight: '600' },
});
