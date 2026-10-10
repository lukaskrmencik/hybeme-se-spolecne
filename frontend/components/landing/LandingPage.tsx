import React, { ComponentProps, useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../context/AuthContext';
import { PartnerLogos } from '../PartnerLogos';
import { LandingLeaderboard } from './LandingLeaderboard';
import { ApkDownload } from './ApkDownload';
import { LegalLinks } from '../legal/LegalLinks';
import { LEGAL } from '../../constants/legal';
import Svg, { Path } from 'react-native-svg';
import { colors, radius, shadows } from '../../utils/theme';

const logo = require('../../assets/images/logos/logo_hss_mark.png');

/** Same breakpoint as the desktop gate in the root layout. */
export const DESKTOP_MIN_WIDTH = 1024;

type IconName = ComponentProps<typeof Ionicons>['name'];
type DeviceTab = 'android' | 'ios';

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'map',
    title: 'Mapa míst',
    text: 'Zajímavá místa v okolí na jedné mapě. U každého hned vidíš, kolik bodů za něj dostaneš.',
  },
  {
    icon: 'location',
    title: 'Jsem tu!',
    text: 'Dojdi nebo dojeď na místo a jedním klepnutím si zapiš návštěvu. Polohu ověří GPS.',
  },
  {
    icon: 'link',
    title: 'Kombinace',
    text: 'Navaž na poslední návštěvu stejným sportem a body se násobí. Čím delší řada, tím víc.',
  },
  {
    icon: 'podium',
    title: 'Žebříček',
    text: 'Porovnej se s ostatními a sleduj, kdo se na Benátecku hýbe nejvíc.',
  },
];

const STEPS: Record<DeviceTab, { icon: IconName; text: string }[]> = {
  android: [
    { icon: 'logo-chrome', text: 'Otevři tuhle stránku v prohlížeči Chrome.' },
    { icon: 'ellipsis-vertical', text: 'Vpravo nahoře klepni na menu (tři tečky).' },
    { icon: 'add-circle-outline', text: 'Vyber „Přidat na plochu“ nebo „Nainstalovat aplikaci“.' },
    { icon: 'checkmark-circle-outline', text: 'Potvrď a ikona aplikace se objeví na ploše.' },
  ],
  ios: [
    { icon: 'compass-outline', text: 'Otevři tuhle stránku v prohlížeči Safari.' },
    { icon: 'share-outline', text: 'Dole klepni na tlačítko Sdílet (čtvereček se šipkou).' },
    { icon: 'add-circle-outline', text: 'Sjeď níž a vyber „Přidat na plochu“.' },
    { icon: 'checkmark-circle-outline', text: 'Vpravo nahoře klepni na „Přidat“.' },
  ],
};

const FACTS: { icon: IconName; text: string }[] = [
  { icon: 'gift-outline', text: 'Zdarma' },
  { icon: 'people-outline', text: 'Pro žáky i veřejnost' },
  { icon: 'location-outline', text: 'Benátky nad Jizerou a okolí' },
];

const BOARDS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'trophy-outline', title: 'Celkový', text: 'Všechny body od začátku.' },
  { icon: 'calendar-outline', title: 'Tento týden', text: 'Každé pondělí začíná nový souboj.' },
  { icon: 'time-outline', title: 'Historie', text: 'Nejlepší tři z minulých týdnů.' },
];

const BENEFITS: { icon: IconName; text: string }[] = [
  { icon: 'expand-outline', text: 'Běží na celou obrazovku, bez lišty prohlížeče.' },
  { icon: 'flash-outline', text: 'Spustíš ji jedním klepnutím z plochy.' },
  { icon: 'cloud-offline-outline', text: 'Návštěvu zapíšeš i bez signálu, odešle se později.' },
];

