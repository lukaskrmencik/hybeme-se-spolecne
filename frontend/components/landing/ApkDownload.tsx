import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../utils/theme';

/**
 * The Android installer, for phones that want a real app before it is on Google Play.
 * The file is not in git: it is copied to frontend/public/download/ on the server and the deploy publishes it.
 */
export const APK_URL = '/download/hybeme-se-spolecne.apk';

const STEPS = [
  'Klepni na „Stáhnout APK“ a počkej, než se soubor stáhne.',
  'Otevři ho z oznámení nebo ze složky Stažené soubory.',
  'Když se telefon zeptá, povol prohlížeči instalovat aplikace.',
  'Klepni na „Instalovat“. Pokud se ozve Play Protect, zvol „Další podrobnosti“ a „Přesto nainstalovat“.',
];

/** Size of the published installer in bytes, `null` while unknown or when there is none yet. */
function useApk() {
  const [apk, setApk] = useState<{ size: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    // Without the file nginx answers with the landing page, so a 200 alone does not mean it is there.
    fetch(APK_URL, { method: 'HEAD', cache: 'no-store' })
      .then((res) => {
        const type = res.headers.get('content-type') ?? '';
        if (!cancelled && res.ok && !type.includes('text/html')) {
          setApk({ size: Number(res.headers.get('content-length')) || 0 });
        }
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, []);
  return apk;
}

/** Second way to get the app on Android: the installer file with a guide, until it is on Google Play. */
export function ApkDownload({ onDesktop }: { onDesktop: boolean }) {
  const apk = useApk();
  const [open, setOpen] = useState(false);
  const sizeMb = apk?.size ? ` (${Math.round(apk.size / 1048576)} MB)` : '';

  const download = () => {
    const link = document.createElement('a');
    link.href = APK_URL;
    link.download = 'hybeme-se-spolecne.apk';
    link.click();
  };

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title}>Raději klasickou aplikaci?</Text>
        <View style={styles.soon}>
          <Ionicons name="logo-google-playstore" size={13} color={colors.primary} />
          <Text style={styles.soonText}>Brzy na Google Play</Text>
        </View>
      </View>
      <Text style={styles.text}>
        {!apk
          ? 'Instalační soubor pro Android (APK) tu bude k dispozici co nevidět.'
          : onDesktop
            ? 'Pro Android je tu i instalační soubor (APK). Stáhni ho přímo v telefonu přes QR kód nahoře.'
            : 'Pro Android si můžeš stáhnout instalační soubor (APK) a nainstalovat ho mimo obchod.'}
      </Text>

      <View style={styles.actions}>
        {apk && !onDesktop && (
          <Pressable onPress={download} accessibilityRole="button" style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            <Ionicons name="download-outline" size={18} color={colors.navy} />
            <Text style={styles.buttonText}>Stáhnout APK{sizeMb}</Text>
          </Pressable>
        )}
        {apk && (
          <Pressable
            onPress={() => setOpen((o) => !o)}
            style={styles.toggle}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
          >
            <Text style={styles.toggleText}>Jak ho nainstalovat</Text>
            <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={15} color={colors.primary} />
          </Pressable>
        )}
      </View>

      {open && (
        <View style={styles.steps}>
          {STEPS.map((text, i) => (
            <View key={text} style={styles.step}>
              <Text style={styles.stepNumber}>{i + 1}</Text>
              <Text style={styles.stepText}>{text}</Text>
            </View>
          ))}
          <Text style={styles.note}>
            Z APK se aplikace sama neaktualizuje. Novou verzi stáhneš odsud a nainstaluješ přes tu starou; přihlášení
            i body zůstanou.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 18, gap: 8, marginTop: 14 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { color: colors.navy, fontSize: 15, fontWeight: '900' },
  text: { color: colors.muted, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  soon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  soonText: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginTop: 4 },
  button: {
    height: 42,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
  },
  buttonText: { color: colors.navy, fontSize: 14, fontWeight: '900' },
  pressed: { opacity: 0.85 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  toggleText: { color: colors.primary, fontSize: 14, fontWeight: '900' },
  steps: { gap: 2, marginTop: 6 },
  step: { flexDirection: 'row', alignItems: 'baseline', gap: 12, paddingVertical: 5 },
  stepNumber: { width: 14, color: colors.accent, fontSize: 15, fontWeight: '900' },
  stepText: { flex: 1, color: colors.navy, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  note: { color: colors.muted, fontSize: 13, lineHeight: 19, fontWeight: '600', marginTop: 6 },
});
