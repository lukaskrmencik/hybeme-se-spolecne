import { Redirect } from 'expo-router';

/** Replaces Expo Router's built-in list of all routes, which has no place in production. */
export default function Sitemap() {
  return <Redirect href="/" />;
}
