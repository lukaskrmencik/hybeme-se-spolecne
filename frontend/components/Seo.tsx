import Head from 'expo-router/head';
import { LEGAL } from '../constants/legal';

const SITE_NAME = 'Hýbeme se společně';
/** 1200 × 630, the size Facebook, Messenger and WhatsApp show as a large preview. */
const SHARE_IMAGE = `${LEGAL.website}/og-image.png`;

interface SeoProps {
  /** Page title; the home page passes its full title, other pages get " | Hýbeme se společně" appended. */
  title: string;
  description: string;
  /** Path of the page, e.g. "/podminky"; used for the canonical address. */
  path: string;
  /** schema.org data for search engines (rich results, the site name in Google). */
  structuredData?: object;
}

/** Title, description and link previews of a public page; rendered into the HTML at build time. */
export function Seo({ title, description, path, structuredData }: SeoProps) {
  const fullTitle = path === '/' ? title : `${title} | ${SITE_NAME}`;
  const url = `${LEGAL.website}${path}`;
  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={SHARE_IMAGE} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={SITE_NAME} />
      <meta name="twitter:card" content="summary_large_image" />
      {structuredData && <script type="application/ld+json">{JSON.stringify(structuredData)}</script>}
    </Head>
  );
}
