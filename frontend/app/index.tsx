import { Platform } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { LandingPage } from '../components/landing/LandingPage';
import { Seo } from '../components/Seo';
import { LEGAL } from '../constants/legal';

const DESCRIPTION =
  'Školní aplikace ze Benátek nad Jizerou: navštěvuj zajímavá místa na Benátecku pěšky, během nebo na kole, sbírej body a poměř síly s ostatními v žebříčku. Zdarma, přímo v telefonu.';

// Tells search engines what the site is: its name (shown above the result in Google) and the app itself.
const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      name: 'Hýbeme se společně',
      url: `${LEGAL.website}/`,
      inLanguage: 'cs',
    },
    {
      '@type': 'WebApplication',
      name: 'Hýbeme se společně',
      url: `${LEGAL.website}/`,
      description: DESCRIPTION,
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Android, iOS',
      inLanguage: 'cs',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'CZK' },
      publisher: {
        '@type': 'EducationalOrganization',
        name: LEGAL.operatorName,
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Husovo náměstí 55',
          postalCode: '294 71',
          addressLocality: 'Benátky nad Jizerou',
          addressCountry: 'CZ',
        },
      },
      sponsor: { '@type': 'Organization', name: LEGAL.partner },
    },
  ],
};

/** The web shows the landing page at the root; the native app goes straight in. */
export default function IndexScreen() {
  const { token } = useAuth();
  if (Platform.OS === 'web') {
    return (
      <>
        <Seo
          title="Hýbeme se společně – sbírej body za pohyb na Benátecku"
          description={DESCRIPTION}
          path="/"
          structuredData={STRUCTURED_DATA}
        />
        <LandingPage />
      </>
    );
  }
  return <Redirect href={token ? '/map' : '/login'} />;
}
