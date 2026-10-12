import { useEffect, useState } from 'react';
import { Redirect, Slot, usePathname, useRouter, useSegments } from 'expo-router';
import Head from 'expo-router/head';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureRoot } from '../components/GestureRoot';
import { ActivityIndicator, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ToastHost } from '../components/ToastHost';
import { DESKTOP_MIN_WIDTH } from '../components/landing/LandingPage';
import { takeAfterLogin } from '../utils/afterLogin';
import { nunitoFonts } from '../utils/fonts';
import { colors } from '../utils/theme';
import { syncOfflineMapFiles } from '../services/offlineMapFiles';
import { printConsoleNote } from '../utils/consoleNote';

SplashScreen.preventAutoHideAsync().catch(() => {});
printConsoleNote();

const PRERENDERED_PAGES = ['/', '/podminky', '/soukromi'];
const isPrerendered = (pathname: string) => Platform.OS === 'web' && PRERENDERED_PAGES.includes(pathname);

function InitialLayout() {
  const { token, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const group = segments[0];
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

  const defaultHead = (
    <Head>
      <title>Hýbeme se společně</title>
    </Head>
  );

  if ((!fontsLoaded || !webFontsReady) && !isPrerendered(pathname)) return defaultHead;

  return (
    <GestureRoot style={styles.root}>
      {defaultHead}
      <StatusBar style="dark" />
      <AuthProvider>
        <InitialLayout />
      </AuthProvider>
      <ToastHost />
    </GestureRoot>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
});