/** Soft wave from the navy hero into the page, echoing the path in the logo. */
function HeroWave() {
  return (
    <Svg viewBox="0 0 1440 60" preserveAspectRatio="none" width="100%" height={48} style={styles.wave}>
      <Path d="M0 30 C 240 0, 480 60, 720 30 S 1200 0, 1440 26 L1440 60 L0 60 Z" fill={colors.background} />
      <Path d="M0 30 C 240 0, 480 60, 720 30 S 1200 0, 1440 26" stroke={colors.accent} strokeOpacity={0.55} strokeWidth={3} fill="none" />
    </Svg>
  );
}

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
  icon: IconName;
  onPress: () => void;
  variant?: 'primary' | 'light' | 'outline';
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        variant === 'light' && styles.buttonLight,
        variant === 'outline' && styles.buttonOutline,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={20} color={variant === 'primary' ? colors.white : colors.navy} />
      <Text style={[styles.buttonText, variant !== 'primary' && styles.buttonTextDark]}>{label}</Text>
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
      {/* Hero */}
      <View style={styles.hero}>
        <View style={[styles.inner, styles.heroInner, wide && styles.heroInnerWide]}>
          <View style={[styles.heroText, wide && styles.heroTextWide]}>
            <View style={styles.brand}>
              <Image source={logo} style={styles.brandLogo} accessibilityLabel="Hýbeme se společně" />
              <Text style={styles.brandName}>Hýbeme se společně</Text>
            </View>
            <Text role="heading" aria-level={1} style={[styles.heroTitle, wide && styles.heroTitleWide]}>
              Objevuj Benátecko pěšky i na kole
            </Text>
            <Text style={styles.heroLead}>
              Navštěvuj zajímavá místa v okolí, sbírej za ně body a poměř síly s ostatními. Čím víc se hýbeš, tím víc
              bodů máš.
            </Text>

            {!isDesktop && (
              <View style={styles.heroActions}>
                <Button label={token ? 'Pokračovat do aplikace' : 'Otevřít aplikaci'} icon="arrow-forward" onPress={openApp} />
                <Button
                  label={canInstall ? 'Nainstalovat na plochu' : 'Jak ji dát na plochu'}
                  icon="download-outline"
                  variant="light"
                  onPress={canInstall ? () => void install() : toGuide}
                />
              </View>
            )}
            {mounted && device === 'android' && (
              <View style={styles.playSoon}>
                <Ionicons name="logo-google-playstore" size={15} color={colors.accent} />
                <Text style={styles.playSoonText}>Již brzy i na Google Play</Text>
              </View>
            )}
          </View>

          {isDesktop ? (
            <View style={styles.phoneCard}>
              <View style={styles.phoneBadge}>
                <Ionicons name="phone-portrait-outline" size={16} color={colors.primary} />
                <Text style={styles.phoneBadgeText}>Jen pro telefon</Text>
              </View>
              <Text style={styles.phoneTitle}>Otevři aplikaci na mobilu</Text>
              <Text style={styles.phoneText}>
                Aplikace pracuje s polohou telefonu, a proto na počítači nefunguje. Naskenuj QR kód fotoaparátem
                telefonu{appHost ? ' nebo v něm otevři adresu' : ''}
                {appHost ? <Text style={styles.phoneHost}> {appHost}</Text> : null}.
              </Text>
              {!!appUrl && (
                <View style={styles.qr}>
                  <QRCode value={appUrl} size={168} color={colors.navy} backgroundColor={colors.white} />
                </View>
              )}
            </View>
          ) : (
            wide && <Image source={logo} style={styles.heroLogo} />
          )}
        </View>
        <HeroWave />
      </View>

      {/* About: who is behind the app, also the words people search for (the school, the town). */}
      <View style={[styles.inner, styles.aboutSection]}>
        <View style={[styles.about, wide && styles.aboutWide]}>
          <View style={wide ? styles.aboutTextWide : undefined}>
            <Text style={styles.kicker}>O projektu</Text>
            <Text role="heading" aria-level={2} style={styles.sectionTitle}>
              Aplikace z Benátek nad Jizerou
            </Text>
            <Text style={styles.sectionLead}>
              Hýbeme se společně připravila {LEGAL.operatorName} pro své žáky i pro všechny, kdo chtějí poznávat
              Benátky nad Jizerou a jejich okolí. Projekt podporuje hlavní partner {LEGAL.partner}.
            </Text>
            <View style={styles.facts}>
              {FACTS.map((f) => (
                <View key={f.text} style={styles.fact}>
                  <Ionicons name={f.icon} size={15} color={colors.primary} />
                  <Text style={styles.factText}>{f.text}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={[styles.aboutLogos, wide && styles.aboutLogosWide]}>
            <PartnerLogos />
          </View>
        </View>
      </View>

      {/* Features */}
      <View style={[styles.inner, styles.section]}>
        <Text style={styles.kicker}>Jak to funguje</Text>
        <Text role="heading" aria-level={2} style={styles.sectionTitle}>Pohyb, který se počítá</Text>
        <View style={[styles.features, wide && styles.featuresWide]}>
          {FEATURES.map((f, i) => (
            <View key={f.title} style={[styles.feature, wide ? styles.featureWide : styles.featureRow]}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={22} color={colors.primary} />
              </View>
              <View style={styles.featureBody}>
                <Text style={styles.featureTitle}>
                  <Text style={styles.featureNumber}>{i + 1}. </Text>
                  {f.title}
                </Text>
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Public leaderboards, on their own band */}
      <View style={styles.band}>
        <View style={[styles.inner, wide && styles.boardWide]}>
          <View style={wide && styles.boardText}>
            <Text style={styles.kicker}>Žebříček</Text>
            <Text role="heading" aria-level={2} style={styles.sectionTitle}>Kdo se hýbe nejvíc</Text>
            <Text style={styles.sectionLead}>
              Za každou návštěvu a kombinaci přibývají body. Vedle celkového pořadí běží každý týden nový žebříček,
              takže se do čela může dostat kdokoli.
            </Text>
            <View style={styles.boardPoints}>
              {BOARDS.map((b) => (
                <View key={b.title} style={styles.boardPoint}>
                  <View style={styles.boardPointIcon}>
                    <Ionicons name={b.icon} size={17} color={colors.navy} />
                  </View>
                  <View style={styles.featureBody}>
                    <Text style={styles.boardPointTitle}>{b.title}</Text>
                    <Text style={styles.boardPointText}>{b.text}</Text>
                  </View>
                </View>
              ))}
            </View>
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
        <View style={wide && styles.installText}>
          <Text style={styles.kicker}>Instalace</Text>
          <Text role="heading" aria-level={2} style={styles.sectionTitle}>Dej si aplikaci na plochu</Text>
          <Text style={styles.sectionLead}>
            Nemusíš nic stahovat z obchodu. Aplikaci si přidáš na plochu přímo z prohlížeče a pak se otevírá jako
            každá jiná.
          </Text>
          <View style={styles.benefits}>
            {BENEFITS.map((b) => (
              <View key={b.text} style={styles.benefit}>
                <Ionicons name={b.icon} size={18} color={colors.primary} />
                <Text style={styles.benefitText}>{b.text}</Text>
              </View>
            ))}
          </View>
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
                    <Ionicons name={tab === 'android' ? 'logo-android' : 'logo-apple'} size={18} color={active ? colors.white : colors.navy} />
                    <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab === 'android' ? 'Android' : 'iPhone'}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.recommended}>
              <Ionicons name="star" size={13} color={colors.primary} />
              <Text style={styles.recommendedText}>Doporučujeme: přímo z prohlížeče</Text>
            </View>

            {STEPS[device].map((step, i) => (
              <View key={step.text} style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step.text}</Text>
                <Ionicons name={step.icon} size={22} color={colors.muted} />
              </View>
            ))}

            {device === 'android' && canInstall && (
              <Button label="Nainstalovat jedním klepnutím" icon="download-outline" onPress={() => void install()} />
            )}
          </View>

          {device === 'android' && <ApkDownload onDesktop={isDesktop} />}
        </View>
      </View>

      {/* Closing call to action */}
      {!isDesktop && (
        <View style={[styles.inner, styles.section]}>
          <View style={styles.cta}>
            <Text style={styles.ctaTitle}>Nechceš nic instalovat?</Text>
            <Text style={styles.ctaText}>Aplikace funguje i přímo v prohlížeči.</Text>
            <Button label="Použít v prohlížeči" icon="globe-outline" variant="light" onPress={openApp} />
          </View>
        </View>
      )}

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
          <Text style={styles.copyright}>© {new Date().getFullYear()} Hýbeme se společně</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  pageContent: { flexGrow: 1 },
  inner: { width: '100%', maxWidth: 1080, alignSelf: 'center', paddingHorizontal: 20 },
  pressed: { opacity: 0.85 },

  hero: { backgroundColor: colors.navy, paddingTop: 28 },
  wave: { marginTop: 28, marginBottom: -1 },
  heroInner: { gap: 28 },
  heroInnerWide: { flexDirection: 'row', alignItems: 'center', paddingVertical: 24 },
  heroText: { gap: 14 },
  heroTextWide: { flex: 1 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  brandLogo: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.white },
  brandName: { color: colors.white, fontSize: 17, fontWeight: '900' },
  heroTitle: { color: colors.white, fontSize: 32, lineHeight: 38, fontWeight: '900', letterSpacing: -0.5 },
  heroTitleWide: { fontSize: 46, lineHeight: 52 },
  heroLead: { color: 'rgba(255,255,255,0.8)', fontSize: 17, lineHeight: 25, fontWeight: '600', maxWidth: 560 },
  heroActions: { gap: 10, marginTop: 8 },
  heroLogo: { width: 240, height: 240, borderRadius: 48, backgroundColor: colors.white },

  phoneCard: {
    width: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 24,
    gap: 12,
    alignItems: 'center',
    boxShadow: '0px 12px 32px rgba(0, 0, 0, 0.25)',
  },
  phoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  phoneBadgeText: { color: colors.primary, fontSize: 13, fontWeight: '900' },
  phoneTitle: { color: colors.navy, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  phoneText: { color: colors.muted, fontSize: 14, lineHeight: 20, fontWeight: '600', textAlign: 'center' },
  phoneHost: { color: colors.navy, fontWeight: '900' },
  qr: { padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginTop: 4 },

  button: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  buttonLight: { backgroundColor: colors.white },
  buttonOutline: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '900' },
  buttonTextDark: { color: colors.navy },

  section: { paddingTop: 40 },
  playSoon: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  playSoonText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '800' },

  aboutSection: { paddingTop: 8 },
  about: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 22, gap: 20, ...shadows.card },
  aboutWide: { flexDirection: 'row', alignItems: 'center', gap: 40, padding: 32 },
  aboutTextWide: { flex: 1.6 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  factText: { color: colors.primaryDark, fontSize: 13, fontWeight: '800' },
  aboutLogos: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 18 },
  aboutLogosWide: { flex: 1, borderTopWidth: 0, borderLeftWidth: 1, borderLeftColor: colors.border, paddingTop: 0, paddingLeft: 32 },

  band: { backgroundColor: colors.navyBg, marginTop: 48, paddingVertical: 40 },
  boardPoints: { gap: 12, marginTop: 20 },
  boardPoint: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  boardPointIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardPointTitle: { color: colors.navy, fontSize: 15, fontWeight: '900' },
  boardPointText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  recommended: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  recommendedText: { color: colors.primary, fontSize: 13, fontWeight: '900' },
  featureNumber: { color: colors.accent },
  kicker: { color: colors.primary, fontSize: 13, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  sectionTitle: { color: colors.navy, fontSize: 28, lineHeight: 34, fontWeight: '900', marginTop: 4 },
  sectionLead: { color: colors.muted, fontSize: 15, lineHeight: 22, fontWeight: '600', marginTop: 8, maxWidth: 640 },

  features: { gap: 12, marginTop: 18 },
  featuresWide: { flexDirection: 'row', flexWrap: 'wrap' },
  feature: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, gap: 8, ...shadows.card },
  featureWide: { flexBasis: '23%', flexGrow: 1, minWidth: 220 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 16 },
  featureBody: { flex: 1, gap: 4 },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: { color: colors.navy, fontSize: 17, fontWeight: '900' },
  featureText: { color: colors.muted, fontSize: 14, lineHeight: 20, fontWeight: '600' },

  boardWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 48 },
  boardText: { flex: 1, paddingTop: 8 },
  boardCard: { flex: 1.2 },
  boardCardNarrow: { marginTop: 22 },
  installWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 48 },
  installText: { flex: 1 },
  benefits: { gap: 10, marginTop: 18 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitText: { flex: 1, color: colors.navy, fontSize: 15, fontWeight: '700' },
  guideColumn: { marginTop: 18, maxWidth: 640 },
  guideWide: { flex: 1, marginTop: 0 },
  guide: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, gap: 10, ...shadows.card },
  tabs: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: radius.md, padding: 4, marginBottom: 6 },
  tab: {
    flex: 1,
    height: 40,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabActive: { backgroundColor: colors.navy },
  tabText: { color: colors.navy, fontSize: 14, fontWeight: '800' },
  tabTextActive: { color: colors.white },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { color: colors.primary, fontSize: 14, fontWeight: '900' },
  stepText: { flex: 1, color: colors.navy, fontSize: 15, lineHeight: 21, fontWeight: '700' },

  cta: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: 22, gap: 8 },
  ctaTitle: { color: colors.white, fontSize: 20, fontWeight: '900' },
  ctaText: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '600', marginBottom: 8 },

  footer: { marginTop: 48, backgroundColor: colors.navy },
  footerInner: { paddingVertical: 28, gap: 12, alignItems: 'center' },
  footerBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footerLogo: { width: 34, height: 34, borderRadius: 8, backgroundColor: colors.white },
  footerName: { color: colors.white, fontSize: 16, fontWeight: '900' },
  footerText: { color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  copyright: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '700' },
});
