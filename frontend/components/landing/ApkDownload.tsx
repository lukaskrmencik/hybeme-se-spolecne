import { ComponentProps, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../utils/theme';

/**
 * The Android installer, for phones that want a real app before it is on Google Play.
 * The file is not in git: it is copied to frontend/public/download/ on the server and the deploy publishes it.
 */
export const APK_URL = '/download/hybeme-se-spolecne.apk';

type IconName = ComponentProps<typeof Ionicons>['name'];

const STEPS: { icon: IconName; text: string }[] = [
  { icon: 'download-outline', text: 'Klepni na „Stáhnout APK“ a počkej, než se soubor stáhne.' },
  { icon: 'folder-open-outline', text: 'Otevři stažený soubor z oznámení nebo ze složky Stažené soubory.' },
  {
    icon: 'shield-checkmark-outline',
    text: 'Telefon se zeptá, jestli smí prohlížeč instalovat aplikace. Klepni na „Nastavení“ a povol to.',
  },
  {
    icon: 'checkmark-circle-outline',
    text: 'Klepni na „Instalovat“. Pokud se ozve Play Protect, zvol „Další podrobnosti“ a „Přesto nainstalovat“.',
  },
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
      <View style={styles.head}>
        <View style={styles.icon}>
          <Ionicons name="logo-android" size={20} color={colors.navy} />
        </View>
        <View style={styles.headText}>
          <Text style={styles.title}>Raději klasickou aplikaci?</Text>
          <Text style={styles.text}>
            Pro Android si můžeš stáhnout i instalační soubor (APK). Funguje stejně, jen se instaluje mimo obchod.
          </Text>
        </View>
      </View>

      <View style={styles.soon}>
        <Ionicons name="logo-google-playstore" size={15} color={colors.primary} />
        <Text style={styles.soonText}>Již brzy na Google Play</Text>
      </View>

      {!apk ? (
        <Text style={styles.note}>Instalační soubor tu bude k dispozici co nevidět.</Text>
      ) : onDesktop ? (
        <Text style={styles.note}>Soubor stáhni přímo v telefonu: otevři si tuhle stránku přes QR kód nahoře.</Text>
      ) : (
        <Pressable
          onPress={download}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Ionicons name="download-outline" size={19} color={colors.navy} />
          <Text style={styles.buttonText}>Stáhnout APK{sizeMb}</Text>
        </Pressable>
      )}

      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={styles.toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.toggleText}>Jak APK nainstalovat</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
      </Pressable>

      {open && (
        <View style={styles.steps}>
          {STEPS.map((step, i) => (
            <View key={step.text} style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step.text}</Text>
              <Ionicons name={step.icon} size={20} color={colors.muted} />
            </View>
          ))}
          <Text style={styles.note}>
            Aplikace se z APK sama neaktualizuje. Novou verzi si stáhneš stejně, odsud z webu, a nainstaluješ ji přes tu
            starou; přihlášení i body ti zůstanou.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: 18,
    gap: 12,
    marginTop: 14,
  },
  head: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.navyBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headText: { flex: 1, gap: 3 },
  title: { color: colors.navy, fontSize: 16, fontWeight: '900' },
  text: { color: colors.muted, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  soon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryBg,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  soonText: { color: colors.primary, fontSize: 13, fontWeight: '900' },
  note: { color: colors.muted, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  button: {
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: { color: colors.navy, fontSize: 15, fontWeight: '900' },
  pressed: { opacity: 0.85 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 2 },
  toggleText: { color: colors.primary, fontSize: 14, fontWeight: '900' },
  steps: { gap: 8 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.navyBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { color: colors.navy, fontSize: 13, fontWeight: '900' },
  stepText: { flex: 1, color: colors.navy, fontSize: 14, lineHeight: 20, fontWeight: '700' },
});
