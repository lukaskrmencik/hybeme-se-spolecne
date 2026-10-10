import React, { ComponentProps, useEffect, useRef, useState } from 'react';
import { Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../context/AuthContext';
import { PartnerLogos } from '../PartnerLogos';
import { LandingLeaderboard } from './LandingLeaderboard';
import { ApkDownload } from './ApkDownload';
import { LegalLinks } from '../legal/LegalLinks';
import { LEGAL } from '../../constants/legal';
import { colors, radius, shadows } from '../../utils/theme';

const logo = require('../../assets/images/logos/logo_hss_mark.png');
const heroPhoto = require('../../assets/images/benatky-zamek.webp');

/** The hero photo is CC BY-SA 3.0, which requires naming the author and the licence. */
const PHOTO_CREDIT = {
  text: 'Foto zámku: Zdeněk Fiedler, CC BY-SA 3.0',
  url: 'https://commons.wikimedia.org/wiki/File:Benatky_zamek.jpg',
};

/** Same breakpoint as the desktop gate in the root layout. */
export const DESKTOP_MIN_WIDTH = 1024;

type IconName = ComponentProps<typeof Ionicons>['name'];
type DeviceTab = 'android' | 'ios';

const HOW: { title: string; text: string }[] = [
  { title: 'Vyber místo', text: 'Na mapě najdeš zajímavá místa v okolí i to, kolik bodů za ně dostaneš.' },
  { title: 'Dojdi tam', text: 'Pěšky nebo na kole. Na místě klepneš na „Jsem tu!“ a GPS návštěvu ověří.' },
  { title: 'Sbírej body', text: 'Navaž další návštěvou stejným sportem a body se násobí.' },
];

const STEPS: Record<DeviceTab, string[]> = {
  android: [
    'Otevři tuhle stránku v Chromu.',
    'Vpravo nahoře klepni na menu (tři tečky).',
    'Vyber „Přidat na plochu“ nebo „Nainstalovat aplikaci“.',
    'Potvrď a ikona se objeví na ploše.',
  ],
  ios: [
    'Otevři tuhle stránku v Safari.',
    'Dole klepni na Sdílet (čtvereček se šipkou).',
    'Vyber „Přidat na plochu“.',
    'Vpravo nahoře klepni na „Přidat“.',
  ],
};

/** Chrome on Android fires this when the site can be installed; prompt() opens the system dialog. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function detectDevice(): DeviceTab {
  if (typeof navigator === 'undefined') return 'android';
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ? 'ios' : 'android';
}

function useInstallPrompt() {
  const [event, setEvent] = useState<InstallPromptEvent | null>(null);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallPromptEvent);
    };
    const onInstalled = () => setEvent(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!event) return;
    await event.prompt();
    await event.userChoice.catch(() => null);
    setEvent(null);
  };
  return { canInstall: !!event, install };
}

function Button({
  label,
  icon,
  onPress,
  variant = 'primary',
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  variant?: 'primary' | 'glass';
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, variant === 'glass' && styles.buttonGlass, pressed && styles.pressed]}
    >
      <Text style={styles.buttonText}>{label}</Text>
      {icon && <Ionicons name={icon} size={19} color={colors.white} />}
    </Pressable>
  );
}

/** Public front page of the web: what the app is, who runs it, how to install it, and the way in. */
export function LandingPage() {
  // The page is rendered into the HTML at build time, without a screen or an address. The first render in the
  // browser must match that HTML, so the screen width and the address are used only once the page is running.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const screen = useWindowDimensions();
  const width = mounted ? screen.width : 0;
  const isDesktop = width >= DESKTOP_MIN_WIDTH;
  const wide = width >= 760;
  const router = useRouter();
  const { token } = useAuth();
  const { canInstall, install } = useInstallPrompt();
  const [device, setDevice] = useState<DeviceTab>('android');
  const scrollRef = useRef<ScrollView>(null);
  const guideY = useRef(0);

  useEffect(() => setDevice(detectDevice()), []);

  const appUrl = mounted ? window.location.origin : '';
  const appHost = appUrl.replace(/^https?:\/\//, '');
  const openApp = () => router.push(token ? '/map' : '/login');
  const toGuide = () => scrollRef.current?.scrollTo({ y: guideY.current - 16, animated: true });

  return (
    <ScrollView ref={scrollRef} style={styles.page} contentContainerStyle={styles.pageContent}>
      {/* Hero over a photo of the castle */}
      <View style={styles.hero}>
        <Image
          source={heroPhoto}
          resizeMode="cover"
          style={[StyleSheet.absoluteFill, styles.heroPhoto]}
          accessibilityLabel="Zámek Benátky nad Jizerou z výšky"
        />
        <View style={[StyleSheet.absoluteFill, styles.heroShade]} />
        <View style={[styles.inner, styles.heroInner, wide && styles.heroInnerWide]}>
          <View style={[styles.heroText, wide && styles.heroTextWide]}>
            <View style={styles.brand}>
              <Image source={logo} style={styles.brandLogo} accessibilityLabel="Hýbeme se společně" />
              <Text style={styles.brandName}>Hýbeme se společně</Text>
            </View>
            <Text role="heading" aria-level={1} style={[styles.heroTitle, wide && styles.heroTitleWide]}>
              Objevuj Benátecko pěšky i na kole
            </Text>
            <Text style={styles.heroLead}>Navštěvuj zajímavá místa v okolí, sbírej body a poměř síly s ostatními.</Text>

            {!isDesktop && (
              <View style={styles.heroActions}>
                <Button label={token ? 'Pokračovat do aplikace' : 'Otevřít aplikaci'} icon="arrow-forward" onPress={openApp} />
                <Button
                  label={canInstall ? 'Nainstalovat na plochu' : 'Jak ji dát na plochu'}
                  variant="glass"
                  onPress={canInstall ? () => void install() : toGuide}
                />
              </View>
            )}
          </View>

          {isDesktop && (
            <View style={styles.qrCard}>
              {!!appUrl && <QRCode value={appUrl} size={150} color={colors.navy} backgroundColor={colors.white} />}
              <Text style={styles.qrTitle}>Otevři v telefonu</Text>
              <Text style={styles.qrText}>
                Aplikace pracuje s polohou, proto běží jen v mobilu. Naskenuj kód
                {appHost ? ' nebo zadej ' : ''}
                {appHost ? <Text style={styles.qrHost}>{appHost}</Text> : null}.
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.sheet}>
        {/* About: who is behind the app, also the words people search for (the school, the town). */}
        <View style={[styles.inner, styles.about, wide && styles.aboutWide]}>
          <View style={wide ? styles.aboutTextWide : undefined}>
            <Text role="heading" aria-level={2} style={styles.aboutTitle}>
              Aplikace z Benátek nad Jizerou
            </Text>
            <Text style={styles.aboutText}>
              Připravila ji {LEGAL.operatorName} pro žáky i pro všechny, kdo chtějí poznávat Benátky a okolí.
              Zdarma, s podporou hlavního partnera {LEGAL.partner}.
            </Text>
          </View>
          <View style={wide ? styles.aboutLogosWide : styles.aboutLogos}>
            <PartnerLogos />
          </View>
        </View>

        {/* How it works */}
        <View style={[styles.inner, styles.section]}>
          <Text role="heading" aria-level={2} style={styles.sectionTitle}>Jak to funguje</Text>
          <View style={[styles.how, wide && styles.howWide]}>
            {HOW.map((step, i) => (
              <View key={step.title} style={[styles.howStep, wide && styles.howStepWide]}>
                <Text style={styles.howNumber}>{i + 1}</Text>
                <Text style={styles.howTitle}>{step.title}</Text>
                <Text style={styles.howText}>{step.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Public leaderboards */}
        <View style={styles.band}>
          <View style={[styles.inner, wide && styles.boardWide]}>
            <View style={wide ? styles.boardText : undefined}>
              <Text role="heading" aria-level={2} style={styles.sectionTitle}>Kdo se hýbe nejvíc</Text>
              <Text style={styles.sectionLead}>
                Celkové pořadí, a k tomu každé pondělí nový týdenní žebříček. Do čela se může dostat kdokoli.
              </Text>
            </View>
            <View style={wide ? styles.boardCard : styles.boardCardNarrow}>
              <LandingLeaderboard />
            </View>
          </View>
        </View>

        {/* Install guide */}
        <View
          style={[styles.inner, styles.section, wide && styles.installWide]}
          onLayout={(e) => (guideY.current = e.nativeEvent.layout.y)}
        >
          <View style={wide ? styles.installText : undefined}>
            <Text role="heading" aria-level={2} style={styles.sectionTitle}>Dej si ji na plochu</Text>
            <Text style={styles.sectionLead}>
              Bez obchodu, přímo z prohlížeče. Pak se otevírá jako každá jiná aplikace a návštěvu zapíšeš i bez
              signálu.
            </Text>
          </View>

          <View style={[styles.guideColumn, wide && styles.guideWide]}>
            <View style={styles.guide}>
              <View style={styles.tabs} accessibilityRole="tablist">
                {(['android', 'ios'] as DeviceTab[]).map((tab) => {
                  const active = device === tab;
                  return (
                    <Pressable
                      key={tab}
                      onPress={() => setDevice(tab)}
                      style={[styles.tab, active && styles.tabActive]}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab === 'android' ? 'Android' : 'iPhone'}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {STEPS[device].map((text, i) => (
                <View key={text} style={styles.step}>
                  <Text style={styles.stepNumber}>{i + 1}</Text>
                  <Text style={styles.stepText}>{text}</Text>
                </View>
              ))}

              {device === 'android' && canInstall && (
                <Button label="Nainstalovat jedním klepnutím" onPress={() => void install()} />
              )}
            </View>

            {device === 'android' && <ApkDownload onDesktop={isDesktop} />}
          </View>
        </View>

        <View style={styles.footer}>
          <View style={[styles.inner, styles.footerInner]}>
            <View style={styles.footerBrand}>
              <Image source={logo} style={styles.footerLogo} />
              <Text style={styles.footerName}>Hýbeme se společně</Text>
            </View>
            <Text style={styles.footerText}>
              Provozuje {LEGAL.operatorName}, {LEGAL.operatorAddress}
            </Text>
            <LegalLinks onDark />
            <Text style={styles.footerSmall} onPress={() => void Linking.openURL(PHOTO_CREDIT.url)} accessibilityRole="link">
              {PHOTO_CREDIT.text}
            </Text>
            <Text style={styles.footerSmall}>© {new Date().getFullYear()} Hýbeme se společně</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.navy },
  pageContent: { flexGrow: 1 },
  inner: { width: '100%', maxWidth: 1080, alignSelf: 'center', paddingHorizontal: 20 },
  pressed: { opacity: 0.85 },

  hero: { minHeight: 560, justifyContent: 'center', backgroundColor: colors.navy },
  heroPhoto: { width: '100%', height: '100%' },
  heroShade: { backgroundColor: 'rgba(12, 38, 61, 0.58)' },
  heroInner: { gap: 28, paddingTop: 36, paddingBottom: 64 },
  heroInnerWide: { flexDirection: 'row', alignItems: 'center', paddingTop: 64, paddingBottom: 96 },
  heroText: { gap: 16 },
  heroTextWide: { flex: 1 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  brandLogo: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.white },
  brandName: { color: colors.white, fontSize: 16, fontWeight: '900' },
  heroTitle: { textShadowColor: 'rgba(0, 0, 0, 0.35)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 16, color: colors.white, fontSize: 38, lineHeight: 44, fontWeight: '900', letterSpacing: -0.8 },
  heroTitleWide: { fontSize: 58, lineHeight: 64, maxWidth: 640 },
  heroLead: { color: 'rgba(255,255,255,0.85)', fontSize: 18, lineHeight: 26, fontWeight: '600', maxWidth: 520 },
  heroActions: { gap: 10, marginTop: 12 },

  qrCard: {
    width: 300,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 24,
    gap: 10,
    alignItems: 'center',
    boxShadow: '0px 16px 40px rgba(0, 0, 0, 0.3)',
  },
  qrTitle: { color: colors.navy, fontSize: 19, fontWeight: '900', marginTop: 8 },
  qrText: { color: colors.muted, fontSize: 13, lineHeight: 19, fontWeight: '600', textAlign: 'center' },
  qrHost: { color: colors.navy, fontWeight: '900' },

  button: {
    height: 54,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  buttonGlass: { backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)' },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '900' },

  // The page slides over the bottom of the photo like a sheet.
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -28 },

  about: { paddingTop: 32, paddingBottom: 8, gap: 20 },
  aboutWide: { flexDirection: 'row', alignItems: 'center', gap: 48, paddingTop: 44 },
  aboutTextWide: { flex: 1 },
  aboutTitle: { color: colors.navy, fontSize: 20, fontWeight: '900' },
  aboutText: { color: colors.muted, fontSize: 15, lineHeight: 22, fontWeight: '600', marginTop: 6, maxWidth: 560 },
  aboutLogos: { paddingTop: 4 },
  aboutLogosWide: { width: 360 },

  section: { paddingTop: 56 },
  sectionTitle: { color: colors.navy, fontSize: 30, lineHeight: 36, fontWeight: '900', letterSpacing: -0.4 },
  sectionLead: { color: colors.muted, fontSize: 16, lineHeight: 24, fontWeight: '600', marginTop: 10, maxWidth: 520 },

  how: { gap: 28, marginTop: 24 },
  howWide: { flexDirection: 'row', gap: 40 },
  howStep: { borderTopWidth: 2, borderTopColor: colors.border, paddingTop: 16 },
  howStepWide: { flex: 1 },
  howNumber: { color: colors.accent, fontSize: 40, lineHeight: 46, fontWeight: '900' },
  howTitle: { color: colors.navy, fontSize: 19, fontWeight: '900', marginTop: 4 },
  howText: { color: colors.muted, fontSize: 15, lineHeight: 22, fontWeight: '600', marginTop: 6 },

  band: { backgroundColor: colors.navyBg, marginTop: 64, paddingVertical: 56 },
  boardWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 56 },
  boardText: { flex: 1, paddingTop: 8 },
  boardCard: { flex: 1.3 },
  boardCardNarrow: { marginTop: 24 },

  installWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 56 },
  installText: { flex: 1, paddingTop: 8 },
  guideColumn: { marginTop: 24, maxWidth: 640 },
  guideWide: { flex: 1.3, marginTop: 0 },
  guide: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, gap: 4, ...shadows.card },
  tabs: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: radius.full, padding: 4, marginBottom: 10 },
  tab: { flex: 1, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: colors.navy },
  tabText: { color: colors.navy, fontSize: 14, fontWeight: '800' },
  tabTextActive: { color: colors.white },
  step: { flexDirection: 'row', alignItems: 'baseline', gap: 14, paddingVertical: 8 },
  stepNumber: { width: 18, color: colors.accent, fontSize: 18, fontWeight: '900' },
  stepText: { flex: 1, color: colors.navy, fontSize: 15, lineHeight: 22, fontWeight: '700' },

  footer: { marginTop: 72, backgroundColor: colors.navy },
  footerInner: { paddingVertical: 32, gap: 12, alignItems: 'center' },
  footerBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footerLogo: { width: 34, height: 34, borderRadius: 8, backgroundColor: colors.white },
  footerName: { color: colors.white, fontSize: 16, fontWeight: '900' },
  footerText: { color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  footerSmall: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '700', textAlign: 'center' },
});
