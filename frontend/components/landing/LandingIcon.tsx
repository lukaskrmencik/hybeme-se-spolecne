import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform } from 'react-native';

/** The only Ionicons the landing page shows, with their code points in the Ionicons font. */
const GLYPHS = {
  'arrow-forward': 0xf133,
  'logo-google-playstore': 0xf3f6,
  'download-outline': 0xf2ba,
  'chevron-up': 0xf241,
  'chevron-down': 0xf232,
} as const;

export type LandingIconName = keyof typeof GLYPHS;

/**
 * An Ionicon on the landing page. On the web the full icon font is 380 kB, more than the whole rest of the page,
 * so these few glyphs come from public/fonts/ionicons-landing.woff2 (declared in app/+html.tsx).
 * After adding an icon here, cut the font again: see the comment at the @font-face.
 */
export function LandingIcon({ name, size, color }: { name: LandingIconName; size: number; color: string }) {
  if (Platform.OS !== 'web') return <Ionicons name={name} size={size} color={color} />;
  return (
    // A plain span: its inline font-family wins over the stylesheet that sets Nunito on every element.
    <span
      aria-hidden
      data-landing-icon=""
      style={{ fontFamily: 'ionicons-landing', fontSize: size, lineHeight: `${size}px`, color, fontWeight: 400, fontStyle: 'normal' }}
    >
      {String.fromCodePoint(GLYPHS[name])}
    </span>
  );
}
