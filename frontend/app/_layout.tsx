import { useEffect, useState } from 'react';
import { Redirect, Slot, usePathname, useRouter, useSegments } from 'expo-router';
import Head from 'expo-router/head';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ActivityIndicator, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ToastHost } from '../components/ToastHost';
import { DESKTOP_MIN_WIDTH } from '../components/landing/LandingPage';
import { takeAfterLogin } from '../utils/afterLogin';
import { nunitoFonts } from '../utils/fonts';
import { colors } from '../utils/theme';
import { syncOfflineMapFiles } from '../services/offlineMapFiles';

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Public pages of the web are rendered into the HTML at build time, so search engines (and visitors on a slow
 * connection) get their text without running the app. They must not wait for fonts or the sign-in state:
 * the build has neither, and the first render in the browser has to match the HTML.
 */
const PRERENDERED_PAGES = ['/', '/podminky', '/soukromi'];
const isPrerendered = (pathname: string) => Platform.OS === 'web' && PRERENDERED_PAGES.includes(pathname);

function InitialLayout() {
  const { token, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const group = segments[0];
  // The app needs a phone (GPS). On a computer only the landing page at the root is shown.
  const isDesktopWeb = Platform.OS === 'web' && width >= DESKTOP_MIN_WIDTH;

  useEffect(() => {
    if (isLoading) return;
    if (!token && group === '(app)') {
      router.replace('/login');
    } else if (token && group === '(auth)') {
      router.replace((takeAfterLogin() ?? '/map') as '/map');
    }
  }, [token, isLoading, group, router]);

  if (isLoading && !isPrerendered(pathname)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // The administration works on a computer too, and its admins need to sign in there.
  const desktopAllowed =
    pathname === '/' ||
    pathname.startsWith('/admin') ||
    pathname === '/login' ||
    pathname === '/verify-email' ||
    pathname === '/soukromi' ||
    pathname === '/podminky';
  if (isDesktopWeb && !desktopAllowed) return <Redirect href="/" />;

  return <Slot />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts(nunitoFonts);
  const pathname = usePathname();

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  // The app keeps the offline map on the phone itself (the web has the service worker for it).
  useEffect(() => {
    void syncOfflineMapFiles();
  }, []);

  const [webFontsReady, setWebFontsReady] = useState(Platform.OS !== 'web');

  useEffect(() => {
    if (Platform.OS !== 'web' || !fontsLoaded) return;
    Promise.all(['400', '600', '700', '800', '900'].map((w) => document.fonts.load(`${w} 16px Nunito`)))
      .catch(() => {})
      .finally(() => setWebFontsReady(true));
  }, [fontsLoaded]);

  // Default title of every page; the public pages set their own (components/Seo).
  const defaultHead = (
    <Head>
      <title>Hýbeme se společně</title>
    </Head>
  );

  if ((!fontsLoaded || !webFontsReady) && !isPrerendered(pathname)) return defaultHead;

  return (
    <GestureHandlerRootView style={styles.root}>
      {defaultHead}
      <StatusBar style="dark" />
      <AuthProvider>
        <InitialLayout />
      </AuthProvider>
      <ToastHost />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
});
