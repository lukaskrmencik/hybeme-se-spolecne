import { Platform } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { LandingPage } from '../components/landing/LandingPage';

/** The web shows the landing page at the root; the native app goes straight in. */
export default function IndexScreen() {
  const { token } = useAuth();
  if (Platform.OS === 'web') return <LandingPage />;
  return <Redirect href={token ? '/map' : '/login'} />;
}
